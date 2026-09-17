import { Transaction } from 'objection';
import { Inventory } from './inventory.model';
import { InventoryTransaction } from './inventoryTransaction.model';
import { Product } from '../products/product.model';
import { ProductVariant } from '../products/productVariant.model';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { getPagination, buildPaginatedResult } from '../../utils/pagination';
import type {
  AdjustStockInput,
  InventoryQueryInput,
  TransactionQueryInput,
} from './inventory.validation';

const DEFAULT_STORE_ID = '00000000-0000-0000-0000-000000000001';

export class InventoryService {
  // ─── UPSERT (used by product creation) ──────────
  static async upsertForVariant(
    params: {
      productId: string;
      variantId?: string;
      storeId?: string;
      quantity: number;
      reorderLevel?: number;
    },
    trx?: Transaction
  ): Promise<Inventory> {
    const { productId, variantId, quantity, reorderLevel } = params;
    const storeId = params.storeId || DEFAULT_STORE_ID;

    let existing: Inventory | undefined;

    if (variantId) {
      existing = await Inventory.query(trx)
        .where({ productId, variantId, storeId })
        .first();
    } else {
      existing = await Inventory.query(trx)
        .where({ productId, storeId })
        .whereNull('variantId')
        .first();
    }

    if (existing) {
      const previousQty = existing.quantity;
      const updated = await Inventory.query(trx).patchAndFetchById(existing.id, {
        quantity,
        availableQuantity: quantity - existing.reservedQuantity,
      });

      await InventoryTransaction.query(trx).insert({
        productId,
        variantId,
        type: 'ADJUSTMENT',
        quantity: quantity - previousQty,
        previousQuantity: previousQty,
        newQuantity: quantity,
        reason: 'Inventory upsert via product management',
      });

      return updated;
    }

    const inventory = await Inventory.query(trx).insert({
      productId,
      variantId,
      storeId,
      quantity,
      reservedQuantity: 0,
      availableQuantity: quantity,
      reorderLevel: reorderLevel ?? 10,
    });

    await InventoryTransaction.query(trx).insert({
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

  // ─── GET BY PRODUCT ─────────────────────────────
  static async getByProduct(productId: string) {
    const product = await Product.query().findById(productId);
    if (!product) throw new NotFoundError('Product');

    const inventory = await Inventory.query()
      .where('productId', productId)
      .withGraphFetched('variant');

    return { product: { id: product.id, name: product.name }, inventory };
  }

  // ─── GET BY VARIANT ─────────────────────────────
  static async getByVariant(variantId: string) {
    const variant = await ProductVariant.query()
      .findById(variantId)
      .withGraphFetched('product');

    if (!variant) throw new NotFoundError('Product variant');

    const inventory = await Inventory.query()
      .where('variantId', variantId)
      .first();

    if (!inventory) throw new NotFoundError('Inventory record');

    return { variant, inventory };
  }

  // ─── ADJUST STOCK (admin only, logs transaction) ─
  static async adjustStock(
    variantId: string | null,
    input: AdjustStockInput,
    userId?: string
  ) {
    const { quantity, type, reason } = input;

    return await Inventory.transaction(async (trx) => {
      // Find inventory row with row lock
      let inventory: Inventory | undefined;

      if (variantId) {
        const variant = await ProductVariant.query(trx).findById(variantId);
        if (!variant) throw new NotFoundError('Variant');

        inventory = await Inventory.query(trx)
          .where('variantId', variantId)
          .forUpdate()
          .first();
      }

      if (!inventory) throw new NotFoundError('Inventory record');

      const previousQty = inventory.quantity;
      const newQty = previousQty + quantity;

      if (newQty < 0) {
        throw new BadRequestError(
          `Cannot adjust: would result in negative stock (${newQty})`
        );
      }

      if (newQty < inventory.reservedQuantity) {
        throw new BadRequestError(
          `Cannot adjust below reserved quantity (${inventory.reservedQuantity})`
        );
      }

      // Update inventory
      const updated = await Inventory.query(trx).patchAndFetchById(inventory.id, {
        quantity: newQty,
        availableQuantity: newQty - inventory.reservedQuantity,
      });

      // Log transaction
      await InventoryTransaction.query(trx).insert({
        productId: inventory.productId,
        variantId: inventory.variantId,
        type,
        quantity,
        previousQuantity: previousQty,
        newQuantity: newQty,
        performedBy: userId,
        reason: reason || `Manual ${type.toLowerCase()} adjustment`,
      });

      return updated;
    });
  }

  // ─── LIST ALL INVENTORY ─────────────────────────
  static async findAll(query: InventoryQueryInput) {
    const { page, limit, offset, sortBy, sortOrder } = getPagination(query);

    let qb = Inventory.query();

    if (query.productId) qb = qb.where('productId', query.productId);
    if (query.variantId) qb = qb.where('variantId', query.variantId);

    if (query.lowStock) {
      qb = qb.whereRaw('quantity <= "reorderLevel"');
    }

    const total = await qb.clone().resultSize();

    const data = await qb
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset)
      .withGraphFetched('[product, variant]');

    return buildPaginatedResult(data, total, page, limit);
  }

  // ─── GET LOW STOCK ITEMS ────────────────────────
  static async getLowStock() {
    const data = await Inventory.query()
      .whereRaw('quantity <= "reorderLevel"')
      .withGraphFetched('[product, variant]')
      .orderBy('quantity', 'asc');

    return data;
  }

  // ─── TRANSACTION HISTORY ────────────────────────
  static async findTransactions(query: TransactionQueryInput) {
    const { page, limit, offset } = getPagination(query);

    let qb = InventoryTransaction.query();

    if (query.productId) qb = qb.where('productId', query.productId);
    if (query.variantId) qb = qb.where('variantId', query.variantId);
    if (query.type) qb = qb.where('type', query.type);
    if (query.startDate) qb = qb.where('createdAt', '>=', query.startDate);
    if (query.endDate) qb = qb.where('createdAt', '<=', query.endDate);

    const total = await qb.clone().resultSize();

    const data = await qb
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .withGraphFetched('[product, variant]');

    return buildPaginatedResult(data, total, page, limit);
  }

  // ─── DELETE HELPERS ─────────────────────────────
  static async deleteByVariant(variantId: string) {
    await Inventory.query().where('variantId', variantId).delete();
  }

  static async deleteByProduct(productId: string) {
    await Inventory.query().where('productId', productId).delete();
  }
}