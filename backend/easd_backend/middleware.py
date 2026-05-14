import logging
import time

from django.core.files.storage import default_storage

logger = logging.getLogger('easd_backend')


class RequestLoggingMiddleware:
    """Middleware to log HTTP requests and responses."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()

        # Log the incoming request
        logger.info(f"REQUEST: {request.method} {request.path} from {request.META.get('REMOTE_ADDR', 'unknown')}")

        response = self.get_response(request)

        duration = time.time() - start_time

        if request.method in {"POST", "PUT", "PATCH"}:
            try:
                upload_files = request.FILES
            except Exception as exc:
                logger.warning("UPLOAD: could not inspect request files for %s %s: %s", request.method, request.path, exc)
                upload_files = None

            if upload_files:
                files = [
                    {
                        "field": field,
                        "name": uploaded.name,
                        "size": uploaded.size,
                        "content_type": uploaded.content_type,
                    }
                    for field, uploaded in upload_files.items()
                ]
                logger.info(
                    "UPLOAD: %s %s files=%s active_storage=%s.%s media_url=%s",
                    request.method,
                    request.path,
                    files,
                    default_storage.__class__.__module__,
                    default_storage.__class__.__name__,
                    getattr(default_storage, "base_url", ""),
                )

        # Log the response
        logger.info(f"RESPONSE: {response.status_code} for {request.method} {request.path} in {duration:.3f}s")

        return response
