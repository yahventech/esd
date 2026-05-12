from django.urls import path

from .consumers import ScoresConsumer

websocket_urlpatterns = [
    path("ws/scores/", ScoresConsumer.as_asgi()),
]
