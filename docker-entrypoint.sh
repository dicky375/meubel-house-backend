#!/bin/sh
set -e

# ─── Decide how to wait for DB ─────────────────────
if [ -n "$DATABASE_URL" ]; then
  # Render / external DB — skip pg_isready, DB is reachable over network
  echo "🌐 Using DATABASE_URL — skipping pg_isready check"
else
  # Local Docker Compose — wait for the postgres service
  echo "⏳ Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
  until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; do
    sleep 1
  done
  echo "✅ PostgreSQL is ready"
fi

# ─── Run migrations ────────────────────────────────
echo "🔄 Running migrations..."
npx knex migrate:latest --knexfile dist/config/knexfile.js || {
  echo "⚠️  Migrations failed or already up to date"
}

# ─── Start server ──────────────────────────────────
echo "🚀 Starting server..."
exec "$@"
