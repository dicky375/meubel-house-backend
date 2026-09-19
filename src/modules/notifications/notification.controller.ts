import { Response, NextFunction } from 'express';
import { NotificationService } from './notification.service';
import {
  notificationQuerySchema,
  testNotificationSchema,
} from './notification.validation';
import type { AuthRequest } from '../../middleware/auth';

export class NotificationController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = notificationQuerySchema.parse(req.query);
      const result = await NotificationService.listForUser(req.user!.id, query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async unreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const count = await NotificationService.getUnreadCount(req.user!.id);
      res.json({ unreadCount: count });
    } catch (error) {
      next(error);
    }
  }

  static async markRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const notification = await NotificationService.markAsRead(
        String(req.params.id),
        req.user!.id
      );
      res.json({ notification });
    } catch (error) {
      next(error);
    }
  }

  static async markAllRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const count = await NotificationService.markAllAsRead(req.user!.id);
      res.json({ marked: count });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await NotificationService.delete(String(req.params.id), req.user!.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async sendTest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = testNotificationSchema.parse(req.body);
      const notification = await NotificationService.sendTest(data);
      res.status(201).json({ notification });
    } catch (error) {
      next(error);
    }
  }
}
