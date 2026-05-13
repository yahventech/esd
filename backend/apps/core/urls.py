from django.urls import path

from .views import admin_stats, health, homepage_feed, scrape_news

urlpatterns = [
    path("health/", health, name="health"),
    path("feed/", homepage_feed, name="homepage-feed"),
    path("admin/stats/", admin_stats, name="admin-stats"),
    path("admin/scrape-news/", scrape_news, name="scrape-news"),
]
