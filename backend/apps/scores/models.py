from django.db import models
from django.db.models import Sum
from django.utils.text import slugify


class Season(models.Model):
    """A single season window (e.g. 2024/25). Shared across sports/competitions."""

    slug = models.SlugField(max_length=24, unique=True, blank=True)
    name = models.CharField(max_length=24, help_text="Display name, e.g. '2024/25'")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=False,
        help_text="Marks the season currently being played. Used as default when stat queries omit a season.")

    class Meta:
        ordering = ("-start_date", "-name")

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)[:24] or "season"
        # Enforce a single is_current row.
        if self.is_current:
            Season.objects.exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Competition(models.Model):
    """A league/cup tied to a sport (e.g. Premier League under Football)."""

    slug = models.SlugField(max_length=80, unique=True, blank=True)
    name = models.CharField(max_length=120)
    category = models.ForeignKey(
        "categories.Category", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="competitions",
    )
    country = models.CharField(max_length=80, blank=True, default="")
    SCOPE_LOCAL = "local"
    SCOPE_INTERNATIONAL = "international"
    SCOPE_CHOICES = (
        (SCOPE_LOCAL, "Local (East Africa)"),
        (SCOPE_INTERNATIONAL, "International"),
    )
    scope = models.CharField(max_length=16, choices=SCOPE_CHOICES, default=SCOPE_INTERNATIONAL)
    logo = models.ImageField(upload_to="competition_logos/", null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    external_source = models.CharField(max_length=40, blank=True, default="")
    external_id = models.CharField(max_length=64, blank=True, default="",
        help_text="Provider league id (e.g. api-football). Used by stats sync jobs.")

    class Meta:
        ordering = ("order", "name")

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:75] or "competition"
            slug, n = base, 2
            while Competition.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Team(models.Model):
    slug = models.SlugField(max_length=80, unique=True, blank=True)
    name = models.CharField(max_length=80, unique=True)
    flag = models.CharField(max_length=16, blank=True, default="",
                             help_text="Emoji flag or short text badge (optional if logo uploaded)")
    logo = models.ImageField(upload_to="team_logos/", null=True, blank=True,
                              help_text="Crest / badge image. Overrides flag when present.")
    short_name = models.CharField(max_length=32, blank=True)
    # Profile metadata — populated by editors or stat sync jobs.
    category = models.ForeignKey(
        "categories.Category", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="teams",
        help_text="Sport this team plays. Drives where the team shows up in the navbar Teams listing.",
    )
    # Primary / current league. Drives the Teams grid grouping on the sport
    # hub: editors pick once when adding a team, and that team appears under
    # the chosen league header. Optional — teams without a primary league
    # (e.g. national sides, free agents) fall into an 'Unaffiliated' bucket.
    primary_competition = models.ForeignKey(
        "Competition", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="primary_teams",
        help_text="Current / main league this team plays in.",
    )
    country = models.CharField(max_length=80, blank=True, default="")
    founded = models.PositiveIntegerField(null=True, blank=True)
    stadium = models.CharField(max_length=160, blank=True, default="")
    manager = models.CharField(max_length=120, blank=True, default="")
    description = models.TextField(blank=True, default="")
    primary_color = models.CharField(max_length=9, blank=True, default="",
        help_text="Hex color used for the team-page accent (e.g. '#EF0107' for Arsenal red).")
    website = models.URLField(blank=True, default="")
    external_source = models.CharField(max_length=40, blank=True, default="")
    external_id = models.CharField(max_length=64, blank=True, default="")

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:70] or "team"
            slug = base
            counter = 2
            while Team.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    @property
    def all_time_stats(self):
        """Aggregate season totals across every Competition/Season the team has played."""
        agg = self.season_stats.aggregate(
            played=Sum("played"), wins=Sum("wins"), draws=Sum("draws"),
            losses=Sum("losses"), goals_for=Sum("goals_for"),
            goals_against=Sum("goals_against"), clean_sheets=Sum("clean_sheets"),
            points=Sum("points"),
        )
        for k, v in agg.items():
            agg[k] = v or 0
        agg["goal_difference"] = agg["goals_for"] - agg["goals_against"]
        return agg


class Player(models.Model):
    POSITION_CHOICES = (
        ("GK", "Goalkeeper"),
        ("DEF", "Defender"),
        ("MID", "Midfielder"),
        ("FWD", "Forward"),
        ("COACH", "Coach / Manager"),
        ("OTHER", "Other"),
    )

    slug = models.SlugField(max_length=120, unique=True, blank=True)
    name = models.CharField(max_length=120)
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name="players")
    position = models.CharField(max_length=8, choices=POSITION_CHOICES, default="OTHER")
    jersey_number = models.PositiveIntegerField(null=True, blank=True)
    nationality = models.CharField(max_length=80, blank=True, default="")
    date_of_birth = models.DateField(null=True, blank=True)
    height_cm = models.PositiveIntegerField(null=True, blank=True)
    photo = models.ImageField(upload_to="player_photos/", null=True, blank=True)
    is_active = models.BooleanField(default=True)
    external_source = models.CharField(max_length=40, blank=True, default="")
    external_id = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        ordering = ("position", "jersey_number", "name")
        indexes = [models.Index(fields=["team", "position"])]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:115] or "player"
            slug, n = base, 2
            while Player.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    @property
    def all_time_stats(self):
        agg = self.season_stats.aggregate(
            appearances=Sum("appearances"), starts=Sum("starts"),
            minutes=Sum("minutes"), goals=Sum("goals"), assists=Sum("assists"),
            yellow_cards=Sum("yellow_cards"), red_cards=Sum("red_cards"),
            clean_sheets=Sum("clean_sheets"),
        )
        for k, v in agg.items():
            agg[k] = v or 0
        return agg


class TeamSeasonStats(models.Model):
    """Per-season league record for a team in a given competition."""

    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="season_stats")
    season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name="team_stats")
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE, null=True, blank=True,
                                     related_name="team_stats")

    played = models.PositiveIntegerField(default=0)
    wins = models.PositiveIntegerField(default=0)
    draws = models.PositiveIntegerField(default=0)
    losses = models.PositiveIntegerField(default=0)
    goals_for = models.PositiveIntegerField(default=0)
    goals_against = models.PositiveIntegerField(default=0)
    points = models.IntegerField(default=0)
    position = models.PositiveIntegerField(null=True, blank=True,
        help_text="Current league table position (1 = top).")
    clean_sheets = models.PositiveIntegerField(default=0)
    last_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("position", "-points")
        unique_together = ("team", "season", "competition")

    def __str__(self):
        comp = self.competition.name if self.competition_id else "All comps"
        return f"{self.team.name} {self.season.name} {comp}"

    @property
    def goal_difference(self):
        return self.goals_for - self.goals_against


class PlayerSeasonStats(models.Model):
    """Per-season totals for a player in a given competition."""

    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="season_stats")
    season = models.ForeignKey(Season, on_delete=models.CASCADE, related_name="player_stats")
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE, null=True, blank=True,
                                     related_name="player_stats")

    appearances = models.PositiveIntegerField(default=0)
    starts = models.PositiveIntegerField(default=0)
    minutes = models.PositiveIntegerField(default=0)
    goals = models.PositiveIntegerField(default=0)
    assists = models.PositiveIntegerField(default=0)
    yellow_cards = models.PositiveIntegerField(default=0)
    red_cards = models.PositiveIntegerField(default=0)
    clean_sheets = models.PositiveIntegerField(default=0,
        help_text="Goalkeeper-only stat. Ignored for outfield players.")
    last_synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-goals", "-assists")
        unique_together = ("player", "season", "competition")

    def __str__(self):
        comp = self.competition.name if self.competition_id else "All comps"
        return f"{self.player.name} {self.season.name} {comp}"


class Match(models.Model):
    STATUS_CHOICES = (
        ("UPCOMING", "Upcoming"),
        ("LIVE", "Live"),
        ("HT", "Half Time"),
        ("FT", "Full Time"),
        ("POSTPONED", "Postponed"),
        ("CANCELLED", "Cancelled"),
    )
    competition = models.CharField(max_length=120, default="Friendly")
    home_team = models.ForeignKey(Team, related_name="home_matches", on_delete=models.PROTECT)
    away_team = models.ForeignKey(Team, related_name="away_matches", on_delete=models.PROTECT)
    home_score = models.PositiveIntegerField(null=True, blank=True)
    away_score = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="UPCOMING")
    minute = models.CharField(max_length=8, blank=True, default="")
    kickoff = models.DateTimeField(null=True, blank=True)
    kickoff_display = models.CharField(max_length=32, blank=True,
                                        help_text="Optional overridden display, e.g. '15:00 EAT'")
    venue = models.CharField(max_length=160, blank=True)
    order = models.IntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    is_visible = models.BooleanField(default=True,
        help_text="Show on the public live-scores strip. Uncheck to hide auto-synced matches you don't want featured.")
    external_source = models.CharField(max_length=40, blank=True, default="",
                                        help_text="e.g. 'livescore-api' when auto-synced")
    external_id = models.CharField(max_length=64, blank=True, default="",
                                    help_text="Provider's match id — used to upsert on sync")
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("order", "kickoff")
        verbose_name_plural = "Matches"

    def __str__(self):
        return f"{self.home_team} vs {self.away_team}"


class MatchEvent(models.Model):
    EVENT_TYPES = (
        ("GOAL", "Goal"),
        ("YELLOW", "Yellow Card"),
        ("RED", "Red Card"),
        ("SUB", "Substitution"),
        ("PEN", "Penalty"),
        ("OG", "Own Goal"),
        ("INFO", "Info"),
    )
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name="events")
    event_type = models.CharField(max_length=8, choices=EVENT_TYPES, default="GOAL")
    minute = models.PositiveIntegerField(default=0)
    player = models.CharField(max_length=80)
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True)
    detail = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("minute", "created_at")

    @property
    def icon(self):
        return {
            "GOAL": "⚽",
            "YELLOW": "🟨",
            "RED": "🟥",
            "SUB": "🔄",
            "PEN": "⚽",
            "OG": "🥅",
            "INFO": "ℹ️",
        }.get(self.event_type, "•")

    def __str__(self):
        return f"{self.icon} {self.player} {self.minute}'"
