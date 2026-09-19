import { z } from 'zod';

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  status: z.enum(['PENDING', 'SENT', 'FAILED', 'READ']).optional(),
  type: z.string().optional(),
  unreadOnly: z.coerce.boolean().optional().default(false),
});

export const testNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.string().default('TEST'),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  channel: z.enum(['IN_APP', 'EMAIL', 'SMS']).optional().default('IN_APP'),
});

export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
export type TestNotificationInput = z.infer<typeof testNotificationSchema>;
