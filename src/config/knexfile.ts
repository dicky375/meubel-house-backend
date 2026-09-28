import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const ROOT = path.resolve(__dirname, '../..');

// ─── Detect if we need SSL ─────────────────────────
// Cloud DBs (Neon, Render, etc.) need SSL.
// Local Postgres (Docker, native) doesn't.
function needsSSL(host?: string): boolean {
  if (!host) return false;
  return !['localhost', '127.0.0.1', 'postgres', 'db'].includes(host);
}

// ─── Build connection ──────────────────────────────
const isProd = process.env.NODE_ENV === 'production';
const useDatabaseUrl = isProd && !!process.env.DATABASE_URL;

const prodConnection = useDatabaseUrl
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'meubel_house',
      ssl: needsSSL(process.env.DB_HOST)
        ? { rejectUnauthorized: false }
        : false,
    };

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'meubel_house',
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: path.join(ROOT, 'src/migrations'),
      extension: 'ts',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: path.join(ROOT, 'src/seeds'),
      extension: 'ts',
    },
  },

  production: {
    client: 'postgresql',
    connection: prodConnection,
    pool: { min: 2, max: 10 },
    migrations: {
      directory: path.join(ROOT, 'dist/migrations'),
      extension: 'js',
      tableName: 'knex_migrations',
    },
  },
};

export default config;
