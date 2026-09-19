import { Model } from 'objection';
import { Product } from '../products/product.model';
import { User } from '../users/user.model';
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
      product: {
        relation: Model.BelongsToOneRelation,
        modelClass: Product,
        join: { from: 'reviews.productId', to: 'products.id' },
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: { from: 'reviews.userId', to: 'users.id' },
      },
      order: {
        relation: Model.BelongsToOneRelation,
        modelClass: Order,
        join: { from: 'reviews.orderId', to: 'orders.id' },
      },
    };
  }

  // Hide sensitive user fields, only expose name
  $formatJson(json: any) {
    json = super.$formatJson(json);
    if (json.user) {
      json.user = {
        id: json.user.id,
        firstName: json.user.firstName,
        lastName: json.user.lastName,
      };
    }
    return json;
  }
}