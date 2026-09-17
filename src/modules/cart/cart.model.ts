import { Model } from 'objection';
import { User } from '../users/user.model';

export class Cart extends Model {
  static get tableName() {
    return 'carts';
  }

  id!: string;
  userId!: string;
  items!: Array<{
    productId: string;
    variantId?: string;
    productName: string;
    variantLabel?: string;
    sku: string;
    image?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  subtotal!: number;
  discount!: number;
  total!: number;
  createdAt!: Date;
  updatedAt!: Date;

  static get relationMappings() {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'carts.userId',
          to: 'users.id',
        },
      },
    };
  }
}