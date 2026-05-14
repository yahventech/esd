from django.apps import AppConfig
from django.conf import settings
from django.core.files.storage import default_storage
import logging

logger = logging.getLogger('easd_backend')


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"
    label = "core"

    def ready(self):
        """Log startup information when Django is ready."""
        logger.info("=== Django application starting ===")
        logger.info(f"Database engine: {settings.DATABASES['default'].get('ENGINE', 'unknown')}")
        logger.info(f"File storage: {settings.DEFAULT_FILE_STORAGE}")
        logger.info(
            "Active default storage: %s.%s",
            default_storage.__class__.__module__,
            default_storage.__class__.__name__,
        )
        logger.info(f"Log level: {settings.LOGGING.get('root', {}).get('level', 'unknown')}")
        logger.info(f"Debug mode: {settings.DEBUG}")
        logger.info(f"Allowed hosts: {settings.ALLOWED_HOSTS}")
        logger.info("=== Django application ready ===")
