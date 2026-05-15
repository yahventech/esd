from django.contrib import admin

from .models import TransferNews


@admin.register(TransferNews)
class TransferNewsAdmin(admin.ModelAdmin):
    list_display = ("player_name", "to_club", "transfer_status", "category",
                    "is_featured", "is_breaking", "status", "published_at")
    list_filter = ("status", "transfer_status", "category", "is_featured", "is_breaking")
    search_fields = ("player_name", "from_club", "to_club", "summary", "body")
    autocomplete_fields = ("category", "author")
    readonly_fields = ("slug", "view_count", "created_at", "updated_at")
