#!/bin/bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
# Try the standard createsuperuser first (keeps Render's default behavior).
# If it fails (for example because the user already exists), run the idempotent
# script which handles existing users gracefully.
python manage.py createsuperuser --noinput || python teacher/create_admin.py