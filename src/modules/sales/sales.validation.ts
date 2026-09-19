import { z } from 'zod';

// Line item in an in-store sale
const saleItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().nonnegative().optional(), // rep can override within limit
  discount: z.coerce.number().nonnegative().optional().default(0),
});

// Payment captured at point of sale
const paymentSchema = z.object({
  method: z.enum(['CASH', 'CARD', 'TRANSFER', 'POS']),
  amountPaid: z.coerce.number().nonnegative(),
  transactionReference: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

export const createInStoreSaleSchema = z.object({
  // Walk-in vs known customer
  customerId: z.string().uuid().optional(),
  walkInCustomer: z
    .object({
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      phone: z.string().max(30).optional(),
      email: z.string().email().optional(),
    })
    .optional(),

  items: z.array(saleItemSchema).min(1, 'Sale must have at least one item'),

  discount: z.coerce.number().nonnegative().optional().default(0),
  tax: z.coerce.number().nonnegative().optional().default(0),

  payment: paymentSchema,

  customerNote: z.string().max(1000).optional(),
});

export const salesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.enum(['createdAt', 'total', 'orderNumber']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  orderStatus: z.string().optional(),
  paymentStatus: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const productSearchSchema = z.object({
  q: z.string().optional(),
  sku: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  brand: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
});

export const customerSearchSchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters'),
});

export type CreateInStoreSaleInput = z.infer<typeof createInStoreSaleSchema>;
export type SalesQueryInput = z.infer<typeof salesQuerySchema>;
export type ProductSearchInput = z.infer<typeof productSearchSchema>;
export type CustomerSearchInput = z.infer<typeof customerSearchSchema>;