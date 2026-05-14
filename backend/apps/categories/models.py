from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    slug = models.SlugField(max_length=64, unique=True, blank=True)
    name = models.CharField(max_length=64, unique=True)
    icon = models.CharField(max_length=8, default="⚽", help_text="Emoji icon")
    color = models.CharField(max_length=9, default="#00A86B",
                              help_text="Hex color e.g. #00A86B")
    description = models.TextField(blank=True)
    subtitle = models.CharField(max_length=140, blank=True,
                                 help_text="Short tagline shown under the category name, e.g. 'EAPL to AFCON'")
    cover_image = models.ImageField(upload_to="category_covers/", null=True, blank=True,
                                     help_text="Header hero image for the category page")
    is_nav = models.BooleanField(default=False,
                                 help_text="Show in top navigation bar")
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("order", "name")
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:60] or "category"
            slug = base
            counter = 2
            while Category.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def article_count(self):
        return self.stories.filter(status="published").count()


class CategorySection(models.Model):
    """A sub-page inside a category (e.g. Football → Scores, Transfers, Fixtures).

    Sections surface in the top-nav dropdown for their parent category and each
    opens a dedicated page inside the SPA. Editors manage them from the admin
    dashboard.
    """

    KIND_NEWS = "news"
    KIND_SCORES = "scores"
    KIND_RESULTS = "results"
    KIND_TRANSFERS = "transfers"
    KIND_FIXTURES = "fixtures"
    KIND_STANDINGS = "standings"
    KIND_TEAMS = "teams"
    KIND_PLAYERS = "players"
    KIND_VIDEOS = "videos"
    KIND_CUSTOM = "custom"
    KIND_CHOICES = (
        (KIND_NEWS, "News"),
        (KIND_SCORES, "Scores"),
        (KIND_RESULTS, "Results"),
        (KIND_TRANSFERS, "Transfers"),
        (KIND_FIXTURES, "Fixtures"),
        (KIND_STANDINGS, "Standings"),
        (KIND_TEAMS, "Teams"),
        (KIND_PLAYERS, "Players"),
        (KIND_VIDEOS, "Videos"),
        (KIND_CUSTOM, "Custom page"),
    )

    # Local/International split lives on the section, not the category — a
    # single Football category has both a local KPL Scores section AND an
    # international Premier League Scores section. SCOPE_GENERAL covers things
    # equally relevant to both (news, profiles).
    SCOPE_LOCAL = "local"
    SCOPE_INTERNATIONAL = "international"
    SCOPE_GENERAL = "general"
    SCOPE_CHOICES = (
        (SCOPE_LOCAL, "Local / East Africa"),
        (SCOPE_INTERNATIONAL, "International"),
        (SCOPE_GENERAL, "General"),
    )

    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="sections")
    slug = models.SlugField(max_length=64, blank=True)
    name = models.CharField(max_length=64)
    kind = models.CharField(max_length=16, choices=KIND_CHOICES, default=KIND_NEWS)
    scope = models.CharField(max_length=16, choices=SCOPE_CHOICES, default=SCOPE_GENERAL,
                              help_text="Where this section sits in the Sports mega-menu: Local "
                                        "(EA leagues), International (global), or General (cross-cutting).")
    icon = models.CharField(max_length=8, blank=True, help_text="Optional emoji icon")
    intro = models.CharField(max_length=200, blank=True, help_text="Short tagline shown on the section page")
    body = models.TextField(blank=True, help_text="Longform content for 'custom' sections")
    tag_filter = models.CharField(max_length=64, blank=True,
                                   help_text="Optional tag slug to narrow the story feed for this section")
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("category", "order", "name")
        unique_together = ("category", "slug")

    def __str__(self):
        return f"{self.category.name} · {self.name}"

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:60] or "section"
            slug = base
            counter = 2
            while CategorySection.objects.filter(category=self.category, slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)
