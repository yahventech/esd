"""Background thread that polls API-Football every N seconds.

Only runs under real server processes (daphne / manage.py runserver). Skipped
during migrations, shell, tests, and the runserver parent (pre-reload) process.
Each sync triggers the Match post_save signal, which broadcasts to the
`scores` channel group — so websocket clients see the new minute/score without
any extra wiring.
"""
from __future__ import annotations

import logging
import os
import sys
import threading
import time

log = logging.getLogger(__name__)

_started = False
_lock = threading.Lock()


def _should_start() -> bool:
    from django.conf import settings

    if not getattr(settings, "LIVE_SYNC_AUTO", False):
        return False
    if not getattr(settings, "API_FOOTBALL_KEY", ""):
        return False

    argv0 = (sys.argv[0] if sys.argv else "") or ""
    is_daphne = "daphne" in argv0.lower()
    is_uvicorn = "uvicorn" in argv0.lower()
    is_runserver = "runserver" in sys.argv

    if not (is_daphne or is_uvicorn or is_runserver):
        return False

    # runserver spawns a reloader parent; only the child (RUN_MAIN=true) should sync.
    if is_runserver and os.environ.get("RUN_MAIN") != "true":
        return False

    return True


def _loop(interval: int):
    from .live_sync import LiveSyncError, sync_live

    log.info("Live-sync loop started (interval=%ss)", interval)
    while True:
        try:
            result = sync_live()
            log.info(
                "Live sync: fetched=%s created=%s updated=%s teams=%s",
                result.fetched, result.created, result.updated, result.teams_created,
            )
        except LiveSyncError as e:
            log.warning("Live sync error: %s", e)
        except Exception:
            log.exception("Unexpected live sync failure")
        time.sleep(interval)


def start_if_configured():
    global _started
    with _lock:
        if _started:
            return
        if not _should_start():
            return
        from django.conf import settings
        interval = max(30, int(getattr(settings, "LIVE_SYNC_INTERVAL_SECONDS", 60)))
        t = threading.Thread(
            target=_loop, args=(interval,), daemon=True, name="easd-live-sync",
        )
        t.start()
        _started = True
