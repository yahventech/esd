"""Hide auto-synced matches whose competition isn't African.

Reusable cleanup pass for the public live-scores strip. Matches manually
created in the admin (external_source='') are never touched, and matches an
editor has already curated (is_visible already False) stay that way.

    ./venv/bin/python manage.py hide_non_african_matches          # do it
    ./venv/bin/python manage.py hide_non_african_matches --dry    # preview
"""

from django.core.management.base import BaseCommand

from apps.scores.live_sync import _AFRICAN_COMPETITION_KEYWORDS
from apps.scores.models import Match


def _is_african_competition(name: str) -> bool:
    n = (name or "").lower()
    return any(kw in n for kw in _AFRICAN_COMPETITION_KEYWORDS)


class Command(BaseCommand):
    help = "Hide auto-synced non-African matches from the public live-scores strip."

    def add_arguments(self, parser):
        parser.add_argument("--dry", action="store_true",
                            help="Print what would change without writing.")

    def handle(self, *args, dry=False, **opts):
        qs = Match.objects.filter(external_source="api-football", is_visible=True)
        to_hide = [m.id for m in qs if not _is_african_competition(m.competition)]

        if dry:
            self.stdout.write(self.style.WARNING(
                f"[dry] would hide {len(to_hide)} of {qs.count()} visible auto-synced matches"
            ))
            return

        updated = Match.objects.filter(id__in=to_hide).update(is_visible=False)
        self.stdout.write(self.style.SUCCESS(
            f"Hidden {updated} auto-synced non-African matches "
            f"(manually-created matches untouched)."
        ))
