from django.db.models import F
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from easd_backend.permissions import IsEditorOrReadOnly

from .models import Video
from .serializers import VideoSerializer, VideoWriteSerializer


class VideoViewSet(viewsets.ModelViewSet):
    queryset = Video.objects.select_related("sport_category")
    lookup_field = "slug"
    filterset_fields = ("category", "is_featured", "sport_category__slug")
    search_fields = ("title", "description")
    ordering_fields = ("published_at", "view_count")
    ordering = ("-is_featured", "-published_at")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return VideoWriteSerializer
        return VideoSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve", "highlights", "featured", "play"):
            return [AllowAny()]
        return [IsEditorOrReadOnly()]

    @action(detail=False, methods=["get"])
    def highlights(self, request):
        limit = int(request.query_params.get("limit", 6))
        qs = self.get_queryset().order_by("-is_featured", "-published_at")[:limit]
        return Response(VideoSerializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def featured(self, request):
        qs = self.get_queryset().filter(is_featured=True)[:6]
        return Response(VideoSerializer(qs, many=True).data)

    @action(detail=True, methods=["post"])
    def play(self, request, slug=None):
        video = self.get_object()
        Video.objects.filter(pk=video.pk).update(view_count=F("view_count") + 1)
        video.refresh_from_db(fields=["view_count"])
        return Response({"view_count": video.view_count, "views": video.views_display})
