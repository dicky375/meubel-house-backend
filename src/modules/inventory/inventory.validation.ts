import { z } from 'zod';

export const adjustStockSchema = z.object({
  quantity: z.coerce.number().int(),
  type: z
    .enum([
      'STOCK_IN',
      'SALE',
      'RESERVATION',
      'RELEASE',
      'ADJUSTMENT',
      'RETURN',
      'DAMAGED',
      'TRANSFER',
    ])
    .default('ADJUSTMENT'),
  reason: z.string().max(500).optional(),
});

export const inventoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  sortBy: z
    .enum(['updatedAt', 'quantity', 'availableQuantity'])
    .optional()
    .default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  lowStock: z.coerce.boolean().optional(),
});

export const transactionQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  type: z
    .enum([
      'STOCK_IN',
      'SALE',
      'RESERVATION',
      'RELEASE',
      'ADJUSTMENT',
      'RETURN',
      'DAMAGED',
      'TRANSFER',
    ])
    .optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type InventoryQueryInput = z.infer<typeof inventoryQuerySchema>;
export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>;
