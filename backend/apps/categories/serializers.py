from rest_framework import serializers

from .models import Category, CategorySection


class CategorySectionSerializer(serializers.ModelSerializer):
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = CategorySection
        fields = (
            "id", "category", "category_slug", "category_name",
            "slug", "name", "kind", "scope", "icon", "intro", "body",
            "tag_filter", "order", "is_active",
        )
        read_only_fields = ("slug", "category_slug", "category_name")


class CategorySectionPublicSerializer(serializers.ModelSerializer):
    """Slim serializer embedded on Category for the public feed / navbar."""

    class Meta:
        model = CategorySection
        fields = ("id", "slug", "name", "kind", "scope", "icon", "intro", "order")


class CategorySerializer(serializers.ModelSerializer):
    count = serializers.IntegerField(source="article_count", read_only=True)
    cover_url = serializers.SerializerMethodField()
    sections = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ("id", "slug", "name", "icon", "color", "description", "subtitle",
                  "cover_image", "cover_url", "is_nav", "order", "count", "sections")
        read_only_fields = ("slug", "cover_url", "sections")
        extra_kwargs = {"cover_image": {"required": False, "allow_null": True}}

    def get_cover_url(self, obj):
        if not obj.cover_image:
            return ""
        request = self.context.get("request")
        url = obj.cover_image.url
        return request.build_absolute_uri(url) if request else url

    def get_sections(self, obj):
        qs = obj.sections.filter(is_active=True).order_by("order", "name")
        return CategorySectionPublicSerializer(qs, many=True).data
