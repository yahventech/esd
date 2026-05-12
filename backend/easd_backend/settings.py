"""Django settings for EASD backend.

Every tunable below sources from `backend/.env` (loaded via python-dotenv)
and falls back to a dev-safe default. Copy `.env.example` to `.env` to set
your own values; nothing here will break if a key is missing.
"""

import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


def env(key, default=None, cast=str):
    """Pull a value from the environment with a default and a type cast.

    Supported casts: str (identity), bool, int, list. Lists are split on
    commas with surrounding whitespace stripped and empty tokens dropped.
    """
    raw = os.environ.get(key)
    if raw is None or raw == "":
        return default
    if cast is bool:
        return raw.strip().lower() in {"1", "true", "yes", "on"}
    if cast is int:
        try:
            return int(raw)
        except (TypeError, ValueError):
            return default
    if cast is list:
        return [item.strip() for item in raw.split(",") if item.strip()]
    return raw


SECRET_KEY = env("DJANGO_SECRET_KEY",
                 default="django-insecure-easd-dev-key-change-me-in-production")
DEBUG = env("DJANGO_DEBUG", default=True, cast=bool)
ALLOWED_HOSTS = env(
    "DJANGO_ALLOWED_HOSTS",
    default=["esd-biau.onrender.com", "ea-sportsdesk.com", "localhost", "127.0.0.1"],
    cast=list,
)

INSTALLED_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "channels",
    # local
    "apps.users",
    "apps.categories",
    "apps.stories",
    "apps.scores",
    "apps.videos",
    "apps.comments",
    "apps.newsletter",
    "apps.bookmarks",
    "apps.core",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "easd_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "easd_backend.wsgi.application"
ASGI_APPLICATION = "easd_backend.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 6}},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = env("DJANGO_TIME_ZONE", default="Africa/Nairobi")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# DRF
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.AllowAny",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

# JWT
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=env("JWT_ACCESS_HOURS", default=12, cast=int)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env("JWT_REFRESH_DAYS", default=14, cast=int)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# CORS — permissive for dev, allows the Vite dev server (5173) and preview (4173).
# In production set DJANGO_CORS_ALLOW_ALL=0 and list explicit origins below.
CORS_ALLOW_ALL_ORIGINS = env("DJANGO_CORS_ALLOW_ALL", default=True, cast=bool)
CORS_ALLOW_CREDENTIALS = env("DJANGO_CORS_ALLOW_CREDENTIALS", default=True, cast=bool)
CORS_ALLOWED_ORIGINS = env("DJANGO_CORS_ALLOWED_ORIGINS", default=[], cast=list)
CORS_ALLOWED_ORIGIN_REGEXES = env("DJANGO_CORS_ALLOWED_ORIGIN_REGEXES", default=[], cast=list)
# Trusted origins for CSRF / cookie-auth flows behind a reverse proxy.
CSRF_TRUSTED_ORIGINS = env("DJANGO_CSRF_TRUSTED_ORIGINS", default=[], cast=list)

# Channels — in-memory layer is fine for dev. For multi-process production
# (gunicorn workers, daphne behind nginx) point this at Redis via
# `DJANGO_CHANNEL_REDIS_URL=redis://host:6379/0`.
_REDIS_URL = env("DJANGO_CHANNEL_REDIS_URL", default="")
if _REDIS_URL:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [_REDIS_URL]},
        }
    }
else:
    CHANNEL_LAYERS = {
        "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"},
    }

# API-Football — external live-score sync. Free tier: 100 req/day.
# Signup: https://dashboard.api-football.com/register   Docs: https://www.api-football.com/documentation-v3
API_FOOTBALL_KEY = env("API_FOOTBALL_KEY", default="")
API_FOOTBALL_BASE = env("API_FOOTBALL_BASE", default="https://v3.football.api-sports.io")

# Auto-sync loop — runs in a background thread under daphne/runserver and pushes
# updates to websocket clients via the post_save signal.
LIVE_SYNC_AUTO = env("LIVE_SYNC_AUTO", default=True, cast=bool)
LIVE_SYNC_INTERVAL_SECONDS = env("LIVE_SYNC_INTERVAL_SECONDS", default=60, cast=int)

# Frontend integration — where the Vite app reaches us from. Used by emails,
# absolute-URL helpers, and any view that needs to embed a public link.
FRONTEND_BASE_URL = env("FRONTEND_BASE_URL", default="http://localhost:5173")
