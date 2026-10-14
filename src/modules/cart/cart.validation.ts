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

// ─── Path param: accepts EITHER integer index OR cartItemId UUID ─
// Examples:
//   "0"                                   → index
//   "3"                                   → index
//   "3f8b9a1e-2c4d-4e6f-8a9b-1c2d3e4f5a6b" → cartItemId (uuid)
export const cartItemRefParam = z
  .string()
  .min(1)
  .refine(
    (s) =>
      /^\d+$/.test(s) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s),
    'Must be a non-negative integer or a valid cart item UUID'
  );

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
