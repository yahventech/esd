from django.urls import path
from rest_framework.routers import DefaultRouter

from .admin_views import UserAdminViewSet
from .views import LoginView, ProfileView, RegisterView, change_password

router = DefaultRouter()
router.register("users", UserAdminViewSet, basename="admin-user")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("profile/", ProfileView.as_view(), name="auth-profile"),
    path("password/", change_password, name="auth-password"),
] + router.urls
