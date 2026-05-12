from django.urls import path

from .views import SubscribeView, UnsubscribeView, admin_list

urlpatterns = [
    path("subscribe/", SubscribeView.as_view(), name="newsletter-subscribe"),
    path("unsubscribe/", UnsubscribeView.as_view(), name="newsletter-unsubscribe"),
    path("admin/list/", admin_list, name="newsletter-admin-list"),
]
