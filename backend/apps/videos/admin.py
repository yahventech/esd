from django.contrib import admin

from .models import Video


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "duration", "view_count", "is_featured", "published_at")
    list_filter = ("category", "is_featured")
    list_editable = ("is_featured",)
    search_fields = ("title", "description")
    prepopulated_fields = {"slug": ("title",)}
