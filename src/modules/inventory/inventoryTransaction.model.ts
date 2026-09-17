import { Model } from 'objection';
import { Product } from '../products/product.model';
import { ProductVariant } from '../products/productVariant.model';
import { User } from '../users/user.model';

export class InventoryTransaction extends Model {
  static get tableName() {
    return 'inventory_transactions';
  }

  id!: string;
  productId!: string;
  variantId?: string;
  type!:
    | 'STOCK_IN'
    | 'SALE'
    | 'RESERVATION'
    | 'RELEASE'
    | 'ADJUSTMENT'
    | 'RETURN'
    | 'DAMAGED'
    | 'TRANSFER';
  quantity!: number;
  previousQuantity!: number;
  newQuantity!: number;
  referenceType?: string;
  referenceId?: string;
  performedBy?: string;
  reason?: string;
  createdAt!: Date;
  updatedAt!: Date;

  static get relationMappings() {
    return {
      product: {
        relation: Model.BelongsToOneRelation,
        modelClass: Product,
        join: {
          from: 'inventory_transactions.productId',
          to: 'products.id',
        },
      },
      variant: {
        relation: Model.BelongsToOneRelation,
        modelClass: ProductVariant,
        join: {
          from: 'inventory_transactions.variantId',
          to: 'product_variants.id',
        },
      },
      performedByUser: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'inventory_transactions.performedBy',
          to: 'users.id',
        },
      },
    };
  }
}
