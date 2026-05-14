from django.db import migrations


def rename_news_to_news_feed(apps, schema_editor):
    """Rename the per-sport News subpage to 'News Feed' per editorial direction.

    Only rows that still carry the auto-seeded name ('News') are touched, so
    any editor who hand-edited the display name keeps their version.
    """
    CategorySection = apps.get_model("categories", "CategorySection")
    CategorySection.objects.filter(slug="news", name="News").update(name="News Feed")


def reverse_rename(apps, schema_editor):
    CategorySection = apps.get_model("categories", "CategorySection")
    CategorySection.objects.filter(slug="news", name="News Feed").update(name="News")


class Migration(migrations.Migration):

    dependencies = [
        ("categories", "0007_restore_news_section"),
    ]

    operations = [
        migrations.RunPython(rename_news_to_news_feed, reverse_rename),
    ]
