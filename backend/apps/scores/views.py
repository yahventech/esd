from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from easd_backend.permissions import IsEditorOrReadOnly, is_editor_user

from .live_sync import LiveSyncError
from .live_sync import sync_live as _run_live_sync
from .models import (Competition, Match, MatchEvent, Player, PlayerSeasonStats,
                     Season, Team, TeamSeasonStats)
from .serializers import (CompetitionSerializer, MatchEventSerializer,
                          MatchEventWriteSerializer, MatchSerializer,
                          MatchWriteSerializer, PlayerSeasonStatsSerializer,
                          PlayerSerializer, SeasonSerializer, TeamSeasonStatsSerializer,
                          TeamSerializer)


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.select_related("category").all()
    serializer_class = TeamSerializer
    lookup_field = "slug"
    pagination_class = None
    permission_classes = [IsEditorOrReadOnly]
    filterset_fields = ("category__slug", "country")
    search_fields = ("name", "country", "manager", "stadium")
    ordering_fields = ("name", "founded")

    def get_queryset(self):
        qs = super().get_queryset()
        cat = self.request.query_params.get("category")
        if cat:
            qs = qs.filter(category__slug=cat)
        return qs

    @action(detail=True, methods=["get"])
    def squad(self, request, slug=None):
        team = self.get_object()
        players = team.players.filter(is_active=True).order_by("position", "jersey_number", "name")
        return Response(PlayerSerializer(players, many=True, context={"request": request}).data)

    @action(detail=True, methods=["get"])
    def stats(self, request, slug=None):
        """Per-season + all-time team stats. Optional `season` / `competition` slug filters."""
        team = self.get_object()
        season_slug = request.query_params.get("season")
        comp_slug = request.query_params.get("competition")
        qs = team.season_stats.select_related("season", "competition")
        if season_slug:
            qs = qs.filter(season__slug=season_slug)
        if comp_slug:
            qs = qs.filter(competition__slug=comp_slug)
        return Response({
            "team": TeamSerializer(team, context={"request": request}).data,
            "season_stats": TeamSeasonStatsSerializer(qs, many=True).data,
            "all_time": team.all_time_stats,
        })


class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Player.objects.select_related("team", "team__category").all()
    serializer_class = PlayerSerializer
    lookup_field = "slug"
    pagination_class = None
    permission_classes = [IsEditorOrReadOnly]
    filterset_fields = ("team__slug", "position", "is_active")
    search_fields = ("name", "nationality")
    ordering_fields = ("name", "jersey_number")

    @action(detail=True, methods=["get"])
    def stats(self, request, slug=None):
        player = self.get_object()
        season_slug = request.query_params.get("season")
        qs = player.season_stats.select_related("season", "competition")
        if season_slug:
            qs = qs.filter(season__slug=season_slug)
        return Response({
            "player": PlayerSerializer(player, context={"request": request}).data,
            "season_stats": PlayerSeasonStatsSerializer(qs, many=True, context={"request": request}).data,
            "all_time": player.all_time_stats,
        })


class SeasonViewSet(viewsets.ModelViewSet):
    queryset = Season.objects.all()
    serializer_class = SeasonSerializer
    lookup_field = "slug"
    pagination_class = None
    permission_classes = [IsEditorOrReadOnly]


class CompetitionViewSet(viewsets.ModelViewSet):
    queryset = Competition.objects.select_related("category").all()
    serializer_class = CompetitionSerializer
    lookup_field = "slug"
    pagination_class = None
    permission_classes = [IsEditorOrReadOnly]
    filterset_fields = ("category__slug", "scope", "is_active")
    search_fields = ("name", "country")


class TeamSeasonStatsViewSet(viewsets.ModelViewSet):
    queryset = TeamSeasonStats.objects.select_related("team", "season", "competition")
    serializer_class = TeamSeasonStatsSerializer
    pagination_class = None
    permission_classes = [IsEditorOrReadOnly]
    filterset_fields = ("season__slug", "competition__slug", "team__slug",
                        "team__category__slug", "season", "competition", "team")
    ordering = ("position", "-points")

    @action(detail=False, methods=["post"], url_path="recalculate")
    def recalculate(self, request):
        """Manual recompute fallback. Standings normally auto-update via the
        Match post_save signal (see apps/scores/standings.py)."""
        if not is_editor_user(request.user):
            return Response({"detail": "Editors only"}, status=403)
        comp_id = request.data.get("competition")
        season_id = request.data.get("season")
        if not comp_id or not season_id:
            return Response({"detail": "competition and season are required"}, status=400)
        try:
            competition = Competition.objects.get(pk=comp_id)
            season = Season.objects.get(pk=season_id)
        except (Competition.DoesNotExist, Season.DoesNotExist):
            return Response({"detail": "Unknown competition or season"}, status=404)
        from .standings import recalculate as run_recalc
        return Response(run_recalc(competition, season))


class PlayerSeasonStatsViewSet(viewsets.ModelViewSet):
    queryset = PlayerSeasonStats.objects.select_related(
        "player", "player__team", "season", "competition"
    )
    serializer_class = PlayerSeasonStatsSerializer
    pagination_class = None
    permission_classes = [IsEditorOrReadOnly]
    filterset_fields = (
        "season__slug", "competition__slug", "player__slug",
        "player__team__slug", "player__team__category__slug", "player__position",
    )
    ordering_fields = ("goals", "assists", "appearances", "minutes",
                        "yellow_cards", "red_cards", "clean_sheets")
    ordering = ("-goals", "-assists")

    @action(detail=False, methods=["get"])
    def leaders(self, request):
        """Premier-League-stats-style leaderboards.

        Query params:
          metric=goals|assists|appearances|minutes|yellow_cards|red_cards|clean_sheets
          category=<sport slug>
          season=<season slug>             (defaults to current)
          competition=<competition slug>
          limit=<n>                        (default 25)
        """
        metric = request.query_params.get("metric", "goals")
        allowed = {"goals", "assists", "appearances", "minutes",
                   "yellow_cards", "red_cards", "clean_sheets"}
        if metric not in allowed:
            return Response({"detail": f"metric must be one of {sorted(allowed)}"}, status=400)

        qs = self.get_queryset()
        cat = request.query_params.get("category")
        if cat:
            qs = qs.filter(player__team__category__slug=cat)
        comp = request.query_params.get("competition")
        if comp:
            qs = qs.filter(competition__slug=comp)
        season = request.query_params.get("season")
        if season:
            qs = qs.filter(season__slug=season)
        else:
            current = Season.objects.filter(is_current=True).first()
            if current:
                qs = qs.filter(season=current)

        try:
            limit = max(1, min(int(request.query_params.get("limit", 25)), 200))
        except (TypeError, ValueError):
            limit = 25

        qs = qs.filter(**{f"{metric}__gt": 0}).order_by(f"-{metric}", "-appearances")[:limit]
        return Response({
            "metric": metric,
            "results": PlayerSeasonStatsSerializer(qs, many=True, context={"request": request}).data,
        })


class MatchViewSet(viewsets.ModelViewSet):
    queryset = Match.objects.select_related("home_team", "away_team").prefetch_related("events")
    filterset_fields = ("status", "competition", "is_featured", "is_visible")
    ordering_fields = ("order", "kickoff", "updated_at")
    ordering = ("order", "kickoff")
    pagination_class = None

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return MatchWriteSerializer
        return MatchSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "live", "events"):
            return [AllowAny()]
        return [IsEditorOrReadOnly()]

    def get_queryset(self):
        qs = super().get_queryset()
        if not is_editor_user(self.request.user):
            qs = qs.filter(is_visible=True)
        return qs

    @action(detail=False, methods=["get"])
    def live(self, request):
        qs = self.get_queryset().filter(status__in=["LIVE", "HT"]).order_by("order")
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["post"], url_path="sync-live")
    def sync_live(self, request):
        """Editors-only: pull current in-play fixtures from API-Football."""
        if not is_editor_user(request.user):
            return Response({"detail": "Editors only"}, status=403)
        try:
            result = _run_live_sync()
        except LiveSyncError as e:
            return Response({"detail": str(e)}, status=502)
        return Response({
            "fetched": result.fetched,
            "created": result.created,
            "updated": result.updated,
            "teams_created": result.teams_created,
        })

    @action(detail=True, methods=["get", "post"])
    def events(self, request, pk=None):
        match = self.get_object()
        if request.method == "POST":
            if not is_editor_user(request.user):
                return Response({"detail": "Editors only"}, status=403)
            data = {**request.data, "match": match.pk}
            ser = MatchEventWriteSerializer(data=data)
            ser.is_valid(raise_exception=True)
            ser.save()
            match.save(update_fields=["updated_at"])
            return Response(ser.data, status=201)
        qs = match.events.all()
        return Response(MatchEventSerializer(qs, many=True).data)


class MatchEventViewSet(viewsets.ModelViewSet):
    queryset = MatchEvent.objects.select_related("match", "team")
    serializer_class = MatchEventWriteSerializer
    permission_classes = [IsEditorOrReadOnly]
