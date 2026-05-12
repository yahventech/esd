"""Backfill expires_at on legacy BreakingNews rows.

Before the TTL feature shipped, rows had no `expires_at` and the ticker would
show them forever. This command applies the documented 60-minute default to
rows whose `expires_at` is null, anchored at each row's `created_at`. Most
legacy rows are weeks old, so they read as already-expired and the ticker
goes quiet immediately.

    ./venv/bin/python manage.py backfill_breaking_ttl        # apply
    ./venv/bin/python manage.py backfill_breaking_ttl --dry  # preview
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.stories.models import BreakingNews


class Command(BaseCommand):
    help = "Set expires_at = created_at + 60 min on BreakingNews rows missing a TTL."

    def add_arguments(self, parser):
        parser.add_argument("--dry", action="store_true",
                            help="Print what would change without writing.")

    def handle(self, *args, dry=False, **opts):
        ttl = timezone.timedelta(minutes=BreakingNews.DEFAULT_TTL_MINUTES)
        targets = list(BreakingNews.objects.filter(expires_at__isnull=True))
        if dry:
            self.stdout.write(self.style.WARNING(
                f"[dry] would backfill {len(targets)} BreakingNews rows."
            ))
            return
        for b in targets:
            b.expires_at = b.created_at + ttl
            b.save(update_fields=["expires_at"])
        self.stdout.write(self.style.SUCCESS(
            f"Backfilled expires_at on {len(targets)} rows."
        ))
