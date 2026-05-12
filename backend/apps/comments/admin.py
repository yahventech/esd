from django.contrib import admin

from .models import Comment, CommentLike


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("user", "story", "body_preview", "parent", "like_count", "is_flagged", "created_at")
    list_filter = ("is_flagged", "created_at")
    search_fields = ("body", "user__username", "story__headline")

    def body_preview(self, obj):
        return (obj.body[:80] + "…") if len(obj.body) > 80 else obj.body


@admin.register(CommentLike)
class CommentLikeAdmin(admin.ModelAdmin):
    list_display = ("user", "comment", "created_at")
