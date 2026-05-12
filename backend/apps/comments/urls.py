from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CommentViewSet, StoryCommentsView

router = DefaultRouter()
router.register("", CommentViewSet, basename="comment")

urlpatterns = router.urls
