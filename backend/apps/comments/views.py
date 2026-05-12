from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from apps.stories.models import Story

from .models import Comment, CommentLike
from .serializers import CommentSerializer


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.select_related("user", "story").prefetch_related("replies__user")
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filterset_fields = ("story__slug", "parent")

    def get_queryset(self):
        qs = super().get_queryset()
        # Default: top-level comments only; nested replies are included via serializer
        if self.action == "list":
            story_slug = self.request.query_params.get("story__slug") or self.request.query_params.get("story")
            if story_slug:
                qs = qs.filter(story__slug=story_slug, parent__isnull=True)
            else:
                qs = qs.filter(parent__isnull=True)
        return qs

    def perform_create(self, serializer):
        story = serializer.validated_data["story"]
        comment = serializer.save(user=self.request.user)
        Story.objects.filter(pk=story.pk).update(comment_count=F("comment_count") + 1)
        return comment

    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.user_id != self.request.user.id and not self.request.user.is_staff:
            raise PermissionDenied("You can only edit your own comments.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user_id != self.request.user.id and not self.request.user.is_staff:
            raise PermissionDenied("You can only delete your own comments.")
        story_id = instance.story_id
        instance.delete()
        Story.objects.filter(pk=story_id).update(
            comment_count=F("comment_count") - 1
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        comment = self.get_object()
        like, created = CommentLike.objects.get_or_create(comment=comment, user=request.user)
        if not created:
            like.delete()
            Comment.objects.filter(pk=comment.pk).update(like_count=F("like_count") - 1)
            liked = False
        else:
            Comment.objects.filter(pk=comment.pk).update(like_count=F("like_count") + 1)
            liked = True
        comment.refresh_from_db(fields=["like_count"])
        return Response({"liked": liked, "like_count": comment.like_count})


class StoryCommentsView(viewsets.ViewSet):
    """Nested endpoint: /api/stories/<slug>/comments/ """
    permission_classes = [IsAuthenticatedOrReadOnly]

    def list(self, request, story_slug=None):
        story = get_object_or_404(Story, slug=story_slug)
        qs = story.comments.filter(parent__isnull=True).order_by("-created_at")
        ser = CommentSerializer(qs, many=True, context={"request": request})
        return Response(ser.data)

    def create(self, request, story_slug=None):
        if not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=401)
        story = get_object_or_404(Story, slug=story_slug)
        data = {**request.data, "story": story.pk}
        ser = CommentSerializer(data=data, context={"request": request})
        ser.is_valid(raise_exception=True)
        ser.save(user=request.user)
        Story.objects.filter(pk=story.pk).update(comment_count=F("comment_count") + 1)
        return Response(ser.data, status=status.HTTP_201_CREATED)
