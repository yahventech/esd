from rest_framework.routers import DefaultRouter

from .views import TransferNewsViewSet

router = DefaultRouter()
router.register("", TransferNewsViewSet, basename="transfer-news")

urlpatterns = router.urls
