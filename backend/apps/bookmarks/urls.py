from django.urls import path

from .views import my_bookmarks

urlpatterns = [
    path("mine/", my_bookmarks, name="my-bookmarks"),
]
