import logging
import time

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

        # Log the response
        logger.info(f"RESPONSE: {response.status_code} for {request.method} {request.path} in {duration:.3f}s")

        return response