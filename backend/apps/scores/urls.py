from rest_framework.routers import DefaultRouter

from .views import (CompetitionViewSet, MatchEventViewSet, MatchViewSet,
                    PlayerSeasonStatsViewSet, PlayerViewSet, SeasonViewSet,
                    TeamSeasonStatsViewSet, TeamViewSet)

router = DefaultRouter()
router.register("teams", TeamViewSet, basename="team")
router.register("players", PlayerViewSet, basename="player")
router.register("seasons", SeasonViewSet, basename="season")
router.register("competitions", CompetitionViewSet, basename="competition")
router.register("team-stats", TeamSeasonStatsViewSet, basename="team-stats")
router.register("player-stats", PlayerSeasonStatsViewSet, basename="player-stats")
router.register("events", MatchEventViewSet, basename="match-event")
router.register("", MatchViewSet, basename="match")
urlpatterns = router.urls
