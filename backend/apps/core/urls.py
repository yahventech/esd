from django.urls import path

from .views import admin_stats, health, homepage_feed

urlpatterns = [
    path("health/", health, name="health"),
    path("feed/", homepage_feed, name="homepage-feed"),
    path("admin/stats/", admin_stats, name="admin-stats"),
]
