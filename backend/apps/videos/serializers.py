from rest_framework import serializers

from apps.stories.models import Tag
from apps.stories.serializers import TinyTagSerializer

from .models import Video


class VideoSerializer(serializers.ModelSerializer):
    views = serializers.CharField(source="views_display", read_only=True)
    thumbnail = serializers.SerializerMethodField()
    tags = TinyTagSerializer(many=True, read_only=True)

    class Meta:
        model = Video
        fields = ("id", "slug", "title", "description", "duration", "video_url",
                  "thumbnail", "gradient", "category", "views", "view_count",
                  "is_featured", "published_at", "sport_category", "tags")

    def get_thumbnail(self, obj):
        if not obj.thumbnail:
            return None
        request = self.context.get("request")
        url = obj.thumbnail.url
        return request.build_absolute_uri(url) if request else url


class VideoWriteSerializer(serializers.ModelSerializer):
    tag_names = serializers.ListField(
        child=serializers.CharField(max_length=60),
        write_only=True, required=False,
    )
    tags = TinyTagSerializer(many=True, read_only=True)

    class Meta:
        model = Video
        fields = ("id", "slug", "title", "description", "duration", "video_url",
                  "thumbnail", "gradient", "category", "sport_category",
                  "is_featured", "view_count", "tags", "tag_names")
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
