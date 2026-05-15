"""Analytics API — split into two halves.

`/api/analytics/track/`   — public POST, called by the frontend on every route
                            change or interaction. Cheap, non-blocking.
`/api/analytics/summary/` — admin-only GET endpoints that the dashboard reads.
                            Each rolls a window of data into chart-ready shapes
                            so the frontend never has to do heavy aggregation.
"""

from datetime import timedelta

from django.db.models import Count, F, Q, Sum
from django.db.models.functions import TruncDate, TruncHour
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from apps.bookmarks.models import Bookmark
from apps.categories.models import Category
from apps.comments.models import Comment
from apps.newsletter.models import NewsletterSubscription
from apps.scores.models import Match
from apps.stories.models import Story, TrendingTopic
from apps.transfers.models import TransferNews
from apps.videos.models import Video

from .models import EventLog, PageView


# --- Helpers --------------------------------------------------------------- #

VALID_KINDS = {k for k, _ in PageView.KIND_CHOICES}
VALID_EVENTS = {e for e, _ in EventLog.EVENT_CHOICES}


def _window_days(request, default=30, hard_cap=365):
    raw = request.query_params.get("days") if request.method == "GET" else (request.data.get("days") if hasattr(request, "data") else default)
    try:
        n = int(raw or default)
    except (TypeError, ValueError):
        n = default
    return max(1, min(n, hard_cap))


# --- Public tracking endpoint --------------------------------------------- #

@api_view(["POST"])
@permission_classes([AllowAny])
def track(request):
    """Frontend pixel: record a page view OR an event in one call.

    Body shape:
      { "type": "view",   "path": "/football/scores", "kind": "section",
        "session_key": "...", "story_id": 42, "category_slug": "football" }
      { "type": "event",  "event_type": "bookmark", "target_type": "story",
        "target_id": "42", "target_label": "Foo headline",
        "session_key": "...", "metadata": {"...": "..."} }
    """
    payload = request.data or {}
    kind_raw = payload.get("type") or "view"
    session_key = (payload.get("session_key") or "")[:64]

    if kind_raw == "view":
        path = (payload.get("path") or "/")[:240]
        kind = payload.get("kind") or PageView.KIND_OTHER
        if kind not in VALID_KINDS:
            kind = PageView.KIND_OTHER
        story = None
        sid = payload.get("story_id")
        if sid:
            story = Story.objects.filter(pk=sid).first()
        category = None
        cslug = payload.get("category_slug")
        if cslug:
            category = Category.objects.filter(slug=cslug).first()
        PageView.from_request(request, path=path, kind=kind,
                              session_key=session_key, story=story, category=category)
        return Response({"ok": True}, status=status.HTTP_201_CREATED)

    if kind_raw == "event":
        event_type = payload.get("event_type") or EventLog.EVENT_CLICK
        if event_type not in VALID_EVENTS:
            event_type = EventLog.EVENT_CLICK
        ua = (request.META.get("HTTP_USER_AGENT", "") or "")
        device = "desktop"
        u = ua.lower()
        if "bot" in u or "crawl" in u:
            device = "bot"
        elif "ipad" in u or "tablet" in u:
            device = "tablet"
        elif "mobile" in u or "iphone" in u or "android" in u:
            device = "mobile"
        EventLog.objects.create(
            event_type=event_type,
            target_type=(payload.get("target_type") or "")[:32],
            target_id=str(payload.get("target_id") or "")[:64],
            target_label=(payload.get("target_label") or "")[:240],
            user=request.user if request.user.is_authenticated else None,
            session_key=session_key,
            device_type=device,
            metadata=payload.get("metadata") or {},
        )
        return Response({"ok": True}, status=status.HTTP_201_CREATED)

    return Response({"detail": "unknown type"}, status=status.HTTP_400_BAD_REQUEST)


# --- Admin dashboard endpoints -------------------------------------------- #

@api_view(["GET"])
@permission_classes([IsAdminUser])
def summary(request):
    """Big-number summary tiles — total views, uniques, engagement, sessions."""
    days = _window_days(request)
    now = timezone.now()
    since = now - timedelta(days=days)
    prev_since = since - timedelta(days=days)

    pv = PageView.objects.filter(created_at__gte=since)
    pv_prev = PageView.objects.filter(created_at__gte=prev_since, created_at__lt=since)
    ev = EventLog.objects.filter(created_at__gte=since)

    def _delta_pct(curr, prev):
        if not prev:
            return None
        return round(((curr - prev) / prev) * 100, 1)

    views_now = pv.count()
    views_prev = pv_prev.count()
    uniques_now = pv.values("session_key").exclude(session_key="").distinct().count()
    uniques_prev = pv_prev.values("session_key").exclude(session_key="").distinct().count()

    # Average session length, approximated from page durations we've collected
    # via the page_leave event. Anything still zero is ignored so the average
    # isn't dragged down by in-flight sessions.
    avg_duration = (
        pv.filter(duration_ms__gt=0).aggregate(avg=Sum("duration_ms") * 1.0 / Count("id", filter=Q(duration_ms__gt=0)))["avg"]
        or 0
    )

    # Counts from the rest of the platform — these don't require analytics
    # tracking to be flowing, so the dashboard still shows useful data even
    # before the tracker has had time to fill PageView.
    return Response({
        "window_days": days,
        "views": {
            "value": views_now,
            "previous": views_prev,
            "delta_pct": _delta_pct(views_now, views_prev),
        },
        "unique_visitors": {
            "value": uniques_now,
            "previous": uniques_prev,
            "delta_pct": _delta_pct(uniques_now, uniques_prev),
        },
        "events": ev.count(),
        "avg_duration_ms": int(avg_duration or 0),
        "totals": {
            "stories":     Story.objects.filter(status="published").count(),
            "drafts":      Story.objects.filter(status="draft").count(),
            "videos":      Video.objects.count(),
            "transfers":   TransferNews.objects.filter(status="published").count(),
            "categories":  Category.objects.count(),
            "matches":     Match.objects.count(),
            "matches_live":Match.objects.filter(status__in=["LIVE", "HT"]).count(),
            "bookmarks":   Bookmark.objects.count(),
            "comments":    Comment.objects.count(),
            "trending":    TrendingTopic.objects.filter(is_active=True).count(),
            "subscribers": NewsletterSubscription.objects.filter(is_subscribed=True).count(),
        },
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def traffic(request):
    """Time-series chart data — page views and unique sessions per day."""
    days = _window_days(request)
    since = timezone.now() - timedelta(days=days)
    qs = PageView.objects.filter(created_at__gte=since)
    rows = (
        qs.annotate(day=TruncDate("created_at"))
          .values("day")
          .annotate(views=Count("id"),
                    uniques=Count("session_key", distinct=True, filter=~Q(session_key="")))
          .order_by("day")
    )
    return Response({
        "window_days": days,
        "series": [
            {
                "date": r["day"].isoformat(),
                "views": r["views"],
                "uniques": r["uniques"],
            }
            for r in rows
        ],
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def hourly(request):
    """Hour-by-hour traffic for the last 24h — heatmap-friendly."""
    since = timezone.now() - timedelta(hours=24)
    rows = (
        PageView.objects.filter(created_at__gte=since)
        .annotate(hour=TruncHour("created_at"))
        .values("hour")
        .annotate(views=Count("id"))
        .order_by("hour")
    )
    return Response({
        "series": [{"hour": r["hour"].isoformat(), "views": r["views"]} for r in rows],
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def content(request):
    """Top stories / categories / videos / transfers by activity."""
    days = _window_days(request)
    since = timezone.now() - timedelta(days=days)

    # Top stories by view-count (analytics-derived) + intrinsic Story.view_count
    pv_story = (
        PageView.objects.filter(created_at__gte=since, story__isnull=False)
        .values("story_id")
        .annotate(views=Count("id"))
        .order_by("-views")[:10]
    )
    story_lookup = {s.id: s for s in Story.objects.filter(id__in=[r["story_id"] for r in pv_story])}
    top_stories = []
    for r in pv_story:
        s = story_lookup.get(r["story_id"])
        if not s:
            continue
        top_stories.append({
            "id": s.id,
            "slug": s.slug,
            "headline": s.headline,
            "category": s.category.name if s.category_id else "",
            "views": r["views"],
            "total_views": s.view_count,
            "comment_count": s.comment_count,
        })

    # Fallback when no PageView rows exist yet — surface highest view_count stories.
    if not top_stories:
        top_stories = [
            {
                "id": s.id,
                "slug": s.slug,
                "headline": s.headline,
                "category": s.category.name if s.category_id else "",
                "views": s.view_count,
                "total_views": s.view_count,
                "comment_count": s.comment_count,
            }
            for s in Story.objects.filter(status="published").order_by("-view_count")[:10]
        ]

    # Categories — analytics views + total published article count
    cat_rows = (
        PageView.objects.filter(created_at__gte=since, category__isnull=False)
        .values("category_id", "category__name", "category__slug", "category__icon", "category__color")
        .annotate(views=Count("id"))
        .order_by("-views")
    )
    if not cat_rows:
        cat_rows = list(
            Category.objects.annotate(views=Count("stories", filter=Q(stories__status="published")))
            .values("id", "name", "slug", "icon", "color", "views")
            .order_by("-views")
        )
        categories_payload = [
            {"id": r["id"], "name": r["name"], "slug": r["slug"], "icon": r["icon"], "color": r["color"], "views": r["views"]}
            for r in cat_rows
        ]
    else:
        categories_payload = [
            {
                "id": r["category_id"],
                "name": r["category__name"],
                "slug": r["category__slug"],
                "icon": r["category__icon"],
                "color": r["category__color"],
                "views": r["views"],
            }
            for r in cat_rows
        ]

    top_videos = [
        {
            "id": v.id, "slug": v.slug, "title": v.title,
            "category": v.category, "view_count": v.view_count,
            "thumbnail": v.thumbnail.url if v.thumbnail else "",
        }
        for v in Video.objects.order_by("-view_count")[:10]
    ]

    top_transfers = [
        {
            "id": t.id, "slug": t.slug, "player_name": t.player_name,
            "to_club": t.to_club, "from_club": t.from_club,
            "transfer_status": t.transfer_status, "view_count": t.view_count,
            "is_breaking": t.is_breaking,
        }
        for t in TransferNews.objects.filter(status="published").order_by("-view_count")[:10]
    ]

    return Response({
        "window_days": days,
        "top_stories": top_stories,
        "categories": categories_payload,
        "top_videos": top_videos,
        "top_transfers": top_transfers,
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def devices(request):
    """Device + referrer breakdown for pie / bar charts."""
    days = _window_days(request)
    since = timezone.now() - timedelta(days=days)
    qs = PageView.objects.filter(created_at__gte=since)

    device_rows = (
        qs.values("device_type")
        .annotate(views=Count("id"))
        .order_by("-views")
    )
    devices_payload = [
        {"device": r["device_type"] or "unknown", "views": r["views"]}
        for r in device_rows
    ]

    # Referrer host extraction — full URL is too noisy for a chart, so we
    # slice down to the host name in Python rather than a complex SQL regex.
    from urllib.parse import urlparse
    ref_counts = {}
    for r in qs.exclude(referrer="").values_list("referrer", flat=True)[:5000]:
        try:
            host = urlparse(r).netloc.lower().lstrip("www.")
        except Exception:
            host = ""
        if not host:
            host = "direct / app"
        ref_counts[host] = ref_counts.get(host, 0) + 1
    refs = sorted(ref_counts.items(), key=lambda x: -x[1])[:10]
    referrers_payload = [{"source": host, "views": count} for host, count in refs]

    return Response({
        "window_days": days,
        "devices": devices_payload,
        "referrers": referrers_payload,
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def realtime(request):
    """Last 50 events for the live activity feed."""
    cutoff = timezone.now() - timedelta(minutes=30)
    events = []
    for ev in EventLog.objects.filter(created_at__gte=cutoff).order_by("-created_at")[:50]:
        events.append({
            "event_type": ev.event_type,
            "target_type": ev.target_type,
            "target_label": ev.target_label,
            "session_key": ev.session_key[:8] if ev.session_key else "",
            "user": ev.user.get_username() if ev.user_id else None,
            "device_type": ev.device_type,
            "created_at": ev.created_at.isoformat(),
        })
    # Active sessions in the last 5 minutes.
    active = (
        PageView.objects.filter(created_at__gte=timezone.now() - timedelta(minutes=5))
        .exclude(session_key="")
        .values("session_key")
        .distinct()
        .count()
    )
    return Response({
        "active_sessions": active,
        "events": events,
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def engagement(request):
    """Engagement events grouped by type — feeds the events-by-kind bar chart."""
    days = _window_days(request)
    since = timezone.now() - timedelta(days=days)
    rows = (
        EventLog.objects.filter(created_at__gte=since)
        .values("event_type")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    by_type = [{"type": r["event_type"], "count": r["count"]} for r in rows]

    # Daily engagement series — sum of all events per day.
    daily = (
        EventLog.objects.filter(created_at__gte=since)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )
    return Response({
        "window_days": days,
        "by_type": by_type,
        "daily": [{"date": r["day"].isoformat(), "count": r["count"]} for r in daily],
        "total": EventLog.objects.filter(created_at__gte=since).count(),
    })
