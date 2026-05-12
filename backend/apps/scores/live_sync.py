"""API-Football → EASD Match sync.

API-Football (api-sports.io) has dependable East African league coverage
(Kenyan Premier League, Tanzania Premier League, Uganda Premier League,
plus CAF competitions) alongside every major world league.

Endpoint:  GET https://v3.football.api-sports.io/fixtures?live=all
Auth:      header `x-apisports-key: <API_FOOTBALL_KEY>`
Docs:      https://www.api-football.com/documentation-v3
Free tier: 100 requests/day — enough for 30–60s polling on match days.

Set API_FOOTBALL_KEY in the environment. Optional: API_FOOTBALL_BASE.

Region filter — EASD is an East/Africa-focused product, so the sync drops
fixtures whose league.country isn't in AFRICAN_COUNTRIES (or in an EASD-
defined "World" allow-list like UEFA / CAF / FIFA tournaments). Editors can
still flip Match.is_visible by hand in the admin if a match slips through
or they want to feature a specific non-African fixture.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

import requests
from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from .models import Match, Team


class LiveSyncError(RuntimeError):
    pass


@dataclass
class SyncResult:
    fetched: int
    created: int
    updated: int
    teams_created: int


def _api_key():
    key = getattr(settings, "API_FOOTBALL_KEY", "")
    if not key:
        raise LiveSyncError(
            "API_FOOTBALL_KEY not set. Get a free key at "
            "https://dashboard.api-football.com/register and export "
            "API_FOOTBALL_KEY before syncing."
        )
    return key


def _request(path: str, params: dict | None = None):
    key = _api_key()
    base = getattr(settings, "API_FOOTBALL_BASE",
                   "https://v3.football.api-sports.io").rstrip("/")
    headers = {"x-apisports-key": key, "Accept": "application/json"}
    try:
        resp = requests.get(f"{base}{path}", params=params or {}, headers=headers, timeout=15)
    except requests.RequestException as e:
        raise LiveSyncError(f"API-Football request failed: {e}") from e
    if not resp.ok:
        raise LiveSyncError(f"API-Football returned {resp.status_code}: {resp.text[:300]}")
    try:
        data = resp.json()
    except ValueError as e:
        raise LiveSyncError(f"API-Football returned non-JSON: {resp.text[:300]}") from e
    errors = data.get("errors")
    if isinstance(errors, dict) and any(errors.values()):
        raise LiveSyncError(f"API-Football error: {errors}")
    if isinstance(errors, list) and errors:
        raise LiveSyncError(f"API-Football error: {errors}")
    return data


def _get_or_create_team(name: str, stats: dict) -> Team | None:
    name = (name or "").strip()
    if not name:
        return None
    team = Team.objects.filter(name__iexact=name).first()
    if team:
        return team
    short = re.sub(r"[^A-Za-z]", "", name)[:3].upper() or name[:3].upper()
    team = Team.objects.create(name=name, short_name=short, flag="")
    stats["teams_created"] += 1
    return team


# API-Football status short codes → our internal status.
_LIVE_STATUSES = {"1H", "2H", "ET", "BT", "P", "LIVE"}
_FT_STATUSES = {"FT", "AET", "PEN"}
_CANCELLED = {"CANC", "ABD", "AWD", "WO"}
_POSTPONED = {"PST", "SUSP", "INT"}

# Continent-level allow-list. API-Football reports `league.country` as a
# country name string (e.g. "Kenya", "Tanzania", "Egypt") and uses "World"
# for intercontinental tournaments. Names follow API-Football conventions —
# verified against /countries listings.
AFRICAN_COUNTRIES = {
    # East Africa (EASD core focus)
    "Kenya", "Tanzania", "Uganda", "Rwanda", "Burundi", "South-Sudan",
    "South Sudan", "Ethiopia", "Eritrea", "Somalia", "Djibouti",
    # Southern Africa
    "South Africa", "Zambia", "Zimbabwe", "Botswana", "Namibia", "Lesotho",
    "Eswatini", "Swaziland", "Madagascar", "Mauritius", "Mozambique",
    "Malawi", "Comoros", "Seychelles",
    # Northern Africa
    "Egypt", "Morocco", "Algeria", "Tunisia", "Libya", "Sudan",
    # Western Africa
    "Nigeria", "Ghana", "Senegal", "Ivory Coast", "Côte d'Ivoire",
    "Mali", "Burkina Faso", "Cameroon", "Benin", "Togo", "Guinea",
    "Guinea-Bissau", "Liberia", "Sierra Leone", "Gambia", "Cape Verde",
    "Mauritania", "Niger", "Chad",
    # Central Africa
    "Congo", "Congo DR", "DR Congo", "Gabon", "Equatorial Guinea",
    "Central African Republic", "Sao Tome and Principe", "Angola",
}

# Intercontinental tournaments to keep even when "country" isn't African,
# matched by competition name (case-insensitive contains).
_AFRICAN_COMPETITION_KEYWORDS = (
    "caf", "afcon", "africa cup of nations", "champions league of africa",
    "confederation cup", "chan",
)


def _is_african_fixture(item: dict) -> bool:
    league = item.get("league") or {}
    country = (league.get("country") or "").strip()
    if country in AFRICAN_COUNTRIES:
        return True
    name = (league.get("name") or "").lower()
    return any(kw in name for kw in _AFRICAN_COMPETITION_KEYWORDS)


def _map_status(short: str) -> str:
    s = (short or "").upper().strip()
    if s == "HT":
        return "HT"
    if s in _LIVE_STATUSES:
        return "LIVE"
    if s in _FT_STATUSES:
        return "FT"
    if s in _POSTPONED:
        return "POSTPONED"
    if s in _CANCELLED:
        return "CANCELLED"
    return "UPCOMING"


def _minute_text(status_short: str, elapsed) -> str:
    s = (status_short or "").upper()
    if s == "HT":
        return "HT"
    if isinstance(elapsed, int) and elapsed > 0:
        return f"{elapsed}'"
    return ""


def _upsert(item: dict, stats: dict) -> Match | None:
    fixture = item.get("fixture") or {}
    teams = item.get("teams") or {}
    goals = item.get("goals") or {}
    league = item.get("league") or {}

    ext_id = str(fixture.get("id") or "").strip()
    if not ext_id:
        return None

    home_name = (teams.get("home") or {}).get("name") or ""
    away_name = (teams.get("away") or {}).get("name") or ""
    if not home_name or not away_name:
        return None

    home_team = _get_or_create_team(home_name, stats)
    away_team = _get_or_create_team(away_name, stats)
    if home_team is None or away_team is None:
        return None

    status_info = fixture.get("status") or {}
    status_short = (status_info.get("short") or "").upper()
    status = _map_status(status_short)
    minute = _minute_text(status_short, status_info.get("elapsed"))

    home_score = goals.get("home")
    away_score = goals.get("away")
    if home_score is not None:
        home_score = int(home_score)
    if away_score is not None:
        away_score = int(away_score)

    competition = league.get("name") or "Live"
    kickoff_raw = fixture.get("date") or ""
    kickoff = parse_datetime(kickoff_raw) if kickoff_raw else None
    venue = (fixture.get("venue") or {}).get("name") or ""

    defaults = {
        "home_team": home_team,
        "away_team": away_team,
        "home_score": home_score,
        "away_score": away_score,
        "status": status,
        "minute": minute,
        "competition": competition,
        "venue": venue,
        "external_source": "api-football",
        "last_synced_at": timezone.now(),
    }
    if kickoff:
        defaults["kickoff"] = kickoff

    match, created = Match.objects.update_or_create(
        external_source="api-football",
        external_id=ext_id,
        defaults=defaults,
    )
    if created:
        stats["created"] += 1
    else:
        stats["updated"] += 1
    return match


def sync_live() -> SyncResult:
    """Pull all currently in-play fixtures, filter to African leagues, upsert.

    Non-African fixtures are dropped entirely so they never enter the DB.
    Editors can still feature any specific non-African match by creating it
    manually through the admin — and conversely can hide auto-synced African
    fixtures via Match.is_visible.
    """
    data = _request("/fixtures", {"live": "all"})
    raw_items = data.get("response") or []
    items = [it for it in raw_items if _is_african_fixture(it)]
    stats = {"created": 0, "updated": 0, "teams_created": 0}
    for item in items:
        _upsert(item, stats)
    return SyncResult(
        fetched=len(items),
        created=stats["created"],
        updated=stats["updated"],
        teams_created=stats["teams_created"],
    )
