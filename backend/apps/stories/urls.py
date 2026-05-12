from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.comments.views import StoryCommentsView
from apps.bookmarks.views import StoryBookmarkView

from .views import BreakingNewsViewSet, StoryViewSet, TagViewSet, TrendingTopicViewSet

router = DefaultRouter()
router.register("breaking-news", BreakingNewsViewSet, basename="breaking-news")
router.register("trending", TrendingTopicViewSet, basename="trending-topics")
router.register("tags", TagViewSet, basename="tag")
router.register("", StoryViewSet, basename="story")

urlpatterns = router.urls + [
    path("<slug:story_slug>/comments/",
         StoryCommentsView.as_view({"get": "list", "post": "create"}),
         name="story-comments"),
    path("<slug:story_slug>/bookmark/",
         StoryBookmarkView.as_view(), name="story-bookmark"),
]
