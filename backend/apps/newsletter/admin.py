from django.contrib import admin

from .models import NewsletterSubscription


@admin.register(NewsletterSubscription)
class NewsletterSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("email", "display_name", "frequency", "is_subscribed",
                    "subscribed_at", "source")
    list_filter = ("is_subscribed", "frequency", "source")
    search_fields = ("email", "display_name")
