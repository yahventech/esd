from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, CategorySectionViewSet

router = DefaultRouter()
router.register("sections", CategorySectionViewSet, basename="category-section")
router.register("", CategoryViewSet, basename="category")
urlpatterns = router.urls
