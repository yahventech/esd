from django.db import migrations


def remove_seeded_defaults(apps, schema_editor):
    """Remove the last two auto-seeded sub-sections (News Feed + Transfers) so
    every section visible under a sport in the navigation is one an editor
    explicitly added in the admin dashboard.

    Filtering by the full seeded signature (slug + name + kind + scope +
    tag_filter) protects any row an editor has customised — those will not
    match and stay put.
    """
    CategorySection = apps.get_model("categories", "CategorySection")

    # News rows seeded by either 0007 ('News') or post-rename 0008 ('News Feed').
    CategorySection.objects.filter(
        slug="news",
        kind="news",
        scope="general",
        tag_filter="",
        name__in=("News", "News Feed"),
    ).delete()

    # Transfers rows seeded by the original `seed_sports --sections` run.
    CategorySection.objects.filter(
        slug="transfers",
        kind="transfers",
        scope="international",
        name="Transfers",
        tag_filter="transfers",
    ).delete()


def noop_reverse(apps, schema_editor):
    # No-op reverse: restoring the seeded defaults would re-introduce the
    # very rows this migration was added to remove.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("categories", "0008_rename_news_section_to_news_feed"),
    ]

    operations = [
        migrations.RunPython(remove_seeded_defaults, noop_reverse),
    ]
