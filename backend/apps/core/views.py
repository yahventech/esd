from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.http import JsonResponse
from django.core.management import call_command
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from apps.categories.models import Category
from apps.categories.serializers import CategorySerializer
from apps.scores.models import Match
from apps.scores.serializers import MatchSerializer
from apps.stories.models import BreakingNews, Story, TrendingTopic
from apps.stories.serializers import (StoryListSerializer,
                                      TrendingTopicSerializer)
from apps.videos.models import Video
from apps.videos.serializers import VideoSerializer

User = get_user_model()


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok", "service": "easd-api", "version": "1.0"})


@api_view(["GET"])
@permission_classes([AllowAny])
def homepage_feed(request):
    """Single round-trip that gives the frontend every section it needs.

    Placement-curated lists (featured/top/editorsPicks) are padded with the
    most recent unplaced published stories so the landing page never looks
    empty when editors haven't tagged enough placements.
    """
    ctx = {"request": request}
    published = Story.objects.filter(status="published")

    hero = (published.filter(placement="hero").order_by("placement_rank", "-published_at").first()
            or published.order_by("-published_at").first())
    used_ids = {hero.id} if hero else set()

    def _pad(qs, target):
        """Take placement-tagged rows, then top up with latest published not-yet-used."""
        picks = list(qs[:target])
        used_ids.update(p.id for p in picks)
        if len(picks) < target:
            filler = published.exclude(id__in=used_ids).order_by("-published_at")[:target - len(picks)]
            for f in filler:
                picks.append(f)
                used_ids.add(f.id)
        return picks

    featured = _pad(published.filter(placement="featured").order_by("placement_rank", "-published_at"), 3)
    top = _pad(published.filter(placement="top").order_by("placement_rank", "-published_at"), 5)
    editors = _pad(published.filter(placement="editors_pick").order_by("placement_rank", "-published_at"), 4)

    breaking = list(BreakingNews.objects.filter(is_active=True).order_by("order").values_list("text", flat=True))
    trending = TrendingTopic.objects.filter(is_active=True).order_by("order")[:10]
    categories = Category.objects.all().order_by("order", "name")
    matches = (Match.objects.filter(is_visible=True)
               .select_related("home_team", "away_team")
               .prefetch_related("events").order_by("order", "kickoff")[:12])
    videos = Video.objects.all().order_by("-is_featured", "-published_at")[:6]

    return Response({
        "hero": StoryListSerializer(hero, context=ctx).data if hero else None,
        "featured": StoryListSerializer(featured, many=True, context=ctx).data,
        "top": StoryListSerializer(top, many=True, context=ctx).data,
        "editorsPicks": StoryListSerializer(editors, many=True, context=ctx).data,
        "breakingNews": breaking,
        "trending": TrendingTopicSerializer(trending, many=True).data,
        "categories": CategorySerializer(categories, many=True, context=ctx).data,
        "matches": MatchSerializer(matches, many=True, context=ctx).data,
        "videos": VideoSerializer(videos, many=True, context=ctx).data,
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_stats(request):
    return Response({
        "users": User.objects.count(),
        "stories_published": Story.objects.filter(status="published").count(),
        "stories_draft": Story.objects.filter(status="draft").count(),
        "matches_live": Match.objects.filter(status__in=["LIVE", "HT"]).count(),
        "videos": Video.objects.count(),
        "total_comments": Story.objects.aggregate(total=Sum("comment_count"))["total"] or 0,
        "total_views": Story.objects.aggregate(total=Sum("view_count"))["total"] or 0,
        "newsletter_subscribers": __import__(
            "apps.newsletter.models", fromlist=["NewsletterSubscription"]
        ).NewsletterSubscription.objects.filter(is_subscribed=True).count(),
        "categories_top": list(
            Category.objects.annotate(sc=Count("stories"))
            .order_by("-sc").values("name", "sc")[:5]
        ),
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
def scrape_news(request):
    """Trigger news scraping via API endpoint."""
    try:
        limit = request.data.get("limit", 5)
        source = request.data.get("source", "all")

        # Run the scraping command
        call_command("scrape_kenya_sports", limit=limit, source=source)

        return Response({
            "status": "success",
            "message": f"News scraping completed for source: {source}",
        })
    except Exception as e:
        return Response({
            "status": "error",
            "message": str(e),
        }, status=500)
