import { Transaction } from 'objection';
import { Order } from './order.model';
import { Cart } from '../cart/cart.model';
import { Product } from '../products/product.model';
import { ProductVariant } from '../products/productVariant.model';
import { Inventory } from '../inventory/inventory.model';
import { NotificationService } from '../notifications/notification.service';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '../../utils/errors';
import { getPagination, buildPaginatedResult } from '../../utils/pagination';
import type {
  CheckoutInput,
  UpdateOrderStatusInput,
  OrderQueryInput,
} from './order.validation';

const DEFAULT_STORE_ID = '00000000-0000-0000-0000-000000000001';

export class OrderService {
  // ─── CHECKOUT (customer) ────────────────────────
  static async checkout(userId: string, input: CheckoutInput) {
    return await Order.transaction(async (trx) => {
      // 1. Load cart
      const cart = await Cart.query(trx).where('userId', userId).first();
      if (!cart) throw new NotFoundError('Cart');

      const items = this.parseItems(cart.items);
      if (items.length === 0) throw new BadRequestError('Cart is empty');

      // 2. Validate + price products (never trust frontend)
      const pricedItems: any[] = [];
      let subtotal = 0;
      const inventoryLocks: { inventory: Inventory; quantity: number }[] = [];

      for (const item of items) {
        const product = await Product.query(trx).findById(item.productId);
        if (!product) throw new BadRequestError(`Product ${item.productId} not found`);
        if (!product.isActive || !product.isPublished) {
          throw new BadRequestError(`Product "${product.name}" is not available`);
        }

        let variant: ProductVariant | undefined;
        let unitPrice = Number(product.price);
        let sku = product.sku;

        if (item.variantId) {
          variant = await ProductVariant.query(trx).findById(item.variantId);
          if (!variant) throw new BadRequestError('Variant not found');
          if (variant.productId !== product.id) {
            throw new BadRequestError('Variant does not belong to product');
          }
          unitPrice = Number(variant.price);
          sku = variant.sku;
        }

        const invQuery = Inventory.query(trx)
          .where('productId', product.id)
          .where('storeId', DEFAULT_STORE_ID);

        if (item.variantId) {
          invQuery.where('variantId', item.variantId);
        } else {
          invQuery.whereNull('variantId');
        }

        const inventory = await invQuery.forUpdate().first();
        if (!inventory) {
          throw new BadRequestError(`No inventory record for "${product.name}"`);
        }

        const available = inventory.quantity - inventory.reservedQuantity;
        if (available < item.quantity) {
          throw new BadRequestError(
            `"${product.name}" is out of stock. Available: ${available}`
          );
        }

        const itemSubtotal = unitPrice * item.quantity;
        subtotal += itemSubtotal;

        pricedItems.push({
          productId: product.id,
          variantId: item.variantId || null,
          productName: product.name,
          sku,
          image: (product.images && product.images[0]) || null,
          quantity: item.quantity,
          unitPrice,
          discount: 0,
          subtotal: itemSubtotal,
        });

        inventoryLocks.push({ inventory, quantity: item.quantity });
      }

      // 3. Compute totals
      const deliveryFee = 0;
      const tax = 0;
      const discount = 0;
      const total = subtotal + deliveryFee + tax - discount;

      // 4. Generate order number
      const orderNumber = await this.generateOrderNumber(trx);

      // 5. Insert order
      const orderInsert = await trx.raw(
        `INSERT INTO orders (
          "orderNumber", "customerId", "salesChannel",
          items, subtotal, discount, "deliveryFee", tax, total,
          currency, "paymentStatus", "orderStatus", "deliveryStatus",
          "shippingAddress", "billingAddress", "customerNote", "createdBy",
          "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        RETURNING id`,
        [
          orderNumber,
          userId,
          'ONLINE',
          JSON.stringify(pricedItems),
          subtotal,
          discount,
          deliveryFee,
          tax,
          total,
          'USD',
          'PENDING',
          'PENDING',
          'PENDING',
          input.shippingAddress ? JSON.stringify(input.shippingAddress) : null,
          input.billingAddress ? JSON.stringify(input.billingAddress) : null,
          input.customerNote || null,
          userId,
        ]
      );

      const orderId = orderInsert.rows[0].id;

      // 6. Reserve inventory + log transactions
      for (const { inventory, quantity } of inventoryLocks) {
        const prevAvailable = inventory.quantity - inventory.reservedQuantity;
        const newReserved = inventory.reservedQuantity + quantity;
        const newAvailable = inventory.quantity - newReserved;

        await Inventory.query(trx).patchAndFetchById(inventory.id, {
          reservedQuantity: newReserved,
          availableQuantity: newAvailable,
        });

        await trx.raw(
          `INSERT INTO inventory_transactions (
            "productId", "variantId", type, quantity,
            "previousQuantity", "newQuantity", "referenceType",
            "referenceId", "performedBy", reason
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            inventory.productId,
            inventory.variantId || null,
            'RESERVATION',
            quantity,
            prevAvailable,
            newAvailable,
            'Order',
            orderId,
            userId,
            `Stock reserved for order ${orderNumber}`,
          ]
        );
      }

      // 7. Create Payment record (PENDING)
      await trx.raw(
        `INSERT INTO payments (
          "orderId", "userId", provider, "transactionReference",
          amount, currency, status, "amountPaid", "amountDue",
          "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          orderId,
          userId,
          'MANUAL',
          `TXN-${orderNumber}`,
          total,
          'USD',
          'PENDING',
          0,
          total,
        ]
      );

      // 8. Clear cart
      await Cart.query(trx).patchAndFetchById(cart.id, {
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
      });

      return { orderId, orderNumber, total };
    });
  }

  // ─── LIST ALL (admin / sales / filtered) ────────
  static async findAll(query: OrderQueryInput, userId?: string, role?: string) {
    const { page, limit, offset } = getPagination(query);
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    let qb = Order.query();

    if (role === 'CUSTOMER' && userId) {
      qb = qb.where('customerId', userId);
    } else if (role === 'SALES_REP' && userId) {
      qb = qb.where('salesRepId', userId);
    }

    if (query.orderStatus) qb = qb.where('orderStatus', query.orderStatus);
    if (query.paymentStatus) qb = qb.where('paymentStatus', query.paymentStatus);
    if (query.salesChannel) qb = qb.where('salesChannel', query.salesChannel);
    if (query.customerId) qb = qb.where('customerId', query.customerId);

    if (query.search) {
      qb = qb.where('orderNumber', 'ilike', `%${query.search}%`);
    }

    const total = await qb.clone().resultSize();

    const data = await qb
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset);

    return buildPaginatedResult(data, total, page, limit);
  }

  // ─── GET MY ORDERS (customer) ───────────────────
  static async getMyOrders(userId: string, query: OrderQueryInput) {
    return this.findAll(query, userId, 'CUSTOMER');
  }

  // ─── GET BY ID ──────────────────────────────────
  static async findById(id: string, userId?: string, role?: string) {
    const order = await Order.query().findById(id);
    if (!order) throw new NotFoundError('Order');

    if (
      role === 'CUSTOMER' &&
      order.customerId &&
      order.customerId !== userId
    ) {
      throw new ForbiddenError('Not your order');
    }

    return order;
  }

  // ─── GET BY ID (controller alias) ───────────────
  static async getById(id: string, userId?: string, role?: string) {
    return this.findById(id, userId, role);
  }

  // ─── UPDATE STATUS (admin) ──────────────────────
  static async updateStatus(orderId: string, input: UpdateOrderStatusInput) {
    const order = await Order.query().findById(orderId);
    if (!order) throw new NotFoundError('Order');

    if (['CANCELLED', 'REFUNDED', 'COMPLETED'].includes(order.orderStatus)) {
      throw new BadRequestError(
        `Cannot change status of a ${order.orderStatus} order`
      );
    }

    const prevStatus = order.orderStatus;
    const newStatus = input.orderStatus;

    const updated = await Order.query().patchAndFetchById(orderId, {
      orderStatus: newStatus,
    });

    // CANCELLED or RETURNED → release reservation
    if (['CANCELLED', 'RETURNED'].includes(newStatus)) {
      await this.releaseOrderInventory(updated);
    }

    // DELIVERED → commit reservation (permanently deduct stock)
    if (
      newStatus === 'DELIVERED' &&
      !['CANCELLED', 'RETURNED'].includes(prevStatus)
    ) {
      await this.commitOrderInventory(updated);
    }

    // Notify customer (non-blocking)
    if (order.customerId) {
      NotificationService.notifyOrderStatusChange(
        order.customerId,
        order.id,
        order.orderNumber,
        newStatus
      ).catch((err) =>
        console.error('[Orders] Status notification failed:', err.message)
      );
    }

    return updated;
  }

  // ─── CANCEL ORDER (customer) ────────────────────
  static async cancelOrder(orderId: string, userId: string) {
    const order = await Order.query().findById(orderId);
    if (!order) throw new NotFoundError('Order');
    if (order.customerId !== userId) throw new ForbiddenError('Not your order');
    if (order.orderStatus !== 'PENDING') {
      throw new BadRequestError('Only PENDING orders can be cancelled');
    }

    const updated = await Order.query().patchAndFetchById(orderId, {
      orderStatus: 'CANCELLED',
    });

    await this.releaseOrderInventory(updated);
    return updated;
  }

  // ─── HELPERS ────────────────────────────────────
  private static parseItems(raw: any): any[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private static async generateOrderNumber(trx: Transaction): Promise<string> {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');

    const result = await trx.raw(
      `SELECT COUNT(*)::int as count FROM orders
       WHERE "orderNumber" LIKE ?`,
      [`MH-${yyyymmdd}-%`]
    );

    const count = result.rows[0].count || 0;
    const nextNum = String(count + 1).padStart(4, '0');
    return `MH-${yyyymmdd}-${nextNum}`;
  }

  // ─── COMMIT INVENTORY (delivered) ───────────────
  private static async commitOrderInventory(order: Order) {
    const items = this.parseItems(order.items);

    await Order.transaction(async (trx) => {
      for (const item of items) {
        const invQuery = Inventory.query(trx)
          .where('productId', item.productId)
          .where('storeId', DEFAULT_STORE_ID);

        if (item.variantId) {
          invQuery.where('variantId', item.variantId);
        } else {
          invQuery.whereNull('variantId');
        }

        const inventory = await invQuery.forUpdate().first();
        if (!inventory) continue;

        if (inventory.reservedQuantity < item.quantity) {
          console.warn(
            `[Orders] Commit warning: ${item.quantity} requested but only ${inventory.reservedQuantity} reserved for order ${order.orderNumber}`
          );
          continue;
        }

        const prevQty = inventory.quantity;
        const prevReserved = inventory.reservedQuantity;
        const newQty = prevQty - item.quantity;
        const newReserved = prevReserved - item.quantity;

        await Inventory.query(trx).patchAndFetchById(inventory.id, {
          quantity: newQty,
          reservedQuantity: newReserved,
          availableQuantity: newQty - newReserved,
        });

        await trx.raw(
          `INSERT INTO inventory_transactions (
            "productId", "variantId", type, quantity,
            "previousQuantity", "newQuantity", "referenceType",
            "referenceId", reason
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.productId,
            item.variantId || null,
            'SALE',
            -item.quantity,
            prevQty,
            newQty,
            'Order',
            order.id,
            `Commit on ${order.orderStatus} for ${order.orderNumber}`,
          ]
        );
      }
    });
  }

  // ─── RELEASE INVENTORY (cancelled/returned) ─────
  private static async releaseOrderInventory(order: Order) {
    const items = this.parseItems(order.items);

    await Order.transaction(async (trx) => {
      for (const item of items) {
        const invQuery = Inventory.query(trx)
          .where('productId', item.productId)
          .where('storeId', DEFAULT_STORE_ID);

        if (item.variantId) {
          invQuery.where('variantId', item.variantId);
        } else {
          invQuery.whereNull('variantId');
        }

        const inventory = await invQuery.forUpdate().first();
        if (!inventory) continue;

        const prevAvailable = inventory.quantity - inventory.reservedQuantity;
        const newReserved = Math.max(
          0,
          inventory.reservedQuantity - item.quantity
        );
        const newAvailable = inventory.quantity - newReserved;

        await Inventory.query(trx).patchAndFetchById(inventory.id, {
          reservedQuantity: newReserved,
          availableQuantity: newAvailable,
        });

        await trx.raw(
          `INSERT INTO inventory_transactions (
            "productId", "variantId", type, quantity,
            "previousQuantity", "newQuantity", "referenceType",
            "referenceId", reason
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.productId,
            item.variantId || null,
            'RELEASE',
            item.quantity,
            prevAvailable,
            newAvailable,
            'Order',
            order.id,
            `Release on ${order.orderStatus} for ${order.orderNumber}`,
          ]
        );
      }
    });
  }
}
