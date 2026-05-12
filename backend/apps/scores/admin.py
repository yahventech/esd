from django.contrib import admin

from .models import (Competition, Match, MatchEvent, Player, PlayerSeasonStats,
                     Season, Team, TeamSeasonStats)


class MatchEventInline(admin.TabularInline):
    model = MatchEvent
    extra = 1


class TeamSeasonStatsInline(admin.TabularInline):
    model = TeamSeasonStats
    extra = 0
    autocomplete_fields = ("season", "competition")


class PlayerSeasonStatsInline(admin.TabularInline):
    model = PlayerSeasonStats
    extra = 0
    autocomplete_fields = ("season", "competition")


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "country", "stadium", "manager", "founded")
    list_filter = ("category", "country")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug", "country", "stadium")
    autocomplete_fields = ("category",)
    inlines = [TeamSeasonStatsInline]


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ("name", "team", "position", "jersey_number", "nationality")
    list_filter = ("position", "team", "nationality", "is_active")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "team__name", "nationality")
    autocomplete_fields = ("team",)
    inlines = [PlayerSeasonStatsInline]


@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "start_date", "end_date", "is_current")
    list_editable = ("is_current",)
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Competition)
class CompetitionAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "country", "scope", "is_active", "order")
    list_filter = ("category", "scope", "country", "is_active")
    list_editable = ("scope", "is_active", "order")
    search_fields = ("name", "country")
    autocomplete_fields = ("category",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(TeamSeasonStats)
class TeamSeasonStatsAdmin(admin.ModelAdmin):
    list_display = ("team", "season", "competition", "played", "wins", "draws", "losses",
                    "goals_for", "goals_against", "points", "position")
    list_filter = ("season", "competition")
    search_fields = ("team__name",)
    autocomplete_fields = ("team", "season", "competition")


@admin.register(PlayerSeasonStats)
class PlayerSeasonStatsAdmin(admin.ModelAdmin):
    list_display = ("player", "season", "competition", "appearances", "goals", "assists",
                    "yellow_cards", "red_cards")
    list_filter = ("season", "competition")
    search_fields = ("player__name",)
    autocomplete_fields = ("player", "season", "competition")


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ("competition", "home_team", "home_score", "away_score",
                    "away_team", "status", "minute", "kickoff", "order", "is_featured")
    list_filter = ("status", "competition", "is_featured")
    list_editable = ("status", "home_score", "away_score", "minute", "order", "is_featured")
    search_fields = ("competition", "home_team__name", "away_team__name")
    autocomplete_fields = ("home_team", "away_team")
    inlines = [MatchEventInline]


@admin.register(MatchEvent)
class MatchEventAdmin(admin.ModelAdmin):
    list_display = ("match", "event_type", "minute", "player", "team")
    list_filter = ("event_type",)
    search_fields = ("player", "match__home_team__name", "match__away_team__name")
