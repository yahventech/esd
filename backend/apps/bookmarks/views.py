from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.stories.models import Story
from apps.stories.serializers import StoryListSerializer

from .models import Bookmark


class StoryBookmarkView(APIView):
    """POST toggles, GET reports whether current user has bookmarked the story,
    DELETE removes. Mounted at /api/stories/<slug>/bookmark/."""
    permission_classes = [IsAuthenticated]

    def get(self, request, story_slug):
        story = get_object_or_404(Story, slug=story_slug)
        is_bookmarked = Bookmark.objects.filter(user=request.user, story=story).exists()
        return Response({"bookmarked": is_bookmarked})

    def post(self, request, story_slug):
        story = get_object_or_404(Story, slug=story_slug)
        bm, created = Bookmark.objects.get_or_create(user=request.user, story=story)
        if not created:
            bm.delete()
            return Response({"bookmarked": False})
        return Response({"bookmarked": True}, status=status.HTTP_201_CREATED)

    def delete(self, request, story_slug):
        story = get_object_or_404(Story, slug=story_slug)
        Bookmark.objects.filter(user=request.user, story=story).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_bookmarks(request):
    qs = (Bookmark.objects.filter(user=request.user)
          .select_related("story", "story__author", "story__category")
          .order_by("-created_at"))
    stories = [b.story for b in qs]
    return Response(StoryListSerializer(stories, many=True).data)
