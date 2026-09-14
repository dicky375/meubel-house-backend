import { Model } from 'objection';

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
}