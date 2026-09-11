import knex from 'knex';
import { Model } from 'objection';
import dotenv from 'dotenv';

dotenv.config();

const knexInstance = knex({
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'meubel_house',
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: './src/migrations',
    extension: 'ts',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: './src/seeds',
    extension: 'ts',
  },
});

Model.knex(knexInstance);

export { knexInstance };