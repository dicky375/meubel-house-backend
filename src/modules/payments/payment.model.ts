import { Model } from 'objection';
import { Order } from '../orders/order.model';
import { User } from '../users/user.model';

export class Payment extends Model {
  static get tableName() {
    return 'payments';
  }

  id!: string;
  orderId!: string;
  userId?: string;
  provider!: string;
  transactionReference!: string;
  amount!: number;
  currency!: string;
  paymentMethod?: string;
  status!: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'PARTIALLY_PAID' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  amountPaid?: number;
  amountDue?: number;
  metadata?: any;
  paidAt?: Date;
  createdAt!: Date;
  updatedAt!: Date;

  static get relationMappings() {
    return {
      order: {
        relation: Model.BelongsToOneRelation,
        modelClass: Order,
        join: {
          from: 'payments.orderId',
          to: 'orders.id',
        },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'payments.userId',
          to: 'users.id',
        },
      },
    };
  }
}