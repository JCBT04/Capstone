import os
import django
from django.db import IntegrityError

# Use the same settings selection logic as manage.py so this script works
# both locally and when running on Render (which sets RENDER env vars).
if os.environ.get('RENDER') or os.environ.get('RENDER_EXTERNAL_HOSTNAME'):
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.deployment_settings')
else:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'changeme123')

try:
    if not User.objects.filter(username=username).exists():
        User.objects.create_superuser(username=username, email=email, password=password)
        print(f'✅ Superuser created: {username}')
    else:
        print(f'⚠️ Superuser already exists: {username}')
except IntegrityError:
    # Another process may have created the user concurrently (e.g. during deploy); treat as non-fatal
    print(f'⚠️ Could not create superuser — username "{username}" already exists (IntegrityError).')
except Exception as e:
    # Log and continue — we don't want deploys to fail because of superuser creation
    print(f'❌ Unexpected error while creating superuser: {e}')