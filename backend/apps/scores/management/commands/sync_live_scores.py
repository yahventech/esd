"""Pull currently-live fixtures from API-Football and upsert them.

Schedule every 30-60s during match days (cron, systemd timer, celery beat):

    * * * * * cd /path/to/backend && ./venv/bin/python manage.py sync_live_scores

Requires API_FOOTBALL_KEY in the environment. Get a free key at
https://dashboard.api-football.com/register (100 req/day free tier).
"""

from django.core.management.base import BaseCommand

from apps.scores.live_sync import LiveSyncError, sync_live


class Command(BaseCommand):
    help = "Sync currently-live fixtures from API-Football into the Match table."

    def handle(self, *args, **opts):
        try:
            result = sync_live()
        except LiveSyncError as e:
            self.stderr.write(self.style.ERROR(str(e)))
            return
        self.stdout.write(self.style.SUCCESS(
            f"Fetched {result.fetched}, created {result.created}, "
            f"updated {result.updated}, new teams {result.teams_created}"
        ))
