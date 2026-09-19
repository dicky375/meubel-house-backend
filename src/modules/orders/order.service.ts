import { Transaction } from 'objection';
import { Order } from './order.model';
import { Cart } from '../cart/cart.model';
import { Inventory } from '../inventory/inventory.model';
import { InventoryTransaction } from '../inventory/inventoryTransaction.model';
import { Product } from '../products/product.model';
import { ProductVariant } from '../products/productVariant.model';
import { Payment } from '../payments/payment.model';
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

interface CartItem {
  productId: string;
  variantId?: string;
  productName: string;
  variantLabel?: string;
  sku: string;
  image?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

const DEFAULT_STORE_ID = '00000000-0000-0000-0000-000000000001';

export class OrderService {
  // ─── CHECKOUT ───────────────────────────────────
  static async checkout(userId: string, input: CheckoutInput): Promise<Order> {
    return await Order.transaction(async (trx) => {
      // 1. Load cart
      const cart = await Cart.query(trx).where('userId', userId).first();
      if (!cart) throw new BadRequestError('Cart not found');

      const cartItems = this.parseCartItems(cart.items);
      if (cartItems.length === 0) {
        throw new BadRequestError('Cart is empty');
      }

      // 2. Validate products + lock inventory + re-derive prices
      const orderItems: Order['items'] = [];
      const inventoryLocks: { inventory: Inventory; quantity: number }[] = [];

      for (const cartItem of cartItems) {
        // Validate product still active
        const product = await Product.query(trx).findById(cartItem.productId);
        if (!product) throw new NotFoundError(`Product ${cartItem.productName}`);
        if (!product.isActive || !product.isPublished) {
          throw new BadRequestError(
            `Product "${product.name}" is no longer available`
          );
        }

        // Re-derive price from DB (never trust frontend/cart prices)
        let unitPrice = Number(product.price);
        let sku = product.sku;
        let variantLabel: string | undefined;

        if (cartItem.variantId) {
          const variant = await ProductVariant.query(trx)
            .where({ id: cartItem.variantId, productId: cartItem.productId })
            .first();

          if (!variant) {
            throw new BadRequestError(
              `Variant for "${product.name}" no longer exists`
            );
          }
          unitPrice = Number(variant.price);
          sku = variant.sku;
          variantLabel = [variant.colour, variant.size, variant.material]
            .filter(Boolean)
            .join(' / ');
        }

        // Lock the inventory row
        const inventoryQuery = Inventory.query(trx)
          .where('productId', cartItem.productId)
          .where('storeId', DEFAULT_STORE_ID);

        if (cartItem.variantId) {
          inventoryQuery.where('variantId', cartItem.variantId);
        } else {
          inventoryQuery.whereNull('variantId');
        }

        const inventory = await inventoryQuery.forUpdate().first();
        if (!inventory) {
          throw new BadRequestError(
            `No inventory record for "${product.name}"`
          );
        }

        // Check available stock
        const available =
          inventory.quantity - inventory.reservedQuantity;
        if (available < cartItem.quantity) {
          throw new BadRequestError(
            `Insufficient stock for "${product.name}"${
              variantLabel ? ` (${variantLabel})` : ''
            }. Only ${available} available.`
          );
        }

        inventoryLocks.push({ inventory, quantity: cartItem.quantity });

        // Build order item snapshot
        orderItems.push({
          productId: cartItem.productId,
          variantId: cartItem.variantId,
          productName: product.name,
          variantLabel,
          sku,
          image: product.images?.[0],
          quantity: cartItem.quantity,
          unitPrice,
          discount: 0,
          subtotal: cartItem.quantity * unitPrice,
        });
      }

      // 3. Calculate totals
      const subtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);
      const discount = 0; // promotions later
      const deliveryFee = input.deliveryFee || 0;
      const tax = input.tax || 0;
      const total = subtotal - discount + deliveryFee + tax;

      // 4. Generate order number
      const orderNumber = await this.generateOrderNumber(trx);

      // 5. Create Order
      const order = await Order.query(trx).insert({
        orderNumber,
        customerId: userId,
        salesChannel: 'ONLINE',
        items: orderItems as any,
        subtotal,
        discount,
        deliveryFee,
        tax,
        total,
        currency: 'USD',
        paymentStatus: 'PENDING',
        orderStatus: 'PENDING',
        deliveryStatus: 'PENDING',
        shippingAddress: input.shippingAddress as any,
        billingAddress: (input.billingAddress || input.shippingAddress) as any,
        customerNote: input.customerNote,
        createdBy: userId,
      } as any);

      // 6. Reserve inventory + log transactions
      for (const { inventory, quantity } of inventoryLocks) {
        const newReserved = inventory.reservedQuantity + quantity;
        const newAvailable = inventory.quantity - newReserved;

        await Inventory.query(trx).patchAndFetchById(inventory.id, {
          reservedQuantity: newReserved,
          availableQuantity: newAvailable,
        });

        await InventoryTransaction.query(trx).insert({
          productId: inventory.productId,
          variantId: inventory.variantId,
          type: 'RESERVATION',
          quantity,
          previousQuantity: inventory.quantity - inventory.reservedQuantity,
          newQuantity: newAvailable,
          referenceType: 'Order',
          referenceId: order.id,
          performedBy: userId,
          reason: `Stock reserved for order ${orderNumber}`,
        } as any);
      }

      // 7. Create Payment record (PENDING — no provider yet)
      await Payment.query(trx).insert({
        orderId: order.id,
        userId,
        provider: 'MANUAL',
        transactionReference: `TXN-${orderNumber}`,
        amount: total,
        currency: 'USD',
        status: 'PENDING',
        amountPaid: 0,
        amountDue: total,
      } as any);

      // 8. Clear cart
      await Cart.query(trx).patchAndFetchById(cart.id, {
        items: [] as any,
        subtotal: 0,
        discount: 0,
        total: 0,
      });

      return order;
    });
  }

  // ─── GET MY ORDERS ──────────────────────────────
  static async getMyOrders(userId: string, query: OrderQueryInput) {
    const { page, limit, offset, sortBy, sortOrder } = getPagination(query);

    let qb = Order.query().where('customerId', userId);

    if (query.orderStatus) qb = qb.where('orderStatus', query.orderStatus);
    if (query.paymentStatus) qb = qb.where('paymentStatus', query.paymentStatus);

    const total = await qb.clone().resultSize();

    const data = await qb
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset)
      .withGraphFetched('payments');

    return buildPaginatedResult(data, total, page, limit);
  }

  // ─── GET ONE ORDER ──────────────────────────────
  static async getById(orderId: string, userId: string, isAdmin: boolean) {
    const order = await Order.query()
      .findById(orderId)
      .withGraphFetched('[customer, salesRep, payments]');

    if (!order) throw new NotFoundError('Order');

    // Customers can only see their own orders
    if (!isAdmin && order.customerId !== userId) {
      throw new ForbiddenError('You cannot view this order');
    }

    return order;
  }

  // ─── LIST ALL ORDERS (admin) ────────────────────
  static async findAll(query: OrderQueryInput) {
    const { page, limit, offset, sortBy, sortOrder } = getPagination(query);

    let qb = Order.query();

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
      .offset(offset)
      .withGraphFetched('[customer, salesRep, payments]');

    return buildPaginatedResult(data, total, page, limit);
  }

  // ─── UPDATE ORDER STATUS (admin) ────────────────
  static async updateStatus(orderId: string, input: UpdateOrderStatusInput) {
    const order = await Order.query().findById(orderId);
    if (!order) throw new NotFoundError('Order');

    // Prevent invalid transitions
    if (['CANCELLED', 'REFUNDED', 'COMPLETED'].includes(order.orderStatus)) {
      throw new BadRequestError(
        `Cannot change status of a ${order.orderStatus} order`
      );
    }

    const updated = await Order.query().patchAndFetchById(orderId, {
      orderStatus: input.orderStatus,
    });

    // On cancel/return: release inventory
    if (['CANCELLED', 'RETURNED'].includes(input.orderStatus)) {
      await this.releaseOrderInventory(order);
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

    await this.releaseOrderInventory(order);
    return updated;
  }

  // ─── HELPERS ────────────────────────────────────
  private static parseCartItems(raw: any): CartItem[] {
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
    const prefix = `MH-${yyyymmdd}-`;

    const lastOrder = await Order.query(trx)
      .where('orderNumber', 'like', `${prefix}%`)
      .orderBy('orderNumber', 'desc')
      .first();

    let sequence = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.orderNumber.split('-').pop()!, 10);
      sequence = lastSeq + 1;
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }

  private static async releaseOrderInventory(order: Order) {
    const items = (order.items as any[]) || [];

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

        const newReserved = Math.max(
          0,
          inventory.reservedQuantity - item.quantity
        );
        const newAvailable = inventory.quantity - newReserved;

        await Inventory.query(trx).patchAndFetchById(inventory.id, {
          reservedQuantity: newReserved,
          availableQuantity: newAvailable,
        });

        await InventoryTransaction.query(trx).insert({
          productId: item.productId,
          variantId: item.variantId,
          type: 'RELEASE',
          quantity: item.quantity,
          previousQuantity: inventory.quantity - inventory.reservedQuantity,
          newQuantity: newAvailable,
          referenceType: 'Order',
          referenceId: order.id,
          reason: `Release on ${order.orderStatus} for ${order.orderNumber}`,
        } as any);
      }
    });
  }
}