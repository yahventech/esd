"""Seed the sport categories EASD ships with by default.

Idempotent: existing categories are updated (icon / color / is_nav / order)
without trampling editor-added fields like cover_image or subtitle if those
have been customised. New categories are created from scratch.

    ./venv/bin/python manage.py seed_sports
    ./venv/bin/python manage.py seed_sports --dry
"""

from django.core.management.base import BaseCommand

from apps.categories.models import Category, CategorySection


SPORTS = [
    # (slug, name, icon, color, subtitle, order)
    ("football",   "Football",   "⚽", "#10B981", "From the KPL to the Champions League",    10),
    ("basketball", "Basketball", "🏀", "#F97316", "NBA, FIBA Africa and the local scene",   20),
    ("rugby",      "Rugby",      "🏉", "#7C3AED", "Kenya Sevens to the global circuit",     30),
    ("athletics",  "Athletics",  "🏃", "#EAB308", "East Africa's distance-running dynasty", 40),
    ("cricket",    "Cricket",    "🏏", "#06B6D4", "T20s, ODIs and the rising EA squads",    50),
    ("boxing",     "Boxing",     "🥊", "#EF4444", "Pound-for-pound, ringside",              60),
    ("volleyball", "Volleyball", "🏐", "#0EA5E9", "Beach and indoor, men and women",        70),
    ("netball",    "Netball",    "🥅", "#F472B6", "Africa's fastest-growing women's sport", 80),
    ("tennis",     "Tennis",     "🎾", "#84CC16", "ATP, WTA and the African circuit",       90),
]


# Default sections every new sport gets. The list is deliberately narrow:
# Scores / Fixtures / Standings / Teams / Gossip / Videos were dropped per
# editorial direction — those topics live on dedicated cross-sport surfaces
# instead of being duplicated under every sport. News stays because it powers
# the sport-scoped story feed visitors click into from the Sports menu, and
# Transfers stays because it's genuinely sport-specific.
DEFAULT_SECTIONS = [
    ("news",      "News Feed", "news",      "general",       "📰", "Latest headlines",   10),
    ("transfers", "Transfers", "transfers", "international", "🔁", "Signings & rumours", 50),
]


class Command(BaseCommand):
    help = "Seed the sport categories and default sub-sections."

    def add_arguments(self, parser):
        parser.add_argument("--dry", action="store_true",
                            help="Print what would change without writing.")
        parser.add_argument("--sections", action="store_true",
                            help="Also create default sub-sections (Scores, Fixtures, …) for each sport.")

    def handle(self, *args, dry=False, sections=False, **opts):
        created = updated = section_created = 0
        for slug, name, icon, color, subtitle, order in SPORTS:
            defaults = {
                "name": name,
                "icon": icon,
                "color": color,
                "is_nav": True,
                "order": order,
            }
            if dry:
                exists = Category.objects.filter(slug=slug).exists()
                self.stdout.write(f"  [{'update' if exists else 'create'}] {slug}: {name}")
                continue
            obj, was_created = Category.objects.get_or_create(slug=slug, defaults={**defaults, "subtitle": subtitle})
            if was_created:
                created += 1
            else:
                # Update presentational fields but leave subtitle alone if editors changed it.
                for k, v in defaults.items():
                    setattr(obj, k, v)
                if not obj.subtitle:
                    obj.subtitle = subtitle
                obj.save()
                updated += 1

            if sections and not dry:
                for s_slug, s_name, s_kind, s_scope, s_icon, s_intro, s_order in DEFAULT_SECTIONS:
                    _, sec_created = CategorySection.objects.get_or_create(
                        category=obj, slug=s_slug,
                        defaults={
                            "name": s_name, "kind": s_kind, "scope": s_scope,
                            "icon": s_icon, "intro": s_intro, "order": s_order,
                        },
                    )
                    if sec_created:
                        section_created += 1

        if dry:
            self.stdout.write(self.style.WARNING("[dry] no changes written."))
            return

        msg = f"Seeded sports — created {created}, updated {updated}"
        if sections:
            msg += f", section rows created {section_created}"
        self.stdout.write(self.style.SUCCESS(msg))
