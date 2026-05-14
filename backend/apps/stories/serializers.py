from django.utils import timezone
from rest_framework import serializers

from .models import (BreakingNews, Story, Tag, TrendingComment,
                     TrendingCommentLike, TrendingLike, TrendingTopic)


def humanize(dt):
    if dt is None:
        return ""
    delta = timezone.now() - dt
    seconds = int(delta.total_seconds())
    if seconds < 60:
        return "just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    days = hours // 24
    if days < 7:
        return f"{days} day{'s' if days != 1 else ''} ago"
    weeks = days // 7
    if weeks < 4:
        return f"{weeks} week{'s' if weeks != 1 else ''} ago"
    return dt.strftime("%b %-d, %Y")


class TagSerializer(serializers.ModelSerializer):
    usage_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Tag
        fields = ("id", "slug", "name", "usage_count", "created_at")
        read_only_fields = ("slug", "usage_count", "created_at")


class TinyTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ("slug", "name")


class StoryListSerializer(serializers.ModelSerializer):
    """Lightweight serializer used in lists/feeds — matches frontend shape."""
    category = serializers.CharField(source="category.name", default="", read_only=True)
    categorySlug = serializers.CharField(source="category.slug", default="", read_only=True)
    author = serializers.CharField(source="author.byline", default="EASD Desk", read_only=True)
    authorRole = serializers.CharField(source="author.author_role", default="", read_only=True)
    timestamp = serializers.SerializerMethodField()
    readTime = serializers.SerializerMethodField()
    commentCount = serializers.IntegerField(source="comment_count", read_only=True)
    isLive = serializers.BooleanField(source="is_live", read_only=True)
    isBreaking = serializers.BooleanField(source="is_breaking", read_only=True)
    type = serializers.CharField(source="editors_pick_type", default="", read_only=True)
    coverImage = serializers.SerializerMethodField()
    articleImage = serializers.SerializerMethodField()
    format = serializers.CharField(source="story_format", read_only=True)
    formatLabel = serializers.SerializerMethodField()
    tags = TinyTagSerializer(many=True, read_only=True)

    class Meta:
        model = Story
        fields = (
            "id", "slug", "category", "categorySlug", "headline", "summary",
            "author", "authorRole", "timestamp", "readTime", "commentCount",
            "isLive", "isBreaking", "gradient", "type", "coverImage", "articleImage",
            "placement", "placement_rank", "status", "view_count",
            "format", "formatLabel", "tags",
        )

    def get_formatLabel(self, obj):
        return dict(Story.FORMAT_CHOICES).get(obj.story_format, "")

    def _abs_image(self, image_field):
        if not image_field:
            return None
        request = self.context.get("request")
        url = image_field.url
        return request.build_absolute_uri(url) if request else url

    def get_coverImage(self, obj):
        return self._abs_image(obj.cover_image)

    def get_articleImage(self, obj):
        # Fall back to the cover image so existing stories still show a hero
        # image inside the reader without an editor touching them. New stories
        # can use this field to supply a distinct in-article photo.
        return self._abs_image(obj.article_image) or self._abs_image(obj.cover_image)

    def get_timestamp(self, obj):
        return humanize(obj.published_at)

    def get_readTime(self, obj):
        return f"{obj.read_minutes} min read"


class StoryDetailSerializer(StoryListSerializer):
    body = serializers.CharField(read_only=True)
    category_id = serializers.IntegerField(read_only=True)

    class Meta(StoryListSerializer.Meta):
        fields = StoryListSerializer.Meta.fields + (
            "body", "created_at", "updated_at", "published_at",
            "category_id", "editors_pick_type",
        )


class StoryWriteSerializer(serializers.ModelSerializer):
    tag_names = serializers.ListField(
        child=serializers.CharField(max_length=60),
        write_only=True, required=False,
        help_text="Freeform tag names. Existing tags are reused, new ones are created.",
    )
    tags = TinyTagSerializer(many=True, read_only=True)

    class Meta:
        model = Story
        fields = (
            "id", "slug", "headline", "summary", "body", "cover_image", "article_image",
            "gradient", "category", "placement", "placement_rank", "editors_pick_type",
            "status", "is_live", "is_breaking", "read_minutes", "published_at",
            "story_format", "tags", "tag_names",
        )
        read_only_fields = ("slug",)

    def _apply_tags(self, instance, names):
        resolved = []
        for raw in names or []:
            name = (raw or "").strip().lstrip("#").strip()
            if not name:
                continue
            tag = Tag.objects.filter(name__iexact=name).first()
            if not tag:
                tag = Tag.objects.create(name=name)
            resolved.append(tag)
        instance.tags.set(resolved)

    def create(self, validated_data):
        names = validated_data.pop("tag_names", None)
        instance = super().create(validated_data)
        if names is not None:
            self._apply_tags(instance, names)
        return instance

    def update(self, instance, validated_data):
        names = validated_data.pop("tag_names", None)
        instance = super().update(instance, validated_data)
        if names is not None:
            self._apply_tags(instance, names)
        return instance


class BreakingNewsSerializer(serializers.ModelSerializer):
    is_live = serializers.BooleanField(read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True, default="")
    category_name = serializers.CharField(source="category.name", read_only=True, default="")

    class Meta:
        model = BreakingNews
        fields = ("id", "text", "link_url", "order", "is_active",
                  "expires_at", "is_live", "category", "category_slug", "category_name",
                  "created_at")
        read_only_fields = ("created_at", "is_live", "category_slug", "category_name")


class TrendingTopicSerializer(serializers.ModelSerializer):
    count = serializers.CharField(source="count_display", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True, default="")
    category_name = serializers.CharField(source="category.name", read_only=True, default="")
    slug = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()

    class Meta:
        model = TrendingTopic
        fields = ("id", "tag", "slug", "count", "post_count", "order", "is_active", "body",
                  "like_count", "comment_count", "liked_by_me",
                  "category", "category_slug", "category_name")
        read_only_fields = ("category_slug", "category_name", "slug",
                            "like_count", "comment_count", "liked_by_me")

    def get_slug(self, obj):
        # Mirrors the slugify the frontend uses to build #/tag/<slug> links so
        # the dedicated trending-tag page can be reached from a list of topics.
        from django.utils.text import slugify
        return slugify(obj.tag)

    def get_liked_by_me(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return TrendingLike.objects.filter(topic=obj, user=request.user).exists()


class TrendingCommentSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    timestamp = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()

    class Meta:
        model = TrendingComment
        fields = ("id", "topic", "body", "user", "timestamp",
                  "like_count", "liked_by_me", "created_at")
        read_only_fields = ("like_count", "topic", "created_at")

    def get_user(self, obj):
        u = obj.user
        return {
            "id": u.id,
            "username": u.username,
            "display_name": getattr(u, "display_name", None) or u.username,
            "avatar_url": getattr(u, "avatar_url", None),
        }

    def get_timestamp(self, obj):
        return humanize(obj.created_at)

    def get_liked_by_me(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return TrendingCommentLike.objects.filter(comment=obj, user=request.user).exists()
