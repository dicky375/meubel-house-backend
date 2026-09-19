#!/bin/sh
set -e

echo "🔄 Running database migrations..."
node -e "
const { knexInstance } = require('./dist/config/database');
knexInstance.migrate.latest()
  .then(() => {
    console.log('✅ Migrations complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });
"

echo "🚀 Starting server..."
exec "$@"