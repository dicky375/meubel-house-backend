import { Model } from 'objection';
import { Product } from './product.model';
import { Inventory } from '../inventory/inventory.model';

export class ProductVariant extends Model {
  static get tableName() {
    return 'product_variants';
  }

  id!: string;
  productId!: string;
  colour?: string;
  size?: string;
  material?: string;
  sku!: string;
  price!: number;
  stock!: number;
  createdAt!: Date;
  updatedAt!: Date;

  static get relationMappings() {
    return {
      product: {
        relation: Model.BelongsToOneRelation,
        modelClass: Product,
        join: {
          from: 'product_variants.productId',
          to: 'products.id',
        },
      },
      inventory: {
        relation: Model.HasManyRelation,
        modelClass: Inventory,
        join: {
          from: 'product_variants.id',
          to: 'inventory.variantId',
        },
      },
    };
  }
}