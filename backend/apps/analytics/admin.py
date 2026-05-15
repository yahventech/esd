from django.contrib import admin

from .models import EventLog, PageView


@admin.register(PageView)
class PageViewAdmin(admin.ModelAdmin):
    list_display = ("path", "kind", "device_type", "user", "country", "created_at")
    list_filter = ("kind", "device_type")
    search_fields = ("path", "session_key", "user__username", "referrer")
    readonly_fields = ("created_at", "ip_hash")
    date_hierarchy = "created_at"


@admin.register(EventLog)
class EventLogAdmin(admin.ModelAdmin):
    list_display = ("event_type", "target_type", "target_label", "user", "device_type", "created_at")
    list_filter = ("event_type", "target_type", "device_type")
    search_fields = ("target_label", "target_id", "session_key")
    readonly_fields = ("created_at",)
    date_hierarchy = "created_at"
