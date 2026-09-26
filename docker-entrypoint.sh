#!/bin/sh
set -e

echo "⏳ Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; do
  sleep 1
done

echo "✅ PostgreSQL is ready"

echo "🔄 Running migrations..."
npx knex migrate:latest --knexfile dist/config/knexfile.js || {
  echo "❌ Migrations failed"
  exit 1
}

echo "🚀 Starting server..."
exec "$@"
