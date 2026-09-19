#!/bin/sh
set -e

echo "🔄 Running database migrations..."
node -e "
const config = require('./dist/config/knexfile.js').default;
const env = process.env.NODE_ENV || 'development';
const knex = require('knex')(config[env]);
knex.migrate.latest()
  .then(() => { console.log('✅ Migrations complete'); return knex.destroy(); })
  .then(() => process.exit(0))
  .catch((err) => { console.error('❌ Migration failed:', err); process.exit(1); });
"

echo "🚀 Starting server..."
exec "$@"
