import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// __dirname resolves to:
//   dev (ts-node):  .../src/config  → ../migrations = src/migrations (.ts)
//   prod (compiled): .../dist/config → ../migrations = dist/migrations (.js)
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const SEEDS_DIR = path.join(__dirname, '..', 'seeds');

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
      directory: MIGRATIONS_DIR,
      extension: 'ts',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: SEEDS_DIR,
      extension: 'ts',
    },
  },
  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: false,
        }
      : {
          host: process.env.DB_HOST,
          port: Number(process.env.DB_PORT) || 5432,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          ssl: false,
        },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: MIGRATIONS_DIR,
      extension: 'js',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: SEEDS_DIR,
      extension: 'js',
    },
  },
};

export default config;
