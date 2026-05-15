"""Analytics models — a deliberately lean log of page views and discrete user
events, designed so the admin dashboard can roll them up into traffic, content,
and engagement charts without a separate analytics warehouse.

Trade-offs intentionally chosen:
 - We hash the visitor IP (sha256) rather than storing it raw, so we still get
   uniqueness for "unique visitor" counts without holding PII.
 - User-agent is stored, but we also pre-classify a coarse `device_type`
   (mobile/tablet/desktop/bot) at write time so dashboards don't have to parse
   UA strings at read time.
 - PageView and EventLog share a session_key string. Anonymous sessions are
   identified by a cookie / localStorage-issued uuid that the frontend sends
   with every track request.
"""

import hashlib

from django.conf import settings
from django.db import models


def _hash_ip(ip):
    if not ip:
        return ""
    return hashlib.sha256(ip.encode("utf-8")).hexdigest()[:32]


def _classify_device(user_agent):
    """Cheap UA bucket — good enough for dashboard pie charts.

    We don't want a `user-agents` dep for one chart, so this hand-rolled
    classifier covers the obvious cases. Anything we can't recognise lands
    in 'desktop' which matches how most real-world traffic skews.
    """
    if not user_agent:
        return "unknown"
    ua = user_agent.lower()
    if any(k in ua for k in ("bot", "crawl", "spider", "slurp")):
        return "bot"
    if "ipad" in ua or "tablet" in ua or "kindle" in ua:
        return "tablet"
    if any(k in ua for k in ("mobile", "iphone", "android", "phone")):
        return "mobile"
    return "desktop"


class PageView(models.Model):
    """One row per route / story render observed on the frontend."""

    KIND_HOME = "home"
    KIND_STORY = "story"
    KIND_CATEGORY = "category"
    KIND_SECTION = "section"
    KIND_TAG = "tag"
    KIND_TRANSFERS = "transfers"
    KIND_GOSSIP = "gossip"
    KIND_OPINION = "opinion"
    KIND_OTHER = "other"
    KIND_CHOICES = (
        (KIND_HOME, "Home"),
        (KIND_STORY, "Story"),
        (KIND_CATEGORY, "Category"),
        (KIND_SECTION, "Section"),
        (KIND_TAG, "Tag"),
        (KIND_TRANSFERS, "Transfers"),
        (KIND_GOSSIP, "Gossip"),
        (KIND_OPINION, "Opinion"),
        (KIND_OTHER, "Other"),
    )

    path = models.CharField(max_length=240, db_index=True)
    kind = models.CharField(max_length=16, choices=KIND_CHOICES, default=KIND_OTHER, db_index=True)
    referrer = models.CharField(max_length=400, blank=True, default="")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="page_views",
    )
    session_key = models.CharField(max_length=64, db_index=True, blank=True, default="")
    ip_hash = models.CharField(max_length=64, blank=True, default="")
    country = models.CharField(max_length=64, blank=True, default="")
    user_agent = models.CharField(max_length=320, blank=True, default="")
    device_type = models.CharField(max_length=16, blank=True, default="unknown", db_index=True)

    # Optional links — set when the path identifies a specific resource so the
    # dashboard can build "top stories", "top categories" charts cheaply.
    story = models.ForeignKey(
        "stories.Story", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="page_views",
    )
    category = models.ForeignKey(
        "categories.Category", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="page_views",
    )

    duration_ms = models.PositiveIntegerField(default=0,
        help_text="Time the visitor spent on this page before navigating away. Updated by a 'page_leave' event.")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["created_at", "kind"]),
            models.Index(fields=["session_key", "created_at"]),
        ]

    @classmethod
    def from_request(cls, request, *, path, kind=KIND_OTHER, session_key="",
                     story=None, category=None):
        ua = request.META.get("HTTP_USER_AGENT", "")[:320]
        ip = (request.META.get("HTTP_X_FORWARDED_FOR", "") or request.META.get("REMOTE_ADDR", "")).split(",")[0].strip()
        return cls.objects.create(
            path=path[:240],
            kind=kind,
            referrer=(request.META.get("HTTP_REFERER", "") or "")[:400],
            user=request.user if getattr(request, "user", None) and request.user.is_authenticated else None,
            session_key=session_key[:64],
            ip_hash=_hash_ip(ip),
            user_agent=ua,
            device_type=_classify_device(ua),
            story=story,
            category=category,
        )

    def __str__(self):
        return f"{self.kind}:{self.path} @ {self.created_at:%Y-%m-%d %H:%M}"


class EventLog(models.Model):
    """Discrete user actions outside of plain page views.

    `target_type` + `target_id` is a soft polymorphic pointer — we don't use
    Django's GenericForeignKey because the dashboard treats targets purely as
    strings ("story:42", "video:7") and doesn't need to resolve them inline.
    """

    EVENT_VIEW = "view"
    EVENT_CLICK = "click"
    EVENT_SEARCH = "search"
    EVENT_BOOKMARK = "bookmark"
    EVENT_UNBOOKMARK = "unbookmark"
    EVENT_SHARE = "share"
    EVENT_LIKE = "like"
    EVENT_UNLIKE = "unlike"
    EVENT_COMMENT = "comment"
    EVENT_REACTION = "reaction"
    EVENT_VIDEO_PLAY = "video_play"
    EVENT_TRANSFER_OPEN = "transfer_open"
    EVENT_SESSION_START = "session_start"
    EVENT_PAGE_LEAVE = "page_leave"
    EVENT_CHOICES = (
        (EVENT_VIEW, "View"),
        (EVENT_CLICK, "Click"),
        (EVENT_SEARCH, "Search"),
        (EVENT_BOOKMARK, "Bookmark"),
        (EVENT_UNBOOKMARK, "Unbookmark"),
        (EVENT_SHARE, "Share"),
        (EVENT_LIKE, "Like"),
        (EVENT_UNLIKE, "Unlike"),
        (EVENT_COMMENT, "Comment"),
        (EVENT_REACTION, "Reaction"),
        (EVENT_VIDEO_PLAY, "Video play"),
        (EVENT_TRANSFER_OPEN, "Transfer card open"),
        (EVENT_SESSION_START, "Session start"),
        (EVENT_PAGE_LEAVE, "Page leave"),
    )

    event_type = models.CharField(max_length=24, choices=EVENT_CHOICES, db_index=True)
    target_type = models.CharField(max_length=32, blank=True, default="", db_index=True,
        help_text="Soft reference — 'story', 'video', 'transfer', 'tag', 'category', etc.")
    target_id = models.CharField(max_length=64, blank=True, default="")
    target_label = models.CharField(max_length=240, blank=True, default="",
        help_text="Human-readable label captured at event time so dashboards don't need extra lookups.")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="analytics_events",
    )
    session_key = models.CharField(max_length=64, db_index=True, blank=True, default="")
    device_type = models.CharField(max_length=16, blank=True, default="unknown")
    metadata = models.JSONField(default=dict, blank=True,
        help_text="Free-form extra data — search query, share platform, etc.")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["event_type", "created_at"]),
            models.Index(fields=["target_type", "target_id"]),
        ]

    def __str__(self):
        target = f"{self.target_type}:{self.target_id}" if self.target_type else "—"
        return f"{self.event_type} {target} @ {self.created_at:%Y-%m-%d %H:%M}"
