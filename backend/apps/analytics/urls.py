from django.urls import path

from . import views

urlpatterns = [
    path("track/", views.track, name="analytics-track"),
    path("summary/", views.summary, name="analytics-summary"),
    path("traffic/", views.traffic, name="analytics-traffic"),
    path("hourly/", views.hourly, name="analytics-hourly"),
    path("content/", views.content, name="analytics-content"),
    path("devices/", views.devices, name="analytics-devices"),
    path("realtime/", views.realtime, name="analytics-realtime"),
    path("engagement/", views.engagement, name="analytics-engagement"),
]
