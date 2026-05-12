from rest_framework import serializers

from .models import NewsletterSubscription


class SubscribeSerializer(serializers.Serializer):
    email = serializers.EmailField()
    display_name = serializers.CharField(required=False, allow_blank=True, max_length=80)
    frequency = serializers.ChoiceField(choices=NewsletterSubscription.FREQUENCY_CHOICES,
                                         required=False, default="daily")
    source = serializers.CharField(required=False, allow_blank=True, max_length=60)


class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsletterSubscription
        fields = ("id", "email", "display_name", "frequency", "is_subscribed",
                  "subscribed_at", "unsubscribed_at", "source")
