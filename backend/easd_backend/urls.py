from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.users.urls")),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/categories/", include("apps.categories.urls")),
    path("api/stories/", include("apps.stories.urls")),
    path("api/scores/", include("apps.scores.urls")),
    path("api/videos/", include("apps.videos.urls")),
    path("api/comments/", include("apps.comments.urls")),
    path("api/newsletter/", include("apps.newsletter.urls")),
    path("api/bookmarks/", include("apps.bookmarks.urls")),
    path("api/transfers/", include("apps.transfers.urls")),
    path("api/", include("apps.core.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
