import { z } from 'zod';

// ─── Body schemas ──────────────────────────────────
export const addToCartSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.coerce.number().int().positive().max(100),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(0).max(100),
});

// ─── Path param schema ─────────────────────────────
// Strictly requires a non-negative integer string (no decimals, no signs, no letters)
export const cartItemIndexParam = z
  .string()
  .regex(/^\d+$/, 'Index must be a non-negative integer')
  .transform((s) => parseInt(s, 10))
  .pipe(z.number().int().nonnegative());

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
