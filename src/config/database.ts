import knex from 'knex';
import { Model } from 'objection';
import dotenv from 'dotenv';

dotenv.config();

const connection = process.env.DATABASE_URL
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
    };

const knexInstance = knex({
  client: 'postgresql',
  connection,
  pool: { min: 2, max: 10 },
});

Model.knex(knexInstance);

export { knexInstance };