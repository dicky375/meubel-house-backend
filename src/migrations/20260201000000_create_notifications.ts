import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('notifications');
  if (exists) return;

  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('userId').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.string('type').notNullable();
    table.string('title').notNullable();
    table.text('message').notNullable();
    table.string('channel').defaultTo('IN_APP');
    table.enum('status', ['PENDING', 'SENT', 'FAILED', 'READ']).defaultTo('PENDING');
    table.jsonb('metadata');
    table.timestamp('readAt');
    table.timestamp('sentAt');
    table.text('error');

    // Explicit camelCase timestamps (matching our other tables)
    table.timestamp('createdAt').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updatedAt').defaultTo(knex.fn.now()).notNullable();

    table.index(['userId', 'status']);
    table.index('createdAt');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notifications');
}
