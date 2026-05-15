from rest_framework import serializers

from .models import (Competition, Match, MatchEvent, Player, PlayerSeasonStats,
                     Season, Team, TeamSeasonStats)


def _absolute_image(obj_field, context):
    """Return an absolute URL for an ImageField, empty string if blank."""
    if not obj_field:
        return ""
    request = context.get("request") if context else None
    url = obj_field.url
    return request.build_absolute_uri(url) if request else url


class SeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Season
        fields = ("id", "slug", "name", "start_date", "end_date", "is_current")
        read_only_fields = ("slug",)


class CompetitionSerializer(serializers.ModelSerializer):
    category_slug = serializers.CharField(source="category.slug", read_only=True, default="")
    category_name = serializers.CharField(source="category.name", read_only=True, default="")
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Competition
        fields = ("id", "slug", "name", "country", "scope", "category", "category_slug",
                  "category_name", "logo", "logo_url", "order", "is_active",
                  "external_source", "external_id")
        read_only_fields = ("slug", "category_slug", "category_name", "logo_url")

    def get_logo_url(self, obj):
        return _absolute_image(obj.logo, self.context)


class TeamSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    category_slug = serializers.CharField(source="category.slug", read_only=True, default="")
    category_name = serializers.CharField(source="category.name", read_only=True, default="")
    # The competitions a team has season stats in, surfaced on the team list
    # so the frontend can group teams by league without a second round trip.
    competitions = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = ("id", "slug", "name", "short_name", "flag", "logo", "logo_url",
                  "category", "category_slug", "category_name",
                  "country", "founded", "stadium", "manager", "description",
                  "primary_color", "website", "competitions")
        read_only_fields = ("slug", "logo_url", "category_slug", "category_name", "competitions")
        extra_kwargs = {"logo": {"required": False, "allow_null": True}}

    def get_logo_url(self, obj):
        return _absolute_image(obj.logo, self.context)

    def get_competitions(self, obj):
        # Distinct competitions this team has appeared in, ordered by the most
        # recent season first so the "primary" competition (current league)
        # naturally sorts to index 0. Used by the frontend to bucket teams in
        # the sport-hub Teams grid.
        seen = set()
        out = []
        rows = (obj.season_stats
                  .select_related("competition", "season")
                  .order_by("-season__start_date", "competition__name"))
        for row in rows:
            comp = row.competition
            if not comp:
                continue
            if comp.id in seen:
                continue
            seen.add(comp.id)
            out.append({
                "id": comp.id,
                "slug": comp.slug,
                "name": comp.name,
                "scope": comp.scope,
            })
        return out


class PlayerSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()
    team_slug = serializers.CharField(source="team.slug", read_only=True, default="")
    team_name = serializers.CharField(source="team.name", read_only=True, default="")
    position_label = serializers.SerializerMethodField()

    class Meta:
        model = Player
        fields = ("id", "slug", "name", "team", "team_slug", "team_name",
                  "position", "position_label", "jersey_number", "nationality",
                  "date_of_birth", "height_cm", "photo", "photo_url", "is_active")
        read_only_fields = ("slug", "photo_url", "team_slug", "team_name", "position_label")
        extra_kwargs = {"photo": {"required": False, "allow_null": True}}

    def get_photo_url(self, obj):
        return _absolute_image(obj.photo, self.context)

    def get_position_label(self, obj):
        return dict(Player.POSITION_CHOICES).get(obj.position, obj.position)


class TeamSeasonStatsSerializer(serializers.ModelSerializer):
    season_name = serializers.CharField(source="season.name", read_only=True)
    season_slug = serializers.CharField(source="season.slug", read_only=True)
    competition_name = serializers.CharField(source="competition.name", read_only=True, default="")
    competition_slug = serializers.CharField(source="competition.slug", read_only=True, default="")
    team_name = serializers.CharField(source="team.name", read_only=True)
    team_slug = serializers.CharField(source="team.slug", read_only=True)
    goal_difference = serializers.IntegerField(read_only=True)

    class Meta:
        model = TeamSeasonStats
        fields = (
            "id", "team", "team_name", "team_slug",
            "season", "season_name", "season_slug",
            "competition", "competition_name", "competition_slug",
            "played", "wins", "draws", "losses",
            "goals_for", "goals_against", "goal_difference",
            "clean_sheets", "points", "position", "last_synced_at",
        )
        read_only_fields = (
            "team_name", "team_slug", "season_name", "season_slug",
            "competition_name", "competition_slug", "goal_difference",
        )


class PlayerSeasonStatsSerializer(serializers.ModelSerializer):
    player_name = serializers.CharField(source="player.name", read_only=True)
    player_slug = serializers.CharField(source="player.slug", read_only=True)
    player_position = serializers.CharField(source="player.position", read_only=True)
    player_photo = serializers.SerializerMethodField()
    team_name = serializers.CharField(source="player.team.name", read_only=True, default="")
    team_slug = serializers.CharField(source="player.team.slug", read_only=True, default="")
    team_logo = serializers.SerializerMethodField()
    season_name = serializers.CharField(source="season.name", read_only=True)
    season_slug = serializers.CharField(source="season.slug", read_only=True)
    competition_name = serializers.CharField(source="competition.name", read_only=True, default="")
    competition_slug = serializers.CharField(source="competition.slug", read_only=True, default="")

    class Meta:
        model = PlayerSeasonStats
        fields = (
            "id", "player", "player_name", "player_slug", "player_position", "player_photo",
            "team_name", "team_slug", "team_logo",
            "season", "season_name", "season_slug",
            "competition", "competition_name", "competition_slug",
            "appearances", "starts", "minutes", "goals", "assists",
            "yellow_cards", "red_cards", "clean_sheets", "last_synced_at",
        )
        read_only_fields = tuple(
            f for f in (
                "player_name", "player_slug", "player_position", "player_photo",
                "team_name", "team_slug", "team_logo",
                "season_name", "season_slug",
                "competition_name", "competition_slug",
            )
        )

    def get_player_photo(self, obj):
        return _absolute_image(obj.player.photo, self.context) if obj.player else ""

    def get_team_logo(self, obj):
        team = getattr(obj.player, "team", None) if obj.player else None
        return _absolute_image(team.logo, self.context) if team and team.logo else ""


class MatchEventSerializer(serializers.ModelSerializer):
    icon = serializers.CharField(read_only=True)
    text = serializers.SerializerMethodField()

    class Meta:
        model = MatchEvent
        fields = ("id", "event_type", "minute", "player", "team", "detail", "icon", "text")

    def get_text(self, obj):
        return f"{obj.icon} {obj.player} {obj.minute}'"


class MatchTeamSideSerializer(serializers.Serializer):
    name = serializers.CharField()
    flag = serializers.CharField()
    score = serializers.IntegerField(allow_null=True)


class MatchSerializer(serializers.ModelSerializer):
    home = serializers.SerializerMethodField()
    away = serializers.SerializerMethodField()
    events = serializers.SerializerMethodField()
    kickoff = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = ("id", "competition", "home", "away", "status", "minute",
                  "kickoff", "venue", "events", "is_featured", "is_visible", "order",
                  "external_source", "external_id", "last_synced_at",
                  "created_at", "updated_at")

    def _side(self, team, score):
        request = self.context.get("request")
        logo = ""
        if team.logo:
            logo = request.build_absolute_uri(team.logo.url) if request else team.logo.url
        return {"name": team.name, "flag": team.flag, "logo": logo, "score": score}

    def get_home(self, obj):
        return self._side(obj.home_team, obj.home_score)

    def get_away(self, obj):
        return self._side(obj.away_team, obj.away_score)

    def get_events(self, obj):
        return [f"{ev.icon} {ev.player} {ev.minute}'" for ev in obj.events.all()]

    def get_kickoff(self, obj):
        if obj.kickoff_display:
            return obj.kickoff_display
        if obj.kickoff:
            return obj.kickoff.strftime("%H:%M EAT")
        return ""


class MatchWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = (
            "id", "competition", "home_team", "away_team", "home_score", "away_score",
            "status", "minute", "kickoff", "kickoff_display", "venue",
            "order", "is_featured", "is_visible", "external_source", "external_id",
        )
        read_only_fields = ("external_source", "external_id")


class MatchEventWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchEvent
        fields = ("id", "match", "event_type", "minute", "player", "team", "detail")
