from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Match, MatchEvent


def _broadcast(match):
    from .serializers import MatchSerializer
    layer = get_channel_layer()
    if layer is None:
        return
    if not match.is_visible:
        # Skip hidden matches — editors toggle is_visible to curate the public strip.
        return
    data = MatchSerializer(match).data
    async_to_sync(layer.group_send)("scores", {"type": "match_update", "match": data})


def _maybe_recalc(match):
    """Schedule a standings recompute for the competition+season of `match`.

    Runs on transaction commit so the new Match row is durable before the
    aggregation query sees it. Silent no-op when we can't pin down the
    competition (free-text Match.competition that doesn't match any
    Competition row) — manual entry still works as a fallback.
    """
    from .standings import recalculate_for_match
    transaction.on_commit(lambda: recalculate_for_match(match))


@receiver(post_save, sender=Match)
def on_match_save(sender, instance, **kwargs):
    _broadcast(instance)
    # Only recompute once a match has reached Full Time — LIVE/HT updates fire
    # every minute during sync and don't change the standings yet (an in-play
    # match contributes 0 P/W/D/L until it finishes).
    if instance.status == "FT":
        _maybe_recalc(instance)


@receiver(post_delete, sender=Match)
def on_match_delete(sender, instance, **kwargs):
    # A deleted match removes whatever contribution it made. Recompute so
    # standings drop the deleted result.
    if instance.status == "FT":
        _maybe_recalc(instance)


@receiver(post_save, sender=MatchEvent)
def on_event_save(sender, instance, **kwargs):
    _broadcast(instance.match)
