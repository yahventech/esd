import secrets

from django.db import models


class NewsletterSubscription(models.Model):
    FREQUENCY_CHOICES = (
        ("daily", "Daily"),
        ("weekly", "Weekly"),
        ("breaking", "Breaking only"),
    )
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=80, blank=True)
    frequency = models.CharField(max_length=16, choices=FREQUENCY_CHOICES, default="daily")
    is_subscribed = models.BooleanField(default=True)
    confirm_token = models.CharField(max_length=48, unique=True, blank=True)
    subscribed_at = models.DateTimeField(auto_now_add=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
    source = models.CharField(max_length=60, blank=True, default="site")

    class Meta:
        ordering = ("-subscribed_at",)

    def save(self, *args, **kwargs):
        if not self.confirm_token:
            self.confirm_token = secrets.token_urlsafe(24)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email
