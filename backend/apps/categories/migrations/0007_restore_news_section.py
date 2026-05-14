from django.db import migrations


def restore_news_sections(apps, schema_editor):
    """Recreate the per-sport 'News' subpage that powers the sport-scoped story
    feed in the Sports mega-menu. Migration 0006 pruned the seeded general-
    scoped sections wholesale; News needs to come back because editors rely on
    it as the landing subpage for each sport (showing every story filed under
    that category)."""
    Category = apps.get_model("categories", "Category")
    CategorySection = apps.get_model("categories", "CategorySection")

    for cat in Category.objects.all():
        # Skip if the editor already has a section at this slug — never clobber
        # custom content. The unique_together on (category, slug) would error
        # anyway; this just keeps the migration idempotent.
        if cat.sections.filter(slug="news").exists():
            continue
        CategorySection.objects.create(
            category=cat,
            slug="news",
            name="News",
            kind="news",
            scope="general",
            icon="📰",
            intro=f"The latest {cat.name.lower()} stories, updated in real time.",
            order=10,
            is_active=True,
        )


def noop_reverse(apps, schema_editor):
    # No-op reverse: tearing down a recreated News section would re-introduce
    # the very gap this migration was added to fix.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("categories", "0006_prune_general_seeded_sections"),
    ]

    operations = [
        migrations.RunPython(restore_news_sections, noop_reverse),
    ]
