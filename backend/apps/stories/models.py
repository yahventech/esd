from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class Tag(models.Model):
    """Freeform, hashtag-style tag shared between stories and videos."""
    slug = models.SlugField(max_length=80, unique=True, blank=True)
    name = models.CharField(max_length=60, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("name",)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:70] or "tag"
            slug, n = base, 2
            while Tag.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"#{self.name}"

    @property
    def usage_count(self):
        return self.stories.count() + self.videos.count()


class Story(models.Model):
    STATUS_CHOICES = (
        ("draft", "Draft"),
        ("published", "Published"),
        ("archived", "Archived"),
    )
    PLACEMENT_CHOICES = (
        ("none", "None"),
        ("hero", "Hero"),
        ("featured", "Featured"),
        ("top", "Top Stories"),
        ("editors_pick", "Editor's Pick"),
    )
    EP_TYPE_CHOICES = (
        ("", "—"),
        ("longform", "Longform"),
        ("analysis", "Analysis"),
        ("opinion", "Opinion"),
    )
    FORMAT_CHOICES = (
        ("news", "News"),
        ("analysis", "Analysis"),
        ("opinion", "Opinion"),
        ("interview", "Interview"),
        ("feature", "Feature"),
        ("match_preview", "Match Preview"),
        ("match_report", "Match Report"),
        ("live_blog", "Live Blog"),
        ("quick_hit", "Quick Hit"),
        ("gossip", "Gossip"),
    )

    slug = models.SlugField(max_length=220, unique=True, blank=True)
    headline = models.CharField(max_length=240)
    summary = models.TextField(blank=True)
    body = models.TextField(blank=True)
    cover_image = models.ImageField(upload_to="story_covers/", blank=True, null=True)
    gradient = models.CharField(max_length=160, blank=True,
                                 help_text="Tailwind gradient, e.g. 'from-amber-900/80 via-orange-900/60 to-navy'")

    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.SET_NULL,
        null=True,
        related_name="stories",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="stories",
    )

    placement = models.CharField(max_length=16, choices=PLACEMENT_CHOICES, default="none")
    placement_rank = models.PositiveIntegerField(default=0,
        help_text="Lower = higher on page. Used to order featured/top/ep stories.")
    editors_pick_type = models.CharField(max_length=16, choices=EP_TYPE_CHOICES, blank=True, default="")

    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="published")
    story_format = models.CharField(max_length=20, choices=FORMAT_CHOICES, default="news",
                                    help_text="Editorial format/genre — drives the badge style on cards")
    tags = models.ManyToManyField(Tag, blank=True, related_name="stories")
    is_live = models.BooleanField(default=False)
    is_breaking = models.BooleanField(default=False)

    read_minutes = models.PositiveIntegerField(default=3)

    view_count = models.PositiveIntegerField(default=0)
    comment_count = models.PositiveIntegerField(default=0)

    published_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-published_at",)
        indexes = [
            models.Index(fields=["placement", "placement_rank"]),
            models.Index(fields=["status", "-published_at"]),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.headline)[:200] or "story"
            slug = base
            counter = 2
            while Story.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.headline


class BreakingNews(models.Model):
    # Default TTL for new alerts. Frontend stops showing items past this window
    # without needing a janitor process — query-time filter does the work.
    DEFAULT_TTL_MINUTES = 60

    text = models.CharField(max_length=240)
    link_url = models.URLField(blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True,
        help_text="When this alert auto-disappears from the ticker. "
                  "Leave blank to never expire. Defaults to 60 minutes after creation.")
    # Nullable: cross-cutting alerts (e.g. AFCON-wide news) often don't belong
    # to a single sport. When set, the alert is scoped to that sport's pages.
    category = models.ForeignKey(
        "categories.Category", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="breaking_items",
        help_text="Sport this alert belongs to. Leave blank for cross-sport alerts.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("order", "-created_at")
        verbose_name_plural = "Breaking news items"

    def save(self, *args, **kwargs):
        if self.pk is None and self.expires_at is None:
            self.expires_at = timezone.now() + timezone.timedelta(minutes=self.DEFAULT_TTL_MINUTES)
        super().save(*args, **kwargs)

    @property
    def is_live(self):
        """True when the alert is active and within its TTL window."""
        if not self.is_active:
            return False
        if self.expires_at is None:
            return True
        return self.expires_at > timezone.now()

    def __str__(self):
        return self.text[:80]


class TrendingTopic(models.Model):
    tag = models.CharField(max_length=48, unique=True)
    post_count = models.PositiveIntegerField(default=0)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    # Nullable: a trending hashtag may be cross-sport (e.g. #AFCON2026).
    category = models.ForeignKey(
        "categories.Category", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="trending_topics",
        help_text="Sport this trend belongs to. Leave blank for cross-sport trends.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("order", "-post_count")

    def __str__(self):
        return self.tag

    @property
    def count_display(self):
        n = self.post_count
        if n >= 1000:
            return f"{n/1000:.1f}K"
        return str(n)
