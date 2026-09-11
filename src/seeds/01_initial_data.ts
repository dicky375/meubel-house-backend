import { Knex } from 'knex';
import bcrypt from 'bcryptjs';

export async function seed(knex: Knex): Promise<void> {
  // Clear existing data
  await knex('users').del();
  await knex('categories').del();

  // Insert users
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await knex('users').insert([
    {
      email: 'admin@meubel.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true,
    },
    {
      email: 'customer@test.com',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'Customer',
      role: 'CUSTOMER',
      isActive: true,
    },
  ]);

  // Insert categories
  await knex('categories').insert([
    { name: 'Living Room', slug: 'living-room', description: 'Living room furniture', isActive: true },
    { name: 'Bedroom', slug: 'bedroom', description: 'Bedroom furniture', isActive: true },
    { name: 'Dining', slug: 'dining', description: 'Dining room furniture', isActive: true },
    { name: 'Office', slug: 'office', description: 'Office furniture', isActive: true },
  ]);

  console.log('✅ Seed data inserted successfully');
}