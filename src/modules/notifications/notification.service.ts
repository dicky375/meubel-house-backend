import { Notification } from './notification.model';
import { User } from '../users/user.model';
import { NotFoundError } from '../../utils/errors';
import { getPagination, buildPaginatedResult } from '../../utils/pagination';
import type {
  NotificationQueryInput,
  TestNotificationInput,
} from './notification.validation';

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  channel?: 'IN_APP' | 'EMAIL' | 'SMS';
  metadata?: any;
}

export class NotificationService {
  // ─── CORE: create a notification ────────────────
  static async create(params: CreateNotificationParams): Promise<Notification> {
    const { userId, type, title, message, channel = 'IN_APP', metadata } = params;

    const notification = await Notification.query().insert({
      userId,
      type,
      title,
      message,
      channel,
      status: 'PENDING',
      metadata: metadata || null,
    } as any);

    // Fire-and-forget dispatch
    this.dispatch(notification).catch((err) => {
      console.error('[Notification] Dispatch failed:', err.message);
    });

    return notification;
  }

  // ─── TRANSPORT: send to external channel ────────
  private static async dispatch(notification: Notification): Promise<void> {
    try {
      if (notification.channel === 'EMAIL') {
        await this.sendEmail(notification);
      } else if (notification.channel === 'SMS') {
        await this.sendSms(notification);
      }
      // IN_APP notifications are "sent" immediately

      await Notification.query().patchAndFetchById(notification.id, {
        status: 'SENT',
        sentAt: new Date(),
      });
    } catch (error: any) {
      await Notification.query().patchAndFetchById(notification.id, {
        status: 'FAILED',
        error: error.message,
      });
    }
  }

  // ─── EMAIL STUB ─────────────────────────────────
  private static async sendEmail(notification: Notification): Promise<void> {
    const user = await User.query().findById(notification.userId);
    if (!user) throw new NotFoundError('User');

    console.log('📧 [EMAIL STUB]');
    console.log(`  To: ${user.email}`);
    console.log(`  Subject: ${notification.title}`);
    console.log(`  Body: ${notification.message}`);
    console.log('  ─────────────────────────');
  }

  // ─── SMS STUB ───────────────────────────────────
  private static async sendSms(notification: Notification): Promise<void> {
    const user = await User.query().findById(notification.userId);
    if (!user) throw new NotFoundError('User');

    console.log('📱 [SMS STUB]');
    console.log(`  To: ${user.phone || 'NO_PHONE'}`);
    console.log(`  Message: ${notification.message}`);
    console.log('  ─────────────────────────');
  }

  // ─── LIST ───────────────────────────────────────
  static async listForUser(userId: string, query: NotificationQueryInput) {
    const { page, limit, offset } = getPagination(query);

    let qb = Notification.query().where('userId', userId);

    if (query.status) qb = qb.where('status', query.status);
    if (query.type) qb = qb.where('type', query.type);
    if (query.unreadOnly) qb = qb.whereNot('status', 'READ');

    const total = await qb.clone().resultSize();

    const data = await qb.orderBy('createdAt', 'desc').limit(limit).offset(offset);

    return buildPaginatedResult(data, total, page, limit);
  }

  // ─── UNREAD COUNT ───────────────────────────────
  static async getUnreadCount(userId: string): Promise<number> {
    const count = await Notification.query()
      .where('userId', userId)
      .whereNot('status', 'READ')
      .resultSize();

    return count;
  }

  // ─── MARK READ ──────────────────────────────────
  static async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await Notification.query()
      .where({ id, userId })
      .first();

    if (!notification) throw new NotFoundError('Notification');
    if (notification.status === 'READ') return notification;

    return Notification.query().patchAndFetchById(id, {
      status: 'READ',
      readAt: new Date(),
    });
  }

  static async markAllAsRead(userId: string): Promise<number> {
    const count = await Notification.query()
      .where('userId', userId)
      .whereNot('status', 'READ')
      .patch({
        status: 'READ',
        readAt: new Date(),
      });

    return count;
  }

  // ─── DELETE ─────────────────────────────────────
  static async delete(id: string, userId: string): Promise<void> {
    const notification = await Notification.query()
      .where({ id, userId })
      .first();

    if (!notification) throw new NotFoundError('Notification');

    await Notification.query().deleteById(id);
  }

  // ─── TEST ───────────────────────────────────────
  static async sendTest(input: TestNotificationInput): Promise<Notification> {
    return this.create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      channel: input.channel,
    });
  }

  // ─── EVENT HANDLERS ─────────────────────────────
  static async notifyOrderPlaced(
    userId: string,
    orderId: string,
    orderNumber: string,
    total: number
  ) {
    return this.create({
      userId,
      type: 'ORDER_PLACED',
      title: `Order ${orderNumber} confirmed`,
      message: `Thanks for your order! We've received $${total.toFixed(2)} and will notify you when it ships.`,
      metadata: { orderId, orderNumber },
    });
  }

  static async notifyOrderStatusChange(
    userId: string,
    orderId: string,
    orderNumber: string,
    newStatus: string
  ) {
    const messages: Record<string, { title: string; message: string }> = {
      CONFIRMED: {
        title: `Order ${orderNumber} confirmed`,
        message: `Your order has been confirmed and will be processed soon.`,
      },
      PROCESSING: {
        title: `Order ${orderNumber} is being prepared`,
        message: `We're preparing your order for shipment.`,
      },
      READY_FOR_DELIVERY: {
        title: `Order ${orderNumber} ready for delivery`,
        message: `Your order is ready and will be dispatched shortly.`,
      },
      SHIPPED: {
        title: `Order ${orderNumber} shipped! 🚚`,
        message: `Your order is on its way. Track it from your orders page.`,
      },
      DELIVERED: {
        title: `Order ${orderNumber} delivered ✅`,
        message: `Your order has been delivered. Enjoy! Leave a review to help others.`,
      },
      COMPLETED: {
        title: `Order ${orderNumber} completed`,
        message: `Thanks for shopping with Meubel House!`,
      },
      CANCELLED: {
        title: `Order ${orderNumber} cancelled`,
        message: `Your order has been cancelled. If this was a mistake, please contact support.`,
      },
      RETURNED: {
        title: `Order ${orderNumber} returned`,
        message: `We've received your return. Refund will be processed shortly.`,
      },
      REFUNDED: {
        title: `Order ${orderNumber} refunded`,
        message: `Your refund has been processed. It may take 5-10 business days to appear.`,
      },
    };

    const template = messages[newStatus];
    if (!template) return null;

    return this.create({
      userId,
      type: `ORDER_${newStatus}`,
      title: template.title,
      message: template.message,
      metadata: { orderId, orderNumber, newStatus },
    });
  }

  static async notifyWelcome(userId: string, firstName: string) {
    return this.create({
      userId,
      type: 'WELCOME',
      title: `Welcome to Meubel House, ${firstName}! 🎉`,
      message: `We're thrilled to have you. Browse our collection and enjoy free returns on your first order.`,
    });
  }

  static async notifyReviewPosted(userId: string, productName: string) {
    return this.create({
      userId,
      type: 'REVIEW_POSTED',
      title: `Thanks for reviewing ${productName}!`,
      message: `Your review helps other customers make better decisions.`,
    });
  }
}
