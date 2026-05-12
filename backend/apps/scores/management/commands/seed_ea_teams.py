"""Seed real East African football clubs so the Teams page isn't empty.

Idempotent: matches by slug, fills in metadata only when missing so editor
customisations are never overwritten. Run repeatedly without fear.

    ./venv/bin/python manage.py seed_ea_teams
    ./venv/bin/python manage.py seed_ea_teams --dry
"""

from django.core.management.base import BaseCommand

from apps.categories.models import Category
from apps.scores.models import Team


# Football clubs and national teams across East Africa. Slugs are stable so
# this seed plays nicely with auto-sync rows that might match by name.
EA_TEAMS = [
    # ── Kenya — KPL ──────────────────────────────────────
    ("gor-mahia",        "Gor Mahia FC",       "Kenya", 1968, "Nyayo National Stadium",   "Sammy Omollo",  "K'Ogalo — Kenya's most decorated football club.",                "#0F8A4D"),
    ("afc-leopards",     "AFC Leopards",       "Kenya", 1964, "Nyayo National Stadium",   "Tomas Trucha",  "Ingwe — historic Kenyan giants with a loyal national following.","#1E40AF"),
    ("tusker-fc",        "Tusker FC",          "Kenya", 1970, "Ruaraka Sports Ground",    "Robert Matano", "The Brewery — multiple-time KPL champions.",                      "#FCD34D"),
    ("kakamega-homeboyz","Kakamega Homeboyz",  "Kenya", 2008, "Bukhungu Stadium",         "Hassan Oktay",  "Western Kenya's flagship side.",                                  "#2563EB"),
    ("bandari-fc",       "Bandari FC",         "Kenya", 1966, "Mbaraki Sports Club",      "Salim Bakari",  "The Dockers — Mombasa-based KPL outfit.",                         "#0EA5E9"),
    ("sofapaka",         "Sofapaka FC",        "Kenya", 2008, "Wanguru Stadium",          "Ezekiel Akwana","Batoto Ba Mungu — 2009 KPL champions.",                            "#EF4444"),
    ("posta-rangers",    "Posta Rangers",      "Kenya", 1989, "Police Sacco Stadium",     "Sammy Omollo",  "Mailmen — long-running KPL fixture.",                             "#7C3AED"),
    ("kcb-fc",           "KCB FC",             "Kenya", 1953, "Bellevue Stadium",         "Zedekiah Otieno","The Bankers — corporate club with a steady KPL pedigree.",       "#10B981"),
    ("kenya-police-fc",  "Kenya Police FC",    "Kenya", 1947, "Police Sacco Stadium",     "Etienne Ndayiragije", "Servants of the people — a top-flight regular.",            "#1F2937"),
    ("ulinzi-stars",     "Ulinzi Stars",       "Kenya", 1996, "Ulinzi Sports Complex",    "Benjamin Nyangweso", "Soldiers — Kenyan Defence Forces side.",                     "#15803D"),
    ("harambee-stars",   "Harambee Stars",     "Kenya", 1922, "Moi International Sports Centre", "Engin Firat", "Kenya's senior men's national football team.",                "#000000"),

    # ── Uganda — UPL ─────────────────────────────────────
    ("vipers-sc",        "Vipers SC",          "Uganda",     1968, "St Mary's Stadium Kitende",  "Alex Isabirye", "Venoms — five-time Ugandan Premier League winners.",        "#0D9488"),
    ("kcca-fc",          "KCCA FC",            "Uganda",     1963, "Phillip Omondi Stadium",     "Morley Byekwaso", "Kasasiro Boys — Kampala Capital City Authority side.",    "#1E3A8A"),
    ("sc-villa",         "SC Villa",           "Uganda",     1975, "Mandela National Stadium",   "Dusan Stojanovic", "Jogoo — Uganda's most successful club historically.",      "#DC2626"),
    ("express-fc-ug",    "Express FC",         "Uganda",     1957, "Wankulukuku Stadium",        "Wasswa Bbosa",  "Red Eagles — Kampala-based Ugandan icons.",                 "#B91C1C"),
    ("bul-fc",           "BUL FC",             "Uganda",     2003, "Njeru FUFA Technical Centre","Hussein Mbalangu", "Busoga giants competing in the UPL.",                     "#FBBF24"),
    ("ura-fc",           "URA FC",             "Uganda",     1973, "MTN Omondi Stadium",         "Tom Masiko",    "Uganda Revenue Authority — perennial top-flight contender.","#0EA5E9"),
    ("cranes",           "Uganda Cranes",      "Uganda",     1924, "Mandela National Stadium",   "Paul Put",      "Uganda's senior men's national team.",                       "#FBBF24"),

    # ── Tanzania — NBC Premier League ────────────────────
    ("simba-sc",         "Simba SC",           "Tanzania",   1936, "Benjamin Mkapa Stadium",     "Fadlu Davids",  "Wekundu wa Msimbazi — Tanzania's most-followed club.",       "#DC2626"),
    ("yanga-sc",         "Young Africans SC",  "Tanzania",   1935, "Benjamin Mkapa Stadium",     "Miloš Kostić",  "Yanga — record Tanzanian league champions.",                 "#15803D"),
    ("azam-fc",          "Azam FC",            "Tanzania",   2004, "Azam Complex",               "Hemed Suleiman", "Chamazi-based powerhouse with continental pedigree.",       "#1D4ED8"),
    ("taifa-stars",      "Taifa Stars",        "Tanzania",   1957, "Benjamin Mkapa Stadium",     "Adel Amrouche", "Tanzania's senior men's national team.",                    "#22C55E"),

    # ── Rwanda — Primus National League ──────────────────
    ("apr-fc",           "APR FC",             "Rwanda",     1986, "Amahoro Stadium",            "Mohammed Adel", "Armée Patriotique Rwandaise — Rwandan record champions.",   "#2563EB"),
    ("rayon-sports",     "Rayon Sports",       "Rwanda",     1965, "Amahoro Stadium",            "Mohamed Lemtouni", "Gikundiro — Nyamirambo's pride.",                         "#16A34A"),
    ("amavubi",          "Amavubi",            "Rwanda",     1976, "Amahoro Stadium",            "Torsten Spittler", "Rwanda's senior men's national team.",                    "#FBBF24"),

    # ── Burundi & South Sudan (smaller but EASD-relevant) ─
    ("vital-o",          "Vital'O FC",         "Burundi",    1976, "Stade Prince Louis Rwagasore","Christophe Kalonji", "Bujumbura-based Burundian giants.",                      "#1E3A8A"),
    ("intamba-mu-rugamba","Burundi (Intamba)", "Burundi",    1948, "Stade Prince Louis Rwagasore","Etienne Ndayiragije","Burundi's senior men's national team.",                  "#DC2626"),
    ("bright-stars-ss",  "Bright Stars FC",    "South Sudan",2011, "Juba National Stadium",      "—",             "South Sudan's top-flight contender.",                       "#7C3AED"),
    ("bright-stars-nt",  "South Sudan",        "South Sudan",2011, "Juba National Stadium",      "Stefano Cusin", "South Sudan's senior men's national team.",                 "#000000"),
]


class Command(BaseCommand):
    help = "Seed East African football clubs and national teams."

    def add_arguments(self, parser):
        parser.add_argument("--dry", action="store_true",
                            help="Print what would change without writing.")

    def handle(self, *args, dry=False, **opts):
        football = Category.objects.filter(slug="football").first()
        if football is None:
            self.stderr.write(self.style.ERROR(
                "No 'football' category found. Run seed_sports first."))
            return

        created = updated = 0
        for slug, name, country, founded, stadium, manager, description, color in EA_TEAMS:
            if dry:
                exists = Team.objects.filter(slug=slug).exists()
                self.stdout.write(f"  [{'update' if exists else 'create'}] {slug}: {name}")
                continue
            team, was_created = Team.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": name, "country": country, "founded": founded,
                    "stadium": stadium, "manager": manager, "description": description,
                    "primary_color": color, "category": football,
                    "short_name": "".join(w[0] for w in name.split() if w[0].isalpha())[:5].upper(),
                },
            )
            if was_created:
                created += 1
            else:
                # Only fill blanks — don't trample editor edits.
                changed = False
                if not team.category_id:
                    team.category = football; changed = True
                for field, value in (
                    ("country", country), ("founded", founded), ("stadium", stadium),
                    ("manager", manager), ("description", description),
                    ("primary_color", color),
                ):
                    current = getattr(team, field)
                    if not current and value:
                        setattr(team, field, value)
                        changed = True
                if changed:
                    team.save()
                    updated += 1

        if dry:
            self.stdout.write(self.style.WARNING("[dry] no changes written."))
            return
        self.stdout.write(self.style.SUCCESS(
            f"EA teams: created {created}, updated {updated}, untouched {len(EA_TEAMS) - created - updated}."
        ))
