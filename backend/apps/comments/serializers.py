from rest_framework import serializers

from apps.stories.serializers import humanize

from .models import Comment, CommentLike


class CommentSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    timestamp = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()
    storySlug = serializers.CharField(source="story.slug", read_only=True)

    class Meta:
        model = Comment
        fields = ("id", "story", "storySlug", "parent", "body", "user", "timestamp",
                  "like_count", "liked_by_me", "replies", "created_at")
        read_only_fields = ("like_count",)

    def get_user(self, obj):
        u = obj.user
        return {
            "id": u.id,
            "username": u.username,
            "display_name": u.display_name or u.username,
            "avatar_url": u.avatar_url,
        }

    def get_timestamp(self, obj):
        return humanize(obj.created_at)

    def get_replies(self, obj):
        # Only expose replies when serializing a top-level comment to avoid recursion loops.
        if obj.parent_id is not None:
            return []
        qs = obj.replies.all().order_by("created_at")
        return CommentSerializer(qs, many=True, context=self.context).data

    def get_liked_by_me(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return CommentLike.objects.filter(comment=obj, user=request.user).exists()
