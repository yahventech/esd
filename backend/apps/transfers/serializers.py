from rest_framework import serializers

from .models import TransferNews


def _abs(image_field, context):
    if not image_field:
        return ""
    request = context.get("request") if context else None
    url = image_field.url
    return request.build_absolute_uri(url) if request else url


class TransferNewsSerializer(serializers.ModelSerializer):
    """Read shape — includes display labels and absolute image URLs so the
    frontend can render a transfer card without extra lookups."""

    category_slug = serializers.CharField(source="category.slug", default="", read_only=True)
    category_name = serializers.CharField(source="category.name", default="", read_only=True)
    category_icon = serializers.CharField(source="category.icon", default="", read_only=True)
    transfer_status_label = serializers.SerializerMethodField()
    player_photo_url = serializers.SerializerMethodField()
    from_club_logo_url = serializers.SerializerMethodField()
    to_club_logo_url = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = TransferNews
        fields = (
            "id", "slug", "player_name", "player_photo", "player_photo_url",
            "from_club", "from_club_logo", "from_club_logo_url",
            "to_club", "to_club_logo", "to_club_logo_url",
            "transfer_status", "transfer_status_label",
            "fee", "contract_length", "reliability",
            "category", "category_slug", "category_name", "category_icon",
            "summary", "body", "source", "source_url",
            "is_featured", "is_breaking",
            "status", "view_count",
            "author", "author_name",
            "published_at", "created_at", "updated_at",
        )
        read_only_fields = (
            "slug", "player_photo_url", "from_club_logo_url", "to_club_logo_url",
            "transfer_status_label", "category_slug", "category_name", "category_icon",
            "view_count", "author_name", "created_at", "updated_at",
        )

    def get_transfer_status_label(self, obj):
        return dict(TransferNews.TRANSFER_STATUS_CHOICES).get(obj.transfer_status, obj.transfer_status)

    def get_player_photo_url(self, obj):
        return _abs(obj.player_photo, self.context)

    def get_from_club_logo_url(self, obj):
        return _abs(obj.from_club_logo, self.context)

    def get_to_club_logo_url(self, obj):
        return _abs(obj.to_club_logo, self.context)

    def get_author_name(self, obj):
        author = obj.author
        if not author:
            return "EASD Desk"
        return getattr(author, "display_name", None) or author.get_username()
