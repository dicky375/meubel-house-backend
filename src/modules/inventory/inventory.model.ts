import { Model } from 'objection';
import { Product } from '../products/product.model';
import { ProductVariant } from '../products/productVariant.model';

export class Inventory extends Model {
  static get tableName() {
    return 'inventory';
  }

  id!: string;
  productId!: string;
  variantId?: string;
  storeId!: string;
  quantity!: number;
  reservedQuantity!: number;
  availableQuantity!: number;
  reorderLevel!: number;
  createdAt!: Date;
  updatedAt!: Date;

  static get relationMappings() {
    return {
      product: {
        relation: Model.BelongsToOneRelation,
        modelClass: Product,
        join: {
          from: 'inventory.productId',
          to: 'products.id',
        },
      },
      variant: {
        relation: Model.BelongsToOneRelation,
        modelClass: ProductVariant,
        join: {
          from: 'inventory.variantId',
          to: 'product_variants.id',
        },
      },
    };
  }
}
