from urllib.parse import urlparse


def absolute_media_url(request, url):
    """Return a safe, absolute URL for media assets.

    If the URL is already absolute, return it unchanged. If it is relative,
    build an absolute URL from the current request.
    """
    if not url:
        return ""
    parsed = urlparse(url)
    if parsed.scheme in {"http", "https"}:
        return url
    if request:
        return request.build_absolute_uri(url)
    return url
