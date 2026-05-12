from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class EASDUserAdmin(UserAdmin):
    list_display = ("username", "email", "display_name", "role", "is_newsletter_subscriber", "is_staff")
    list_filter = ("role", "is_newsletter_subscriber", "is_staff", "is_superuser")
    search_fields = ("username", "email", "display_name")
    fieldsets = UserAdmin.fieldsets + (
        ("EASD Profile", {"fields": ("display_name", "author_role", "bio", "avatar_url",
                                      "favorite_sport", "role", "is_newsletter_subscriber")}),
    )
