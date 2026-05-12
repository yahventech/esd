from django.contrib import admin

from .models import Category, CategorySection


class CategorySectionInline(admin.TabularInline):
    model = CategorySection
    extra = 0
    fields = ("name", "kind", "slug", "order", "is_active", "tag_filter")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "icon", "color", "is_nav", "order", "article_count")
    list_editable = ("is_nav", "order")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name", "slug")
    ordering = ("order", "name")
    inlines = [CategorySectionInline]


@admin.register(CategorySection)
class CategorySectionAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "kind", "order", "is_active")
    list_editable = ("order", "is_active")
    list_filter = ("kind", "is_active", "category")
    search_fields = ("name", "slug", "category__name")
    prepopulated_fields = {"slug": ("name",)}
