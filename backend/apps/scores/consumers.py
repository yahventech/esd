import json

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer


class ScoresConsumer(AsyncWebsocketConsumer):
    """Broadcasts match updates to all connected clients.

    Room group: 'scores'. Sent whenever a Match or MatchEvent is saved
    (see apps.scores.signals).
    """
    GROUP = "scores"

    async def connect(self):
        await self.channel_layer.group_add(self.GROUP, self.channel_name)
        await self.accept()
        # Send current live snapshot on connect
        await self.send_snapshot()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.GROUP, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        # Allow clients to request a fresh snapshot on demand
        try:
            payload = json.loads(text_data or "{}")
        except json.JSONDecodeError:
            payload = {}
        if payload.get("type") == "snapshot":
            await self.send_snapshot()

    async def match_update(self, event):
        await self.send(text_data=json.dumps({"type": "match_update", "match": event["match"]}))

    async def send_snapshot(self):
        matches = await sync_to_async(self._serialize_matches)()
        await self.send(text_data=json.dumps({"type": "snapshot", "matches": matches}))

    def _serialize_matches(self):
        from .models import Match
        from .serializers import MatchSerializer
        qs = (Match.objects.filter(is_visible=True)
              .select_related("home_team", "away_team")
              .prefetch_related("events").order_by("order", "kickoff"))
        return MatchSerializer(qs, many=True).data
