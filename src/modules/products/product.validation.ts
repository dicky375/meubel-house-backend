import { z } from 'zod';

// ─── Variant schema ────────────────────────────────
export const variantSchema = z.object({
  colour: z.string().max(50).optional(),
  size: z.string().max(50).optional(),
  material: z.string().max(100).optional(),
  sku: z.string().min(1).max(100),
  price: z.coerce.number().nonnegative(),
  stock: z.coerce.number().int().nonnegative().optional().default(0),
});

// ─── Product create ────────────────────────────────
export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  shortDescription: z.string().max(500).optional(),
  categoryId: z.string().uuid().optional(),
  price: z.coerce.number().nonnegative(),
  compareAtPrice: z.coerce.number().nonnegative().optional(),
  costPrice: z.coerce.number().nonnegative().optional(),
  sku: z.string().min(1).max(100),
  brand: z.string().max(100).optional(),
  material: z.string().max(100).optional(),
  dimensions: z
    .object({
      length: z.number().nonnegative(),
      width: z.number().nonnegative(),
      height: z.number().nonnegative(),
      unit: z.enum(['cm', 'in', 'm']).default('cm'),
    })
    .optional(),
  weight: z.coerce.number().nonnegative().optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string().url()).optional(),
  featured: z.boolean().optional().default(false),
  topPick: z.boolean().optional().default(false),
  isNew: z.boolean().optional().default(false),
  status: z
    .enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'ARCHIVED'])
    .optional()
    .default('DRAFT'),
  isActive: z.boolean().optional().default(false),
  isPublished: z.boolean().optional().default(false),
  variants: z.array(variantSchema).optional(),
  initialStock: z.coerce.number().int().nonnegative().optional().default(0),
});

// ─── Product update ────────────────────────────────
export const updateProductSchema = createProductSchema.partial().extend({
  variants: z.array(variantSchema).optional(),
});

// ─── Query params (storefront listing) ─────────────
export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z
    .enum(['createdAt', 'price', 'name', 'updatedAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),

  // Filters
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  categorySlug: z.string().optional(),
  brand: z.string().optional(),
  material: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  priceMin: z.coerce.number().nonnegative().optional(),
  priceMax: z.coerce.number().nonnegative().optional(),
  featured: z.coerce.boolean().optional(),
  topPick: z.coerce.boolean().optional(),
  isNew: z.coerce.boolean().optional(),
  status: z
    .enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'ARCHIVED'])
    .optional(),

  // Admin-only flags
  includeInactive: z.coerce.boolean().optional().default(false),
  includeCostPrice: z.coerce.boolean().optional().default(false),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type VariantInput = z.infer<typeof variantSchema>;