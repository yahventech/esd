"""Admin-only endpoints for user management (list, role changes)."""

from django.contrib.auth import get_user_model
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from easd_backend.permissions import IsAdminOrReadOnly, is_admin_user

from .serializers import UserSerializer

User = get_user_model()


class AdminUserSerializer(serializers.ModelSerializer):
    byline = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "display_name", "author_role", "bio",
            "avatar_url", "favorite_sport", "role", "is_newsletter_subscriber",
            "is_active", "is_staff", "byline", "created_at",
        )
        read_only_fields = ("id", "username", "created_at", "byline")


class UserAdminViewSet(viewsets.ModelViewSet):
    """Admins can list, update (role, flags), and deactivate users."""

    queryset = User.objects.all().order_by("-created_at")
    serializer_class = AdminUserSerializer
    http_method_names = ["get", "patch", "post", "delete"]

    def get_permissions(self):
        return [IsAdminOrReadOnly()] if self.action != "list" else [IsAdminOrReadOnly()]

    def check_permissions(self, request):
        super().check_permissions(request)
        if not is_admin_user(request.user):
            self.permission_denied(request, message="Admin only.")

    @action(detail=True, methods=["post"])
    def set_role(self, request, pk=None):
        user = self.get_object()
        new_role = request.data.get("role")
        if new_role not in dict(User.ROLE_CHOICES):
            return Response({"detail": "Invalid role."}, status=400)
        user.role = new_role
        user.save(update_fields=["role", "is_staff", "updated_at"])
        return Response(AdminUserSerializer(user).data)
