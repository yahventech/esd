from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class TransferNews(models.Model):
    """A single transfer-window item: a rumour, agreement, signing, or loan.

    Stored independently from the regular Story so editors can fill out the
    structured "from / to / fee / status" fields the front end uses to render
    the transfer card without having to coerce a normal news article into the
    same shape. Each row is scoped to a sport Category so the same admin
    surface can drive Football, Basketball, Rugby, etc.
    """

    STATUS_CHOICES = (
        ("draft", "Draft"),
        ("published", "Published"),
        ("archived", "Archived"),
    )

    # Transfer-life-cycle states — chosen to mirror the language fans use when
    # following a window. `here_we_go` is the celebrated "deal certain" beat.
    TRANSFER_STATUS_CHOICES = (
        ("rumor",      "Rumour"),
        ("talks",      "In talks"),
        ("agreed",     "Agreement reached"),
        ("medical",    "Medical scheduled"),
        ("here_we_go", "Here we go"),
        ("completed",  "Completed"),
        ("loan",       "Loan move"),
        ("rejected",   "Rejected / failed"),
    )

    # 1 = wild speculation, 5 = officially confirmed by club. The frontend
    # renders this as a 5-pip reliability meter so readers can gauge weight.
    RELIABILITY_CHOICES = tuple((i, f"{i} / 5") for i in range(1, 6))

    slug = models.SlugField(max_length=220, unique=True, blank=True)
    player_name = models.CharField(max_length=160)
    player_photo = models.ImageField(upload_to="transfer_player_photos/",
                                     null=True, blank=True)

    from_club = models.CharField(max_length=160, blank=True, default="",
        help_text="Selling / parent club. Leave blank for free agents.")
    from_club_logo = models.ImageField(upload_to="transfer_club_logos/",
                                       null=True, blank=True)
    to_club = models.CharField(max_length=160, blank=True, default="",
        help_text="Destination club. Leave blank if not yet known (e.g. rumour stage).")
    to_club_logo = models.ImageField(upload_to="transfer_club_logos/",
                                     null=True, blank=True)

    transfer_status = models.CharField(max_length=16, choices=TRANSFER_STATUS_CHOICES,
                                       default="rumor")
    fee = models.CharField(max_length=64, blank=True, default="",
        help_text="Display string — e.g. '€85M', 'Free transfer', 'Undisclosed'.")
    contract_length = models.CharField(max_length=64, blank=True, default="",
        help_text="e.g. '5 years', 'Until 2028'.")
    reliability = models.PositiveSmallIntegerField(choices=RELIABILITY_CHOICES, default=3,
        help_text="How solid is this report? 1 = speculation, 5 = officially confirmed.")

    category = models.ForeignKey(
        "categories.Category", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="transfer_news",
        help_text="Sport this transfer belongs to.",
    )

    summary = models.CharField(max_length=400, blank=True, default="",
        help_text="One-sentence blurb shown on cards.")
    body = models.TextField(blank=True, default="",
        help_text="Full write-up (markdown / plain text).")

    source = models.CharField(max_length=120, blank=True, default="",
        help_text="Original reporter / outlet — e.g. 'Fabrizio Romano', 'BBC Sport'.")
    source_url = models.URLField(blank=True, default="")

    is_featured = models.BooleanField(default=False,
        help_text="Pin to the top of the transfer-news strip.")
    is_breaking = models.BooleanField(default=False,
        help_text="Glow + animated 'BREAKING' chip on the card. Reserve for the big moments.")

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="transfer_news",
    )

    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default="published")
    view_count = models.PositiveIntegerField(default=0)

    published_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-is_featured", "-published_at")
        verbose_name_plural = "Transfer news"
        indexes = [
            models.Index(fields=["status", "-published_at"]),
            models.Index(fields=["category", "-published_at"]),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            # Slug includes the destination club when present so multiple
            # reports about the same player don't collide on a single token.
            base_parts = [self.player_name]
            if self.to_club:
                base_parts.append(self.to_club)
            base = slugify(" ".join(base_parts))[:200] or "transfer"
            slug, n = base, 2
            while TransferNews.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        if self.to_club:
            return f"{self.player_name} → {self.to_club}"
        return self.player_name
