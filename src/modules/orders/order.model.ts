import { Model } from 'objection';
import { User } from '../users/user.model';
import { Payment } from '../payments/payment.model';

export class Order extends Model {
  static get tableName() {
    return 'orders';
  }

  id!: string;
  orderNumber!: string;
  customerId?: string;
  salesChannel!: 'ONLINE' | 'IN_STORE';
  salesRepId?: string;
  items!: Array<{
    productId: string;
    variantId?: string;
    productName: string;
    sku: string;
    image?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    subtotal: number;
  }>;
  subtotal!: number;
  discount!: number;
  deliveryFee!: number;
  tax!: number;
  total!: number;
  currency!: string;
  paymentStatus!: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  orderStatus!: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'READY_FOR_DELIVERY' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'RETURNED' | 'REFUNDED';
  deliveryStatus!: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED';
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  customerNote?: string;
  createdBy?: string;
  createdAt!: Date;
  updatedAt!: Date;

  static get relationMappings() {
    return {
      customer: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'orders.customerId',
          to: 'users.id',
        },
      },
      salesRep: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'orders.salesRepId',
          to: 'users.id',
        },
      },
      payments: {
        relation: Model.HasManyRelation,
        modelClass: Payment,
        join: {
          from: 'orders.id',
          to: 'payments.orderId',
        },
      },
    };
  }
}