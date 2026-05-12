from django.contrib.auth import authenticate, get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegisterSerializer, UserSerializer, tokens_for_user

User = get_user_model()


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = tokens_for_user(user)
        return Response(
            {"user": UserSerializer(user).data, **tokens},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get("username") or request.data.get("email") or ""
        password = request.data.get("password") or ""

        user = authenticate(username=identifier, password=password)
        if user is None:
            try:
                candidate = User.objects.get(email__iexact=identifier)
                user = authenticate(username=candidate.username, password=password)
            except User.DoesNotExist:
                user = None

        if user is None:
            return Response(
                {"detail": "Invalid username/email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        tokens = tokens_for_user(user)
        return Response({"user": UserSerializer(user).data, **tokens})


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    current = request.data.get("current_password") or ""
    new_password = request.data.get("new_password") or ""
    if not request.user.check_password(current):
        return Response({"detail": "Current password is incorrect."}, status=400)
    if len(new_password) < 6:
        return Response({"detail": "New password must be at least 6 characters."}, status=400)
    request.user.set_password(new_password)
    request.user.save()
    return Response({"detail": "Password updated."})
