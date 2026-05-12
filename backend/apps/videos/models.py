from django.db import models
from django.utils.text import slugify


class Video(models.Model):
    CATEGORY_CHOICES = (
        ("Highlights", "Highlights"),
        ("Documentary", "Documentary"),
        ("Feature", "Feature"),
        ("Interview", "Interview"),
        ("Analysis", "Analysis"),
    )
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    title = models.CharField(max_length=240)
    description = models.TextField(blank=True)
    duration = models.CharField(max_length=16, default="0:00",
                                 help_text="e.g. '8:24'")
    video_url = models.URLField(blank=True)
    thumbnail = models.ImageField(upload_to="video_thumbs/", blank=True, null=True)
    gradient = models.CharField(max_length=160, blank=True)
    category = models.CharField(max_length=40, choices=CATEGORY_CHOICES, default="Highlights")
    sport_category = models.ForeignKey(
        "categories.Category",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="videos",
    )
    tags = models.ManyToManyField("stories.Tag", blank=True, related_name="videos")
    view_count = models.PositiveIntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    published_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-is_featured", "-published_at")

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:200] or "video"
            slug, n = base, 2
            while Video.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"; n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    @property
    def views_display(self):
        n = self.view_count
        if n >= 1_000_000:
            return f"{n/1_000_000:.1f}M"
        if n >= 1000:
            return f"{n/1000:.0f}K"
        return str(n)
