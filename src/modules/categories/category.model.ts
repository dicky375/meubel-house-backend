import { Model } from 'objection';
import { Product } from '../products/product.model';

export class Category extends Model {
  static get tableName() {
    return 'categories';
  }

  id!: string;
  name!: string;
  slug!: string;
  description?: string;
  image?: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static get relationMappings() {
    return {
      products: {
        relation: Model.HasManyRelation,
        modelClass: Product,
        join: {
          from: 'categories.id',
          to: 'products.categoryId',
        },
      },
    };
  }
}