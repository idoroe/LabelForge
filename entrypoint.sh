#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
while ! pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -q 2>/dev/null; do
  sleep 1
done
echo "PostgreSQL is ready!"

echo "Running migrations..."
python manage.py migrate --noinput

echo "Seeding demo data..."
python manage.py seed_data

echo "Starting server..."
exec gunicorn labelforge.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 3 \
  --timeout 120
