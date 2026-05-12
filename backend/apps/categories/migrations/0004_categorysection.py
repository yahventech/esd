from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("categories", "0003_category_cover_image_category_subtitle"),
    ]

    operations = [
        migrations.CreateModel(
            name="CategorySection",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("slug", models.SlugField(blank=True, max_length=64)),
                ("name", models.CharField(max_length=64)),
                ("kind", models.CharField(
                    choices=[
                        ("news", "News"),
                        ("scores", "Scores"),
                        ("transfers", "Transfers"),
                        ("fixtures", "Fixtures"),
                        ("standings", "Standings"),
                        ("teams", "Teams"),
                        ("players", "Players"),
                        ("videos", "Videos"),
                        ("custom", "Custom page"),
                    ],
                    default="news",
                    max_length=16,
                )),
                ("icon", models.CharField(blank=True, max_length=8, help_text="Optional emoji icon")),
                ("intro", models.CharField(blank=True, max_length=200, help_text="Short tagline shown on the section page")),
                ("body", models.TextField(blank=True, help_text="Longform content for 'custom' sections")),
                ("tag_filter", models.CharField(blank=True, max_length=64,
                                                 help_text="Optional tag slug to narrow the story feed for this section")),
                ("order", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("category", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="sections",
                    to="categories.category",
                )),
            ],
            options={
                "ordering": ("category", "order", "name"),
                "unique_together": {("category", "slug")},
            },
        ),
    ]
