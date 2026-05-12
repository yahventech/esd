from django.contrib import admin

from .models import BreakingNews, Story, TrendingTopic


@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):
    list_display = ("headline", "category", "author", "placement", "placement_rank",
                    "status", "is_live", "is_breaking", "published_at", "view_count")
    list_filter = ("status", "placement", "category", "is_live", "is_breaking")
    list_editable = ("placement", "placement_rank", "status", "is_live", "is_breaking")
    search_fields = ("headline", "summary", "body", "author__username", "author__display_name")
    prepopulated_fields = {"slug": ("headline",)}
    date_hierarchy = "published_at"
    autocomplete_fields = ("category",)
    readonly_fields = ("view_count", "comment_count", "created_at", "updated_at")


@admin.register(BreakingNews)
class BreakingNewsAdmin(admin.ModelAdmin):
    list_display = ("text", "order", "is_active", "created_at")
    list_editable = ("order", "is_active")


@admin.register(TrendingTopic)
class TrendingTopicAdmin(admin.ModelAdmin):
    list_display = ("tag", "post_count", "count_display", "order", "is_active")
    list_editable = ("post_count", "order", "is_active")
