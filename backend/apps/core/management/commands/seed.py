"""Bootstrap the EASD backend with an admin superuser.

Usage:
    python manage.py seed [--username admin] [--password easd2026] [--email admin@easd.local]

Idempotent: re-running updates the existing admin's password if one is provided.
No editorial content is seeded — all stories/videos/teams/etc are created by users.
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create or update the EASD admin superuser."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="admin")
        parser.add_argument("--password", default="easd2026")
        parser.add_argument("--email", default="admin@easd.local")

    def handle(self, *args, **opts):
        User = get_user_model()
        username = opts["username"]
        email = opts["email"]
        password = opts["password"]

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "display_name": "EASD Admin",
                "role": "admin",
                "is_staff": True,
                "is_superuser": True,
            },
        )

        if not created:
            self.stdout.write(self.style.SUCCESS(
                f"Admin exists, skipping creation: {username}"
            ))
            return

        user.set_password(password)
        user.save(update_fields=["password"])
        self.stdout.write(self.style.SUCCESS(
            f"Admin created: {username} (role=admin)"
        ))
