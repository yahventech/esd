from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import NewsletterSubscription
from .serializers import SubscribeSerializer, SubscriptionSerializer


class SubscribeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = SubscribeSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        sub, created = NewsletterSubscription.objects.get_or_create(
            email=ser.validated_data["email"].lower(),
            defaults={
                "display_name": ser.validated_data.get("display_name", ""),
                "frequency": ser.validated_data.get("frequency", "daily"),
                "source": ser.validated_data.get("source", "site"),
            },
        )
        if not created:
            sub.is_subscribed = True
            sub.unsubscribed_at = None
            if ser.validated_data.get("frequency"):
                sub.frequency = ser.validated_data["frequency"]
            if ser.validated_data.get("display_name"):
                sub.display_name = ser.validated_data["display_name"]
            sub.save()

        return Response(
            {
                "success": True,
                "message": (
                    "Welcome to the EASD team — your first briefing lands tomorrow morning."
                    if created else "You're already on the list. Welcome back!"
                ),
                "subscription": SubscriptionSerializer(sub).data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class UnsubscribeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").lower()
        token = request.data.get("token")
        qs = NewsletterSubscription.objects.all()
        if token:
            qs = qs.filter(confirm_token=token)
        elif email:
            qs = qs.filter(email=email)
        else:
            return Response({"detail": "email or token required"}, status=400)
        sub = qs.first()
        if not sub:
            return Response({"detail": "Subscription not found."}, status=404)
        sub.is_subscribed = False
        sub.unsubscribed_at = timezone.now()
        sub.save()
        return Response({"success": True, "message": "Unsubscribed."})


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_list(request):
    qs = NewsletterSubscription.objects.order_by("-subscribed_at")
    return Response(SubscriptionSerializer(qs, many=True).data)
