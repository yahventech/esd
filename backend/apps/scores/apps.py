from django.apps import AppConfig


class ScoresConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.scores"
    label = "scores"

    def ready(self):
        from . import signals  # noqa: F401
        from .background import start_if_configured
        start_if_configured()
