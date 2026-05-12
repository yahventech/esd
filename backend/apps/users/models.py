from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = (
        ("reader", "Reader"),
        ("author", "Author"),
        ("editor", "Editor"),
        ("admin", "Admin"),
    )

    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=80, blank=True)
    author_role = models.CharField(max_length=120, blank=True)
    bio = models.TextField(blank=True)
    avatar_url = models.URLField(blank=True)
    favorite_sport = models.CharField(max_length=80, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="reader")
    is_newsletter_subscriber = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    def save(self, *args, **kwargs):
        # Role is the single source of authorization truth. Keep Django's
        # is_staff flag in sync so the admin site and DRF permission helpers
        # stay consistent.
        if self.is_superuser and self.role != "admin":
            self.role = "admin"
        self.is_staff = self.role == "admin" or self.is_superuser
        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            uf = set(update_fields)
            if {"role", "is_superuser"} & uf:
                uf.update({"is_staff", "role"})
                kwargs["update_fields"] = list(uf)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.display_name or self.username

    @property
    def byline(self):
        return self.display_name or self.get_full_name() or self.username
