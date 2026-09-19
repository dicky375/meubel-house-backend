import { z } from 'zod';

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const timeSeriesSchema = dateRangeSchema.extend({
  groupBy: z.enum(['day', 'week', 'month']).optional().default('day'),
});

export const topProductsSchema = dateRangeSchema.extend({
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
  sortBy: z.enum(['revenue', 'units']).optional().default('revenue'),
  salesChannel: z.enum(['ONLINE', 'IN_STORE']).optional(),
});

export const salesRepPerformanceSchema = dateRangeSchema;

export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type TimeSeriesInput = z.infer<typeof timeSeriesSchema>;
export type TopProductsInput = z.infer<typeof topProductsSchema>;
