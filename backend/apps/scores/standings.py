"""Standings recomputation.

Single source of truth for going from raw `Match` rows to `TeamSeasonStats`
rows. Reused by both the editor-triggered admin button and the post-save
signal that keeps the public table fresh as matches finish.
"""
from __future__ import annotations

from django.utils import timezone

from .models import Competition, Match, Season, TeamSeasonStats


def find_competition_for_match(match: Match) -> Competition | None:
    """Best-effort: match a Competition row by case-insensitive name match
    on the free-text Match.competition CharField."""
    name = (match.competition or "").strip()
    if not name:
        return None
    return Competition.objects.filter(name__iexact=name).first()


def find_season_for_kickoff(kickoff) -> Season | None:
    """Pick the season whose [start, end] window contains the kickoff datetime.
    Falls back to `is_current`, then to the most recent season we know about."""
    if kickoff:
        season = (
            Season.objects
            .filter(start_date__lte=kickoff.date(), end_date__gte=kickoff.date())
            .first()
        )
        if season:
            return season
    return (Season.objects.filter(is_current=True).first()
            or Season.objects.order_by("-start_date").first())


def recalculate(competition: Competition, season: Season) -> dict:
    """Aggregate every FT match in `competition` into per-team TeamSeasonStats
    rows for `season`. Idempotent — upserts via (team, season, competition).

    Returns a small summary dict suitable for API responses.
    """
    ft = (
        Match.objects
        .filter(status="FT", competition__iexact=competition.name)
        .select_related("home_team", "away_team")
    )

    agg: dict[int, dict] = {}

    def touch(team):
        if team.id not in agg:
            agg[team.id] = {
                "team": team, "played": 0, "wins": 0, "draws": 0, "losses": 0,
                "goals_for": 0, "goals_against": 0, "points": 0, "clean_sheets": 0,
            }
        return agg[team.id]

    for m in ft:
        home = touch(m.home_team); away = touch(m.away_team)
        hs = m.home_score or 0; aw = m.away_score or 0
        home["played"] += 1; away["played"] += 1
        home["goals_for"] += hs;  home["goals_against"] += aw
        away["goals_for"] += aw;  away["goals_against"] += hs
        if aw == 0: home["clean_sheets"] += 1
        if hs == 0: away["clean_sheets"] += 1
        if hs > aw:
            home["wins"] += 1; home["points"] += 3; away["losses"] += 1
        elif aw > hs:
            away["wins"] += 1; away["points"] += 3; home["losses"] += 1
        else:
            home["draws"] += 1; home["points"] += 1
            away["draws"] += 1; away["points"] += 1

    ranked = sorted(
        agg.values(),
        key=lambda x: (-x["points"], -(x["goals_for"] - x["goals_against"]), -x["goals_for"]),
    )

    created = updated = 0
    seen_team_ids = set()
    for pos, row in enumerate(ranked, start=1):
        seen_team_ids.add(row["team"].id)
        _, was_created = TeamSeasonStats.objects.update_or_create(
            team=row["team"], season=season, competition=competition,
            defaults={
                "played": row["played"], "wins": row["wins"],
                "draws": row["draws"], "losses": row["losses"],
                "goals_for": row["goals_for"], "goals_against": row["goals_against"],
                "clean_sheets": row["clean_sheets"], "points": row["points"],
                "position": pos, "last_synced_at": timezone.now(),
            },
        )
        if was_created: created += 1
        else: updated += 1

    return {
        "matches": ft.count(),
        "teams": len(ranked),
        "created": created,
        "updated": updated,
    }


def recalculate_for_match(match: Match) -> dict | None:
    """Convenience wrapper: figure out the competition + season for a match
    and re-run the aggregation. Returns None when we can't pin either down
    (e.g. an editor hasn't yet created a matching Competition row).
    """
    competition = find_competition_for_match(match)
    if competition is None:
        return None
    season = find_season_for_kickoff(match.kickoff)
    if season is None:
        return None
    return recalculate(competition, season)
