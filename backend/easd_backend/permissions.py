"""Shared DRF permission classes used across the EASD backend.

Newsroom roles (stored on `users.User.role`):
  - reader   (default; read-only)
  - author   (can CRUD own stories / videos)
  - editor   (can CRUD any story / video / match / breaking news / trending)
  - admin    (full control including categories + user roles)

Django `is_staff` is always treated as admin.
"""

from rest_framework.permissions import SAFE_METHODS, BasePermission

STAFF_ROLES = {"author", "editor", "admin"}
EDITOR_ROLES = {"editor", "admin"}


def is_staff_user(user):
    return bool(user and user.is_authenticated and (user.is_staff or user.role in STAFF_ROLES))


def is_editor_user(user):
    return bool(user and user.is_authenticated and (user.is_staff or user.role in EDITOR_ROLES))


def is_admin_user(user):
    return bool(user and user.is_authenticated and (user.is_staff or user.role == "admin"))


class ReadOnly(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS


class IsStaffOrReadOnly(BasePermission):
    """Read is public. Create/update/delete requires a newsroom role or is_staff."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return is_staff_user(request.user)


class IsEditorOrReadOnly(BasePermission):
    """Read is public. Write requires editor/admin or is_staff."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return is_editor_user(request.user)


class IsAdminOrReadOnly(BasePermission):
    """Read is public. Write requires admin role or is_staff."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return is_admin_user(request.user)


class IsAuthorOwnerOrEditor(BasePermission):
    """Object-level: authors may edit their own entries; editors/admins may edit anything."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return is_staff_user(request.user)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        if is_editor_user(user):
            return True
        owner_id = getattr(obj, "author_id", None) or getattr(obj, "user_id", None)
        return owner_id == getattr(user, "id", None)
