"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

# Use deployment settings on Render so STATIC_ROOT, ALLOWED_HOSTS, and other
# production settings are available to the ASGI process. Fall back to
# `backend.settings` for local development.
if os.environ.get('RENDER') or os.environ.get('RENDER_EXTERNAL_HOSTNAME'):
	os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.deployment_settings')
else:
	os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

application = get_asgi_application()
