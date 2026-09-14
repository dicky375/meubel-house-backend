import { Model } from 'objection';
import { User } from '../users/user.model';
import { Product } from '../products/product.model';
import { Order } from '../orders/order.model';

export class Review extends Model {
  static get tableName() {
    return 'reviews';
  }

  id!: string;
  productId!: string;
  userId!: string;
  orderId?: string;
  rating!: number;
  comment?: string;
  isVerified!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static get relationMappings() {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'reviews.userId',
          to: 'users.id',
        },
      },
      product: {
        relation: Model.BelongsToOneRelation,
        modelClass: Product,
        join: {
          from: 'reviews.productId',
          to: 'products.id',
        },
      },
      order: {
        relation: Model.BelongsToOneRelation,
        modelClass: Order,
        join: {
          from: 'reviews.orderId',
          to: 'orders.id',
        },
      },
    };
  }
}