import os
import dj_database_url
from .settings import *
from .settings import BASE_DIR

# Build ALLOWED_HOSTS and CSRF_TRUSTED_ORIGINS from environment variables.
# Priority:
# 1. `ALLOWED_HOSTS` env var (comma-separated)
# 2. `RENDER_EXTERNAL_HOSTNAME` (set by Render)
# 3. `RENDER_SERVICE_NAME` as a last resort
env_allowed = os.environ.get('ALLOWED_HOSTS')
render_host = os.environ.get('RENDER_EXTERNAL_HOSTNAME') or os.environ.get('RENDER_SERVICE_NAME')

if env_allowed:
    ALLOWED_HOSTS = [h.strip() for h in env_allowed.split(',') if h.strip()]
else:
    ALLOWED_HOSTS = [render_host] if render_host else []

# If ALLOWED_HOSTS is still empty, allow all hosts as a temporary fallback
# (useful for quick deploys). For production hardening, set the ALLOWED_HOSTS
# environment variable explicitly instead of relying on this.
if not ALLOWED_HOSTS:
    ALLOWED_HOSTS = ['*']

# CSRF trusted origins: accept an env var or derive from the render host
env_csrf = os.environ.get('CSRF_TRUSTED_ORIGINS')
if env_csrf:
    CSRF_TRUSTED_ORIGINS = [h.strip() for h in env_csrf.split(',') if h.strip()]
else:
    CSRF_TRUSTED_ORIGINS = [f'https://{render_host}'] if render_host else []


DEBUG = False

SECRET_KEY = os.environ.get('SECRET_KEY')

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    "whitenoise.middleware.WhiteNoiseMiddleware", 
    'django.contrib.sessions.middleware.SessionMiddleware',
    "corsheaders.middleware.CorsMiddleware",
    'django.middleware.common.CommonMiddleware', 
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ALLOWED_ORIGINS = [
    'https://capstone-foal.onrender.com',
]

# Static files (for collectstatic on Render)
# Ensure STATIC_URL and STATIC_ROOT are set so collectstatic can write files.
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

STORAGES ={
     "default":{
          "BACKEND": "django.core.files.storage.FileSystemStorage",
     },

     "staticfiles":{
               "BACKEND" : "whitenoise.storage.CompressedStaticFilesStorage",
     }
}

DATABASES = {
    'default': dj_database_url.config(
        default=os.environ['DATABASE_URL'],  # This should be the environment variable name
        conn_max_age=600
    )
}
