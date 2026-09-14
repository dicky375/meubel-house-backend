import { Model } from 'objection';
import { knexInstance } from './database';

// Use camelCase in code, snake_case in DB
Model.knex(knexInstance);

// Optional: global camelCase mapping
// (Objection will automatically convert createdAt <-> created_at)