from types import SimpleNamespace

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from easd_backend.permissions import IsEditorOrReadOnly

from .models import Category, CategorySection
from .serializers import CategorySerializer, CategorySectionSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = "slug"
    pagination_class = None

    def get_permissions(self):
        if self.action in ("list", "retrieve", "articles", "nav", "section_detail"):
            return [AllowAny()]
        return [IsEditorOrReadOnly()]

    @action(detail=False, methods=["get"])
    def nav(self, request):
        """Categories to display in the navbar."""
        qs = self.get_queryset().filter(is_nav=True)
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=True, methods=["get"])
    def articles(self, request, slug=None):
        from apps.stories.models import Story
        from apps.stories.serializers import StoryListSerializer
        category = self.get_object()
        limit = int(request.query_params.get("limit", 20))
        tag = request.query_params.get("tag", "").strip()
        stories = Story.objects.filter(category=category, status="published")
        if tag:
            stories = stories.filter(tags__slug=tag).distinct()
        stories = stories.order_by("-published_at")[:limit]
        return Response(StoryListSerializer(stories, many=True).data)

    @action(detail=True, methods=["get"], url_path=r"sections/(?P<section_slug>[-\w]+)")
    def section_detail(self, request, slug=None, section_slug=None):
        """Public endpoint returning a section + its filtered story feed.

        Falls back to a virtual section when the slug matches a recognised
        built-in kind (scores, fixtures, standings, news, transfers, teams,
        players, videos). That way the navbar's default links resolve even
        before an editor seeds anything in the admin dashboard.
        """
        from apps.stories.models import Story
        from apps.stories.serializers import StoryListSerializer

        category = self.get_object()
        section = category.sections.filter(slug=section_slug, is_active=True).first()

        virtual = False
        if section is None:
            kind = section_slug if section_slug in dict(CategorySection.KIND_CHOICES) else None
            if not kind:
                return Response({"detail": "Section not found."}, status=404)
            virtual = True
            default_names = {
                "news": "News Feed", "scores": "Scores", "results": "Results",
                "transfers": "Transfers", "fixtures": "Fixtures", "standings": "Standings",
                "teams": "Teams", "players": "Gossip", "videos": "Videos",
                "custom": "More",
            }
            default_intro = {
                "news": f"The latest {category.name.lower()} stories, updated in real time.",
                "scores": f"Live {category.name.lower()} scores across East Africa and beyond.",
                "results": f"Full-time {category.name.lower()} results, sorted by most recent.",
                "transfers": f"Every {category.name.lower()} signing, rumour and done-deal.",
                "fixtures": f"Upcoming {category.name.lower()} matches and kick-off times.",
                "standings": f"{category.name} league tables, computed from results.",
                "teams": f"Every {category.name.lower()} club we're tracking.",
                "players": f"{category.name} chatter, rumours and dressing-room whispers.",
                "videos": f"{category.name} highlights, reactions and analysis.",
                "custom": f"More from {category.name}.",
            }

            # SimpleNamespace avoids a class-body scoping pitfall: inside a
            # plain class block, attribute initialisers cannot read the enclosing
            # function's local `kind`. SimpleNamespace just takes kwargs.
            section = SimpleNamespace(
                id=0,
                slug=section_slug,
                name=default_names.get(kind, kind.title()),
                kind=kind,
                scope=CategorySection.SCOPE_GENERAL,
                icon="",
                intro=default_intro.get(kind, ""),
                body="",
                tag_filter=kind if kind == "transfers" else "",
            )

        limit = int(request.query_params.get("limit", 20))
        stories = Story.objects.filter(category=category, status="published")
        if section.tag_filter:
            stories = stories.filter(tags__slug=section.tag_filter).distinct()
        stories = stories.order_by("-published_at")[:limit]

        payload = {
            "category": {
                "slug": category.slug,
                "name": category.name,
                "icon": category.icon,
                "color": category.color,
                "subtitle": category.subtitle,
                "cover_url": request.build_absolute_uri(category.cover_image.url) if category.cover_image else "",
            },
            "section": {
                "id": section.id,
                "slug": section.slug,
                "name": section.name,
                "kind": section.kind,
                "scope": getattr(section, "scope", CategorySection.SCOPE_GENERAL),
                "icon": section.icon,
                "intro": section.intro,
                "body": section.body,
                "tag_filter": section.tag_filter,
                "virtual": virtual,
            },
            "stories": StoryListSerializer(stories, many=True).data,
        }
        return Response(payload)


class CategorySectionViewSet(viewsets.ModelViewSet):
    """Editor-managed CRUD over category sub-pages."""

    queryset = CategorySection.objects.select_related("category").all()
    serializer_class = CategorySectionSerializer
    permission_classes = [IsEditorOrReadOnly]
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category__slug=category)
        return qs
