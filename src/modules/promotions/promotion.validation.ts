import { z } from 'zod';

export const createPromotionSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, numbers, _ or -'),
  description: z.string().max(500).optional(),
  type: z.enum(['PERCENTAGE', 'FIXED', 'FREE_SHIPPING']),
  value: z.coerce.number().nonnegative(),
  minimumOrder: z.coerce.number().nonnegative().optional().default(0),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  usageLimit: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updatePromotionSchema = createPromotionSchema.partial();

export const validatePromotionSchema = z.object({
  code: z.string().min(1).max(30),
  deliveryFee: z.coerce.number().nonnegative().optional().default(0),
});

export const promotionQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z
    .enum(['createdAt', 'code', 'usedCount', 'endDate'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  isActive: z.coerce.boolean().optional(),
  type: z.enum(['PERCENTAGE', 'FIXED', 'FREE_SHIPPING']).optional(),
  search: z.string().optional(),
});

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;
export type ValidatePromotionInput = z.infer<typeof validatePromotionSchema>;
export type PromotionQueryInput = z.infer<typeof promotionQuerySchema>;