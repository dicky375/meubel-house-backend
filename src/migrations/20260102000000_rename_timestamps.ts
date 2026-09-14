import { Knex } from 'knex';

const tables = [
  'users',
  'categories',
  'products',
  'product_variants',
  'inventory',
  'inventory_transactions',
  'carts',
  'orders',
  'payments',
  'reviews',
  'promotions',
];

export async function up(knex: Knex): Promise<void> {
  for (const table of tables) {
    const hasCreatedAt = await knex.schema.hasColumn(table, 'createdAt');
    const hasUpdatedAt = await knex.schema.hasColumn(table, 'updatedAt');

    if (!hasCreatedAt) {
      await knex.schema.alterTable(table, (t) => {
        t.renameColumn('created_at', 'createdAt');
      });
    }
    if (!hasUpdatedAt) {
      await knex.schema.alterTable(table, (t) => {
        t.renameColumn('updated_at', 'updatedAt');
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const table of tables) {
    await knex.schema.alterTable(table, (t) => {
      t.renameColumn('createdAt', 'created_at');
      t.renameColumn('updatedAt', 'updated_at');
    });
  }
}