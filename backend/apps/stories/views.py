from django.db.models import F, Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from easd_backend.permissions import (IsAuthorOwnerOrEditor, IsEditorOrReadOnly,
                                      is_editor_user, is_staff_user)

from .models import BreakingNews, Story, Tag, TrendingTopic
from .serializers import (BreakingNewsSerializer, StoryDetailSerializer,
                          StoryListSerializer, StoryWriteSerializer,
                          TagSerializer, TrendingTopicSerializer)


class StoryViewSet(viewsets.ModelViewSet):
    queryset = Story.objects.select_related("category", "author")
    lookup_field = "slug"
    filterset_fields = {
        "status": ["exact"],
        "placement": ["exact"],
        "is_live": ["exact"],
        "is_breaking": ["exact"],
        "story_format": ["exact"],
        "category__slug": ["exact"],
        "tags__slug": ["exact"],
    }
    search_fields = ("headline", "summary", "body", "category__name")
    ordering_fields = ("published_at", "view_count", "comment_count", "placement_rank")
    ordering = ("-published_at",)

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return StoryWriteSerializer
        if self.action in ("retrieve", "manage_detail"):
            return StoryDetailSerializer
        return StoryListSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthorOwnerOrEditor()]
        if self.action in ("manage", "mine", "manage_detail"):
            return [IsAuthenticated()]
        return [AllowAny()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Staff can see everything through the manage-related endpoints.
        if self.action in ("manage", "mine", "manage_detail"):
            if is_editor_user(user):
                return qs
            if is_staff_user(user):
                return qs.filter(author=user)
            return qs.none()
        if self.action in ("update", "partial_update", "destroy"):
            return qs
        return qs.filter(status="published")

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        Story.objects.filter(pk=instance.pk).update(view_count=F("view_count") + 1)
        instance.refresh_from_db(fields=["view_count"])
        return Response(self.get_serializer(instance).data)

    # --- Feed endpoints that match the frontend shape ---

    @action(detail=False, methods=["get"], url_path="hero")
    def hero(self, request):
        story = (
            Story.objects
            .filter(status="published", placement="hero")
            .order_by("placement_rank", "-published_at")
            .first()
        )
        if story is None:
            story = Story.objects.filter(status="published").order_by("-published_at").first()
        if story is None:
            return Response(None)
        return Response(StoryListSerializer(story).data)

    @action(detail=False, methods=["get"], url_path="featured")
    def featured(self, request):
        qs = (
            Story.objects.filter(status="published", placement="featured")
            .order_by("placement_rank", "-published_at")[:6]
        )
        return Response(StoryListSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="top")
    def top(self, request):
        limit = int(request.query_params.get("limit", 5))
        qs = (
            Story.objects.filter(status="published", placement="top")
            .order_by("placement_rank", "-published_at")[:limit]
        )
        return Response(StoryListSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="editors-picks")
    def editors_picks(self, request):
        qs = (
            Story.objects.filter(status="published", placement="editors_pick")
            .order_by("placement_rank", "-published_at")[:6]
        )
        return Response(StoryListSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="breaking")
    def breaking(self, request):
        """Active, non-expired breaking-news strings.

        Optional `?category=<slug>` narrows to a single sport, returning the
        union of items for that sport AND cross-sport items (category is null).
        """
        now = timezone.now()
        items = (
            BreakingNews.objects
            .filter(is_active=True)
            .filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now))
        )
        cat = (request.query_params.get("category") or "").strip()
        if cat:
            items = items.filter(Q(category__slug=cat) | Q(category__isnull=True))
        items = items.order_by("order")
        return Response([b.text for b in items])

    @action(detail=False, methods=["get"], url_path="trending")
    def trending(self, request):
        qs = TrendingTopic.objects.filter(is_active=True).order_by("order")[:10]
        return Response(TrendingTopicSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="search")
    def search(self, request):
        q = (request.query_params.get("q") or "").strip()
        qs = Story.objects.filter(status="published")
        if q:
            qs = qs.filter(
                Q(headline__icontains=q) | Q(summary__icontains=q) | Q(body__icontains=q) |
                Q(category__name__icontains=q)
            )
        qs = qs.order_by("-published_at")[:25]
        return Response(StoryListSerializer(qs, many=True).data)

    # --- Management endpoints (drafts + all statuses) ---

    @action(detail=False, methods=["get"], url_path="manage")
    def manage(self, request):
        """Returns all stories (drafts + published) visible to the current staff user."""
        qs = self.get_queryset().order_by("-updated_at")
        status_f = request.query_params.get("status")
        if status_f:
            qs = qs.filter(status=status_f)
        return Response(StoryListSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"], url_path="mine")
    def mine(self, request):
        qs = Story.objects.filter(author=request.user).order_by("-updated_at")
        return Response(StoryListSerializer(qs, many=True).data)


class BreakingNewsViewSet(viewsets.ModelViewSet):
    queryset = BreakingNews.objects.all()
    serializer_class = BreakingNewsSerializer
    pagination_class = None
    permission_classes = [IsEditorOrReadOnly]


class TrendingTopicViewSet(viewsets.ModelViewSet):
    queryset = TrendingTopic.objects.all()
    serializer_class = TrendingTopicSerializer
    pagination_class = None
    permission_classes = [IsEditorOrReadOnly]


class TagViewSet(viewsets.ModelViewSet):
    """Freeform tag catalog used by stories and videos."""
    queryset = Tag.objects.all().order_by("name")
    serializer_class = TagSerializer
    lookup_field = "slug"
    pagination_class = None
    permission_classes = [IsEditorOrReadOnly]
    search_fields = ("name",)

    def get_queryset(self):
        qs = super().get_queryset()
        q = (self.request.query_params.get("q") or "").strip().lstrip("#")
        if q:
            qs = qs.filter(name__icontains=q)
        return qs
