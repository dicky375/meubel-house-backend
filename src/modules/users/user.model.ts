import { Model } from 'objection';
import bcrypt from 'bcryptjs';
import { Cart } from '../cart/cart.model';
import { Order } from '../orders/order.model';
import { Review } from '../reviews/review.model';

export class User extends Model {
  static get tableName() {
    return 'users';
  }

  id!: string;
  email!: string;
  password!: string;
  firstName!: string;
  lastName!: string;
  phone?: string;
  role!: 'CUSTOMER' | 'SALES_REP' | 'ADMIN';
  isActive!: boolean;
  lastLogin?: Date;
  createdAt!: Date;
  updatedAt!: Date;

  static get relationMappings() {
    return {
      cart: {
        relation: Model.HasOneRelation,
        modelClass: Cart,
        join: {
          from: 'users.id',
          to: 'carts.userId',
        },
      },
      orders: {
        relation: Model.HasManyRelation,
        modelClass: Order,
        join: {
          from: 'users.id',
          to: 'orders.customerId',
        },
      },
      reviews: {
        relation: Model.HasManyRelation,
        modelClass: Review,
        join: {
          from: 'users.id',
          to: 'reviews.userId',
        },
      },
    };
  }

  async $beforeInsert() {
    this.password = await bcrypt.hash(this.password, 10);
  }

  async $beforeUpdate(opt: any, queryContext: any) {
    if (this.password && this.password.length < 60) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  static async findByEmail(email: string) {
    return await User.query().where('email', email).first();
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  toJSON() {
    const user = { ...this };
    delete user.password;
    return user;
  }
}