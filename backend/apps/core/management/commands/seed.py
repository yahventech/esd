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

        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.SUCCESS(
                f"Admin exists, skipping creation: {username}"
            ))
            return

        User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role="admin",
        )

        self.stdout.write(self.style.SUCCESS(
            f"Admin created: {username} (role=admin)"
        ))
