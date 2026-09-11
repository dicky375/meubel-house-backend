import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable UUID extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Users Table
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('email').unique().notNullable();
    table.string('password').notNullable();
    table.string('firstName').notNullable();
    table.string('lastName').notNullable();
    table.string('phone');
    table.enum('role', ['CUSTOMER', 'SALES_REP', 'ADMIN']).defaultTo('CUSTOMER');
    table.boolean('isActive').defaultTo(true);
    table.timestamp('lastLogin');
    table.timestamps(true, true);
  });

  // Categories Table
  await knex.schema.createTable('categories', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name').notNullable();
    table.string('slug').unique().notNullable();
    table.text('description');
    table.string('image');
    table.boolean('isActive').defaultTo(true);
    table.timestamps(true, true);
  });

  // Products Table
  await knex.schema.createTable('products', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('name').notNullable();
    table.string('slug').unique().notNullable();
    table.text('description');
    table.text('shortDescription');
    table.uuid('categoryId').references('id').inTable('categories').onDelete('SET NULL');
    table.decimal('price', 10, 2).notNullable();
    table.decimal('compareAtPrice', 10, 2);
    table.decimal('costPrice', 10, 2);
    table.string('sku').unique().notNullable();
    table.string('brand');
    table.string('material');
    table.jsonb('dimensions');
    table.decimal('weight', 8, 2);
    table.specificType('tags', 'text[]');
    table.specificType('images', 'text[]');
    table.boolean('featured').defaultTo(false);
    table.boolean('topPick').defaultTo(false);
    table.boolean('isNew').defaultTo(false);
    table.enum('status', ['DRAFT', 'ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'ARCHIVED']).defaultTo('DRAFT');
    table.boolean('isActive').defaultTo(false);
    table.boolean('isPublished').defaultTo(false);
    table.timestamps(true, true);
  });

  // Product Variants Table
  await knex.schema.createTable('product_variants', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('productId').references('id').inTable('products').onDelete('CASCADE').notNullable();
    table.string('colour');
    table.string('size');
    table.string('material');
    table.string('sku').unique().notNullable();
    table.decimal('price', 10, 2).notNullable();
    table.integer('stock').defaultTo(0);
    table.timestamps(true, true);
  });

  // Inventory Table
  await knex.schema.createTable('inventory', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('productId').references('id').inTable('products').onDelete('CASCADE').notNullable();
    table.uuid('variantId').references('id').inTable('product_variants').onDelete('CASCADE');
    table.uuid('storeId').defaultTo(knex.raw('uuid_generate_v4()'));
    table.integer('quantity').defaultTo(0);
    table.integer('reservedQuantity').defaultTo(0);
    table.integer('availableQuantity').defaultTo(0);
    table.integer('reorderLevel').defaultTo(10);
    table.timestamps(true, true);
  });

  // Inventory Transactions Table
  await knex.schema.createTable('inventory_transactions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('productId').references('id').inTable('products').onDelete('CASCADE').notNullable();
    table.uuid('variantId').references('id').inTable('product_variants').onDelete('CASCADE');
    table.enum('type', ['STOCK_IN', 'SALE', 'RESERVATION', 'RELEASE', 'ADJUSTMENT', 'RETURN', 'DAMAGED', 'TRANSFER']);
    table.integer('quantity').notNullable();
    table.integer('previousQuantity').notNullable();
    table.integer('newQuantity').notNullable();
    table.string('referenceType');
    table.uuid('referenceId');
    table.uuid('performedBy').references('id').inTable('users');
    table.text('reason');
    table.timestamps(true, true);
  });

  // Carts Table
  await knex.schema.createTable('carts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('userId').references('id').inTable('users').onDelete('CASCADE').unique();
    table.jsonb('items').defaultTo('[]');
    table.decimal('subtotal', 10, 2).defaultTo(0);
    table.decimal('discount', 10, 2).defaultTo(0);
    table.decimal('total', 10, 2).defaultTo(0);
    table.timestamps(true, true);
  });

  // Orders Table
  await knex.schema.createTable('orders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('orderNumber').unique().notNullable();
    table.uuid('customerId').references('id').inTable('users').onDelete('SET NULL');
    table.enum('salesChannel', ['ONLINE', 'IN_STORE']).defaultTo('ONLINE');
    table.uuid('salesRepId').references('id').inTable('users');
    table.jsonb('items').notNullable();
    table.decimal('subtotal', 10, 2).notNullable();
    table.decimal('discount', 10, 2).defaultTo(0);
    table.decimal('deliveryFee', 10, 2).defaultTo(0);
    table.decimal('tax', 10, 2).defaultTo(0);
    table.decimal('total', 10, 2).notNullable();
    table.string('currency').defaultTo('USD');
    table.enum('paymentStatus', ['PENDING', 'PAID', 'FAILED', 'REFUNDED']).defaultTo('PENDING');
    table.enum('orderStatus', ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY_FOR_DELIVERY', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURNED', 'REFUNDED']).defaultTo('PENDING');
    table.enum('deliveryStatus', ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED']).defaultTo('PENDING');
    table.jsonb('shippingAddress');
    table.jsonb('billingAddress');
    table.text('customerNote');
    table.uuid('createdBy').references('id').inTable('users');
    table.timestamps(true, true);
  });

  // Payments Table
  await knex.schema.createTable('payments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('orderId').references('id').inTable('orders').onDelete('CASCADE').notNullable();
    table.uuid('userId').references('id').inTable('users');
    table.string('provider').notNullable();
    table.string('transactionReference').notNullable();
    table.decimal('amount', 10, 2).notNullable();
    table.string('currency').defaultTo('USD');
    table.string('paymentMethod');
    table.enum('status', ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'PARTIALLY_PAID', 'REFUNDED', 'PARTIALLY_REFUNDED']).defaultTo('PENDING');
    table.decimal('amountPaid', 10, 2);
    table.decimal('amountDue', 10, 2);
    table.jsonb('metadata');
    table.timestamp('paidAt');
    table.timestamps(true, true);
  });

  // Reviews Table
  await knex.schema.createTable('reviews', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.uuid('productId').references('id').inTable('products').onDelete('CASCADE').notNullable();
    table.uuid('userId').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('orderId').references('id').inTable('orders');
    table.integer('rating').notNullable();
    table.text('comment');
    table.boolean('isVerified').defaultTo(false);
    table.timestamps(true, true);
    table.unique(['productId', 'userId']);
  });

  // Promotions Table
  await knex.schema.createTable('promotions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    table.string('code').unique().notNullable();
    table.string('description');
    table.enum('type', ['PERCENTAGE', 'FIXED', 'FREE_SHIPPING']);
    table.decimal('value', 10, 2).notNullable();
    table.decimal('minimumOrder', 10, 2);
    table.date('startDate').notNullable();
    table.date('endDate').notNullable();
    table.integer('usageLimit');
    table.integer('usedCount').defaultTo(0);
    table.boolean('isActive').defaultTo(true);
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('promotions');
  await knex.schema.dropTableIfExists('reviews');
  await knex.schema.dropTableIfExists('payments');
  await knex.schema.dropTableIfExists('orders');
  await knex.schema.dropTableIfExists('carts');
  await knex.schema.dropTableIfExists('inventory_transactions');
  await knex.schema.dropTableIfExists('inventory');
  await knex.schema.dropTableIfExists('product_variants');
  await knex.schema.dropTableIfExists('products');
  await knex.schema.dropTableIfExists('categories');
  await knex.schema.dropTableIfExists('users');
}