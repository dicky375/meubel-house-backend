import { Model } from 'objection';
import { User } from '../users/user.model';

export class Cart extends Model {
  static get tableName() {
    return 'carts';
  }

  id!: string;
  userId!: string;
  items!: any;
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
