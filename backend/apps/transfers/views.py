from django.db.models import F
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from easd_backend.permissions import IsEditorOrReadOnly, is_editor_user

from .models import TransferNews
from .serializers import TransferNewsSerializer


class TransferNewsViewSet(viewsets.ModelViewSet):
    """Browse + CRUD endpoints for transfer news.

    Public reads are filtered to `status="published"`. Staff with editor role
    (or above) can list, create, edit, and delete drafts via the same routes
    — `IsEditorOrReadOnly` enforces that distinction without needing a
    separate management surface.
    """

    queryset = TransferNews.objects.select_related("category", "author")
    serializer_class = TransferNewsSerializer
    lookup_field = "slug"
    permission_classes = [IsEditorOrReadOnly]
    filterset_fields = {
        "status": ["exact"],
        "category__slug": ["exact"],
        "transfer_status": ["exact"],
        "is_featured": ["exact"],
        "is_breaking": ["exact"],
    }
    search_fields = ("player_name", "from_club", "to_club", "summary", "body")
    ordering_fields = ("published_at", "view_count", "is_featured")
    ordering = ("-is_featured", "-published_at")

    def get_queryset(self):
        qs = super().get_queryset()
        # Anonymous + non-staff readers only see published rows. Editors and
        # admins reuse this endpoint from the admin dashboard, so they see
        # drafts as well.
        if is_editor_user(self.request.user):
            return qs
        return qs.filter(status="published")

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Bump the read counter on detail view, mirroring Story behaviour.
        TransferNews.objects.filter(pk=instance.pk).update(view_count=F("view_count") + 1)
        instance.refresh_from_db(fields=["view_count"])
        return Response(self.get_serializer(instance).data)

    @action(detail=False, methods=["get"], url_path="featured", permission_classes=[AllowAny])
    def featured(self, request):
        """Pinned items first, then most recent — for the homepage strip."""
        qs = TransferNews.objects.filter(status="published").order_by("-is_featured", "-published_at")[:8]
        return Response(TransferNewsSerializer(qs, many=True, context={"request": request}).data)
