import { Inventory } from './inventory.model';
import { InventoryTransaction } from './inventoryTransaction.model';

export class InventoryService {
  /**
   * Create or update inventory for a product/variant.
   * Always keeps availableQuantity = quantity - reservedQuantity in sync.
   */
  static async upsertForVariant(params: {
    productId: string;
    variantId?: string;
    storeId?: string;
    quantity: number;
    reorderLevel?: number;
  }): Promise<Inventory> {
    const { productId, variantId, quantity, reorderLevel } = params;
    const storeId = params.storeId || '00000000-0000-0000-0000-000000000001';

    let existing: Inventory | undefined;

    if (variantId) {
      existing = await Inventory.query()
        .where({ productId, variantId, storeId })
        .first();
    } else {
      existing = await Inventory.query()
        .where({ productId, storeId })
        .whereNull('variantId')
        .first();
    }

    if (existing) {
      const previousQty = existing.quantity;
      const newQty = quantity;

      const updated = await Inventory.query().patchAndFetchById(existing.id, {
        quantity: newQty,
        availableQuantity: newQty - existing.reservedQuantity,
      });

      // Log the adjustment
      await InventoryTransaction.query().insert({
        productId,
        variantId,
        type: 'ADJUSTMENT',
        quantity: newQty - previousQty,
        previousQuantity: previousQty,
        newQuantity: newQty,
        reason: 'Inventory upsert via product management',
      });

      return updated;
    }

    // Create new
    const inventory = await Inventory.query().insert({
      productId,
      variantId,
      storeId,
      quantity,
      reservedQuantity: 0,
      availableQuantity: quantity,
      reorderLevel: reorderLevel ?? 10,
    });

    await InventoryTransaction.query().insert({
      productId,
      variantId,
      type: 'STOCK_IN',
      quantity,
      previousQuantity: 0,
      newQuantity: quantity,
      reason: 'Initial stock setup',
    });

    return inventory;
  }

  /**
   * Get inventory for a product (with variants).
   */
  static async getByProduct(productId: string) {
    return Inventory.query().where('productId', productId);
  }

  /**
   * Get inventory for a specific variant.
   */
  static async getByVariant(variantId: string) {
    return Inventory.query().where('variantId', variantId).first();
  }

  /**
   * Delete inventory when variant is deleted.
   */
  static async deleteByVariant(variantId: string) {
    await Inventory.query().where('variantId', variantId).delete();
  }

  /**
   * Delete all inventory for a product.
   */
  static async deleteByProduct(productId: string) {
    await Inventory.query().where('productId', productId).delete();
  }
}