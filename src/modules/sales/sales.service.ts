import { Order } from '../orders/order.model';
import { Product } from '../products/product.model';
import { ProductVariant } from '../products/productVariant.model';
import { Inventory } from '../inventory/inventory.model';
import { User } from '../users/user.model';
import { Category } from '../categories/category.model';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
} from '../../utils/errors';
import { getPagination, buildPaginatedResult } from '../../utils/pagination';
import type {
  CreateInStoreSaleInput,
  SalesQueryInput,
  ProductSearchInput,
} from './sales.validation';

const DEFAULT_STORE_ID = '00000000-0000-0000-0000-000000000001';
const MAX_DISCOUNT_PERCENT = 20; // Sales reps can discount up to 20%

export class SalesService {
  // ─── PRODUCT SEARCH (for reps) ──────────────────
  static async searchProducts(query: ProductSearchInput) {
    const { page, limit, offset } = getPagination(query);

    let qb = Product.query()
      .where('isActive', true)
      .where('isPublished', true)
      .withGraphFetched('[category, variants, inventory]');

    if (query.q) {
      qb = qb.where((builder) => {
        builder
          .where('name', 'ilike', `%${query.q}%`)
          .orWhere('sku', 'ilike', `%${query.q}%`)
          .orWhere('brand', 'ilike', `%${query.q}%`);
      });
    }

    if (query.sku) qb = qb.where('sku', 'ilike', `%${query.sku}%`);
    if (query.categoryId) qb = qb.where('categoryId', query.categoryId);
    if (query.brand) qb = qb.where('brand', 'ilike', `%${query.brand}%`);

    const total = await qb.clone().resultSize();

    const data = await qb.orderBy('name', 'asc').limit(limit).offset(offset);

    // Add computed available stock summary
    const enriched = data.map((p) => {
      const variants = (p as any).variants || [];
      const inventory = (p as any).inventory || [];
      const totalStock = inventory.reduce(
        (sum: number, i: any) => sum + i.availableQuantity,
        0
      );
      return {
        ...p,
        variants,
        inventory,
        totalStock,
      };
    });

    return buildPaginatedResult(enriched, total, page, limit);
  }

  // ─── LIVE STOCK CHECK ───────────────────────────
  static async checkStock(productId: string) {
    const product = await Product.query()
      .findById(productId)
      .withGraphFetched('[variants, inventory]');

    if (!product) throw new NotFoundError('Product');

    const variants = (product as any).variants || [];
    const inventory = (product as any).inventory || [];

    const stockDetails = variants.map((v: any) => {
      const inv = inventory.find((i: any) => i.variantId === v.id);
      return {
        variantId: v.id,
        sku: v.sku,
        colour: v.colour,
        size: v.size,
        material: v.material,
        price: v.price,
        availableStock: inv ? inv.availableQuantity : 0,
      };
    });

    // Simple product (no variants)
    if (stockDetails.length === 0) {
      const inv = inventory.find((i: any) => !i.variantId);
      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        hasVariants: false,
        availableStock: inv ? inv.availableQuantity : 0,
        variants: [],
      };
    }

    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      hasVariants: true,
      variants: stockDetails,
    };
  }

  // ─── CUSTOMER SEARCH ────────────────────────────
  static async searchCustomers(search: string) {
    const customers = await User.query()
      .where('role', 'CUSTOMER')
      .where((builder) => {
        builder
          .where('email', 'ilike', `%${search}%`)
          .orWhere('firstName', 'ilike', `%${search}%`)
          .orWhere('lastName', 'ilike', `%${search}%`)
          .orWhere('phone', 'ilike', `%${search}%`);
      })
      .limit(20);

    return customers;
  }

  // ─── CREATE IN-STORE SALE ───────────────────────
  static async createSale(
    salesRepId: string,
    input: CreateInStoreSaleInput
  ): Promise<Order> {
    // Validate sales rep
    const salesRep = await User.query().findById(salesRepId);
    if (!salesRep || (salesRep.role !== 'SALES_REP' && salesRep.role !== 'ADMIN')) {
      throw new ForbiddenError('Only sales reps can create in-store sales');
    }

    // Validate customer (if provided)
    let customerId: string | null = null;
    let walkInInfo: any = null;

    if (input.customerId) {
      const customer = await User.query().findById(input.customerId);
      if (!customer) throw new NotFoundError('Customer');
      customerId = customer.id;
    } else if (input.walkInCustomer) {
      walkInInfo = input.walkInCustomer;
    } else {
      // Anonymous walk-in is allowed
      walkInInfo = { firstName: 'Walk-in', lastName: 'Customer' };
    }

    return await Order.transaction(async (trx) => {
      // 1. Process each item: lock inventory, validate stock, snapshot
      const orderItems: any[] = [];
      const inventoryLocks: { inventory: Inventory; quantity: number }[] = [];
      let subtotal = 0;

      for (const item of input.items) {
        const product = await Product.query(trx).findById(item.productId);
        if (!product) throw new NotFoundError(`Product ${item.productId}`);
        if (!product.isActive || !product.isPublished) {
          throw new BadRequestError(`Product "${product.name}" is not available`);
        }

        let unitPrice = Number(product.price);
        let sku = product.sku;
        let variantLabel: string | undefined;

        if (item.variantId) {
          const variant = await ProductVariant.query(trx)
            .where({ id: item.variantId, productId: item.productId })
            .first();
          if (!variant) {
            throw new BadRequestError(
              `Variant for "${product.name}" does not exist`
            );
          }
          unitPrice = Number(variant.price);
          sku = variant.sku;
          variantLabel = [variant.colour, variant.size, variant.material]
            .filter(Boolean)
            .join(' / ');
        }

        // Sales rep price override guardrail
        let finalUnitPrice = unitPrice;
        if (item.unitPrice !== undefined && item.unitPrice !== unitPrice) {
          const maxDiscount = unitPrice * (MAX_DISCOUNT_PERCENT / 100);
          const minPrice = unitPrice - maxDiscount;
          if (item.unitPrice < minPrice) {
            throw new BadRequestError(
              `Price override for "${product.name}" exceeds ${MAX_DISCOUNT_PERCENT}% discount limit. Min: $${minPrice.toFixed(2)}`
            );
          }
          finalUnitPrice = item.unitPrice;
        }

        // Lock inventory row
        const invQuery = Inventory.query(trx)
          .where('productId', item.productId)
          .where('storeId', DEFAULT_STORE_ID);

        if (item.variantId) {
          invQuery.where('variantId', item.variantId);
        } else {
          invQuery.whereNull('variantId');
        }

        const inventory = await invQuery.forUpdate().first();
        if (!inventory) {
          throw new BadRequestError(
            `No inventory record for "${product.name}"`
          );
        }

        const available = inventory.quantity - inventory.reservedQuantity;
        if (available < item.quantity) {
          throw new BadRequestError(
            `Insufficient stock for "${product.name}"${
              variantLabel ? ` (${variantLabel})` : ''
            }. Only ${available} available.`
          );
        }

        inventoryLocks.push({ inventory, quantity: item.quantity });

        const lineSubtotal = item.quantity * finalUnitPrice - (item.discount || 0);
        subtotal += lineSubtotal;

        orderItems.push({
          productId: item.productId,
          variantId: item.variantId || null,
          productName: product.name,
          variantLabel: variantLabel || null,
          sku,
          image: product.images?.[0] || null,
          quantity: item.quantity,
          unitPrice: finalUnitPrice,
          discount: item.discount || 0,
          subtotal: lineSubtotal,
        });
      }

      // 2. Calculate totals
      const discount = input.discount || 0;
      const tax = input.tax || 0;
      const deliveryFee = 0; // in-store = no delivery
      const total = subtotal - discount + tax;

      // 3. Validate payment
      if (input.payment.amountPaid < total) {
        throw new BadRequestError(
          `Payment amount ($${input.payment.amountPaid.toFixed(2)}) is less than total ($${total.toFixed(2)})`
        );
      }

      const changeGiven = input.payment.amountPaid - total;

      // 4. Generate order number with IN-STORE prefix
      const orderNumber = await this.generateOrderNumber(trx, 'STORE');

      // 5. Create Order
      const orderInsert = await trx.raw(
        `INSERT INTO orders (
          "orderNumber", "customerId", "salesChannel", "salesRepId", items,
          subtotal, discount, "deliveryFee", tax, total, currency,
          "paymentStatus", "orderStatus", "deliveryStatus",
          "shippingAddress", "billingAddress", "customerNote", "createdBy"
        ) VALUES (
          ?, ?, ?, ?, ?::jsonb,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?::jsonb, ?::jsonb, ?, ?
        )
        RETURNING id`,
        [
          orderNumber,
          customerId,
          'IN_STORE',
          salesRepId,
          JSON.stringify(orderItems),
          subtotal,
          discount,
          deliveryFee,
          tax,
          total,
          'USD',
          'PAID',  // In-store sales are paid immediately
          'COMPLETED',  // In-store sales complete at point of sale
          'DELIVERED',
          JSON.stringify(walkInInfo || {}),
          JSON.stringify(walkInInfo || {}),
          input.customerNote || null,
          salesRepId,
        ]
      );

      const orderId = orderInsert.rows[0].id;

      // 6. DEDUCT inventory directly (SALE, not RESERVATION)
      for (const { inventory, quantity } of inventoryLocks) {
        const prevQty = inventory.quantity;
        const newQty = prevQty - quantity;
        const newAvailable = newQty - inventory.reservedQuantity;

        await Inventory.query(trx).patchAndFetchById(inventory.id, {
          quantity: newQty,
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
            'SALE',
            -quantity, // negative because stock decreased
            prevQty,
            newQty,
            'Order',
            orderId,
            salesRepId,
            `In-store sale ${orderNumber}`,
          ]
        );
      }

      // 7. Record payment as PAID
      await trx.raw(
        `INSERT INTO payments (
          "orderId", "userId", provider, "transactionReference",
          amount, currency, "paymentMethod", status,
          "amountPaid", "amountDue", metadata, "paidAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, NOW())`,
        [
          orderId,
          customerId,
          'IN_STORE',
          input.payment.transactionReference || `POS-${orderNumber}`,
          total,
          'USD',
          input.payment.method,
          'PAID',
          input.payment.amountPaid,
          0,
          JSON.stringify({
            changeGiven: changeGiven > 0 ? changeGiven : 0,
            notes: input.payment.notes || null,
          }),
        ]
      );

      // 8. Return full order
      const order = await Order.query(trx)
        .findById(orderId)
        .withGraphFetched('[customer, salesRep, payments]');

      if (!order) throw new BadRequestError('Sale creation failed');
      (order as any).items = this.parseItems(order.items);
      (order as any).changeGiven = changeGiven > 0 ? changeGiven : 0;

      return order;
    });
  }

  // ─── MY SALES (sales rep only) ──────────────────
  static async getMySales(salesRepId: string, query: SalesQueryInput) {
    const { page, limit, offset, sortBy, sortOrder } = getPagination(query);

    let qb = Order.query()
      .where('salesRepId', salesRepId)
      .where('salesChannel', 'IN_STORE');

    if (query.orderStatus) qb = qb.where('orderStatus', query.orderStatus);
    if (query.paymentStatus) qb = qb.where('paymentStatus', query.paymentStatus);
    if (query.search) qb = qb.where('orderNumber', 'ilike', `%${query.search}%`);
    if (query.startDate) qb = qb.where('createdAt', '>=', query.startDate);
    if (query.endDate) qb = qb.where('createdAt', '<=', query.endDate);

    const total = await qb.clone().resultSize();

    const data = await qb
      .orderBy(sortBy, sortOrder)
      .limit(limit)
      .offset(offset)
      .withGraphFetched('[customer, payments]');

    data.forEach((o) => ((o as any).items = this.parseItems(o.items)));

    // Also compute summary
    const summary = await Order.query()
      .where('salesRepId', salesRepId)
      .where('salesChannel', 'IN_STORE')
      .select(
        Order.knex().raw('COUNT(*)::int as "totalSales"'),
        Order.knex().raw('COALESCE(SUM(total), 0) as "totalRevenue"'),
        Order.knex().raw('COALESCE(AVG(total), 0) as "avgOrderValue"')
      )
      .first();

    return {
      ...buildPaginatedResult(data, total, page, limit),
      summary,
    };
  }

  // ─── GET SINGLE SALE ────────────────────────────
  static async getSaleById(
    orderId: string,
    salesRepId: string,
    isAdmin: boolean
  ) {
    const order = await Order.query()
      .findById(orderId)
      .withGraphFetched('[customer, salesRep, payments]');

    if (!order) throw new NotFoundError('Sale');
    if (order.salesChannel !== 'IN_STORE') {
      throw new BadRequestError('Not an in-store sale');
    }

    // Sales reps can only see their own sales
    if (!isAdmin && order.salesRepId !== salesRepId) {
      throw new ForbiddenError('You can only view your own sales');
    }

    (order as any).items = this.parseItems(order.items);
    return order;
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

  private static async generateOrderNumber(
    trx: any,
    prefix: 'STORE' | 'WEB'
  ): Promise<string> {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const numberPrefix = prefix === 'STORE' ? `MH-S-${yyyymmdd}-` : `MH-${yyyymmdd}-`;

    const lastOrder = await Order.query(trx)
      .where('orderNumber', 'like', `${numberPrefix}%`)
      .orderBy('orderNumber', 'desc')
      .first();

    let sequence = 1;
    if (lastOrder) {
      const lastSeq = parseInt(lastOrder.orderNumber.split('-').pop()!, 10);
      sequence = lastSeq + 1;
    }

    return `${numberPrefix}${sequence.toString().padStart(4, '0')}`;
  }
}