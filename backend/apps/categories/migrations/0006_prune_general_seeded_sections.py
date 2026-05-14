from django.db import migrations


# Slugs that the seed command historically created with scope='general'.
# Pruning by (slug, scope) instead of slug alone protects any editor-created
# section that happens to share a slug but lives under a different scope.
SEEDED_GENERAL_SLUGS = (
    "scores",
    "fixtures",
    "standings",
    "news",
    "teams",
    "players",
    "videos",
)


def prune_general_seeded_sections(apps, schema_editor):
    CategorySection = apps.get_model("categories", "CategorySection")
    CategorySection.objects.filter(
        scope="general",
        slug__in=SEEDED_GENERAL_SLUGS,
    ).delete()


def noop_reverse(apps, schema_editor):
    # Reversing is intentionally a no-op: the deleted rows were seeded data,
    # and re-running the seed command will recreate any defaults the editorial
    # team still wants.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("categories", "0005_categorysection_scope_alter_categorysection_id"),
    ]

    operations = [
        migrations.RunPython(prune_general_seeded_sections, noop_reverse),
    ]
