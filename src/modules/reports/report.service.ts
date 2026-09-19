import { Order } from '../orders/order.model';
import { Inventory } from '../inventory/inventory.model';
import { User } from '../users/user.model';
import { Payment } from '../payments/payment.model';
import type {
  DateRangeInput,
  TimeSeriesInput,
  TopProductsInput,
} from './report.validation';

export class ReportService {
  // ─── HELPER: resolve date range ─────────────────
  private static resolveRange(input: DateRangeInput) {
    const end = input.endDate ? new Date(input.endDate) : new Date();
    const start = input.startDate
      ? new Date(input.startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  // ─── SUMMARY ────────────────────────────────────
  static async getSummary(input: DateRangeInput) {
    const { start, end } = this.resolveRange(input);

    const base = () =>
      Order.query()
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .whereNot('orderStatus', 'CANCELLED');

    const overall: any = await base()
      .select(
        Order.knex().raw('COUNT(*)::int as "orderCount"'),
        Order.knex().raw('COALESCE(SUM(total), 0) as "revenue"'),
        Order.knex().raw('COALESCE(AVG(total), 0) as "avgOrderValue"'),
        Order.knex().raw('COALESCE(SUM("deliveryFee"), 0) as "deliveryFees"'),
        Order.knex().raw('COALESCE(SUM(discount), 0) as "discounts"')
      )
      .first();

    const byChannel: any[] = await base()
      .select(
        'salesChannel',
        Order.knex().raw('COUNT(*)::int as "orderCount"'),
        Order.knex().raw('COALESCE(SUM(total), 0) as "revenue"')
      )
      .groupBy('salesChannel');

    const itemsSold: any = await Order.knex().raw(
      `SELECT
        COALESCE(SUM(
          (SELECT SUM((item->>'quantity')::int)
           FROM jsonb_array_elements(items) AS item)
        ), 0)::int as "itemsSold"
       FROM orders
       WHERE "createdAt" >= ? AND "createdAt" <= ? AND "orderStatus" != 'CANCELLED'`,
      [start, end]
    );

    return {
      dateRange: { start, end },
      overall: {
        orderCount: overall?.orderCount || 0,
        revenue: Number(overall?.revenue || 0).toFixed(2),
        avgOrderValue: Number(overall?.avgOrderValue || 0).toFixed(2),
        deliveryFees: Number(overall?.deliveryFees || 0).toFixed(2),
        discounts: Number(overall?.discounts || 0).toFixed(2),
        itemsSold: itemsSold.rows[0]?.itemsSold || 0,
      },
      byChannel: byChannel.map((r) => ({
        salesChannel: r.salesChannel,
        orderCount: r.orderCount,
        revenue: Number(r.revenue).toFixed(2),
      })),
    };
  }

  // ─── REVENUE OVER TIME ──────────────────────────
  static async getSalesOverTime(input: TimeSeriesInput) {
    const { start, end } = this.resolveRange(input);
    const trunc = input.groupBy || 'day';

    const result: any = await Order.knex().raw(
      `SELECT
        DATE_TRUNC(?, "createdAt") as "period",
        COUNT(*)::int as "orderCount",
        COALESCE(SUM(total), 0) as "revenue",
        COALESCE(AVG(total), 0) as "avgOrderValue"
       FROM orders
       WHERE "createdAt" >= ? AND "createdAt" <= ? AND "orderStatus" != 'CANCELLED'
       GROUP BY "period"
       ORDER BY "period" ASC`,
      [trunc, start, end]
    );

    return {
      dateRange: { start, end },
      groupBy: trunc,
      data: result.rows.map((r: any) => ({
        period: r.period,
        orderCount: r.orderCount,
        revenue: Number(r.revenue).toFixed(2),
        avgOrderValue: Number(r.avgOrderValue).toFixed(2),
      })),
    };
  }

  // ─── TOP PRODUCTS ───────────────────────────────
  static async getTopProducts(input: TopProductsInput) {
    const { start, end } = this.resolveRange(input);
    const limit = input.limit || 10;
    const sortField = input.sortBy === 'units' ? 'units' : 'revenue';
    const channelFilter = input.salesChannel
      ? `AND o."salesChannel" = '${input.salesChannel}'`
      : '';

    const result: any = await Order.knex().raw(
      `SELECT
        (item->>'productId')::uuid as "productId",
        MAX(item->>'productName') as "productName",
        MAX(item->>'sku') as "sku",
        SUM((item->>'quantity')::int)::int as "units",
        SUM((item->>'subtotal')::numeric) as "revenue"
       FROM orders o,
            jsonb_array_elements(o.items) AS item
       WHERE o."createdAt" >= ? AND o."createdAt" <= ?
         AND o."orderStatus" != 'CANCELLED'
         ${channelFilter}
       GROUP BY "productId"
       ORDER BY ${sortField} DESC
       LIMIT ?`,
      [start, end, limit]
    );

    return {
      dateRange: { start, end },
      sortBy: input.sortBy,
      data: result.rows.map((r: any) => ({
        productId: r.productId,
        productName: r.productName,
        sku: r.sku,
        units: r.units,
        revenue: Number(r.revenue).toFixed(2),
      })),
    };
  }

  // ─── LOW STOCK ──────────────────────────────────
  static async getLowStock() {
    const items = await Inventory.query()
      .whereRaw('quantity <= "reorderLevel"')
      .withGraphFetched('[product, variant]')
      .orderBy('quantity', 'asc');

    return {
      count: items.length,
      data: items.map((i: any) => ({
        inventoryId: i.id,
        productId: i.productId,
        productName: i.product?.name,
        variantId: i.variantId,
        variantLabel: i.variant
          ? [i.variant.colour, i.variant.size, i.variant.material]
              .filter(Boolean)
              .join(' / ')
          : null,
        sku: i.variant?.sku || i.product?.sku,
        quantity: i.quantity,
        reservedQuantity: i.reservedQuantity,
        availableQuantity: i.availableQuantity,
        reorderLevel: i.reorderLevel,
      })),
    };
  }

  // ─── SALES REP PERFORMANCE ──────────────────────
  static async getSalesRepPerformance(input: DateRangeInput) {
    const { start, end } = this.resolveRange(input);

    const result: any = await Order.knex().raw(
      `SELECT
        o."salesRepId" as "salesRepId",
        u.email,
        u."firstName",
        u."lastName",
        COUNT(*)::int as "salesCount",
        COALESCE(SUM(o.total), 0) as "revenue",
        COALESCE(AVG(o.total), 0) as "avgSaleValue",
        COALESCE(SUM(o.discount), 0) as "totalDiscounts"
       FROM orders o
       LEFT JOIN users u ON u.id = o."salesRepId"
       WHERE o."salesChannel" = 'IN_STORE'
         AND o."createdAt" >= ? AND o."createdAt" <= ?
         AND o."orderStatus" != 'CANCELLED'
       GROUP BY o."salesRepId", u.email, u."firstName", u."lastName"
       ORDER BY "revenue" DESC`,
      [start, end]
    );

    return {
      dateRange: { start, end },
      data: result.rows.map((r: any) => ({
        salesRepId: r.salesRepId,
        email: r.email,
        firstName: r.firstName,
        lastName: r.lastName,
        salesCount: r.salesCount,
        revenue: Number(r.revenue).toFixed(2),
        avgSaleValue: Number(r.avgSaleValue).toFixed(2),
        totalDiscounts: Number(r.totalDiscounts).toFixed(2),
      })),
    };
  }

  // ─── ORDER STATUS BREAKDOWN ─────────────────────
  static async getOrderStatusBreakdown(input: DateRangeInput) {
    const { start, end } = this.resolveRange(input);

    const result: any[] = await Order.query()
      .where('createdAt', '>=', start)
      .where('createdAt', '<=', end)
      .select('orderStatus')
      .count('* as count')
      .groupBy('orderStatus');

    return {
      dateRange: { start, end },
      data: result.map((r) => ({
        orderStatus: r.orderStatus,
        count: Number(r.count),
      })),
    };
  }

  // ─── PAYMENT STATUS BREAKDOWN ───────────────────
  static async getPaymentStatusBreakdown(input: DateRangeInput) {
    const { start, end } = this.resolveRange(input);

    const result: any[] = await Payment.query()
      .where('createdAt', '>=', start)
      .where('createdAt', '<=', end)
      .select('status')
      .count('* as count')
      .sum('amount as totalAmount')
      .groupBy('status');

    return {
      dateRange: { start, end },
      data: result.map((r) => ({
        status: r.status,
        count: Number(r.count),
        totalAmount: Number(r.totalAmount || 0).toFixed(2),
      })),
    };
  }

  // ─── USER STATS ─────────────────────────────────
  static async getUserStats(input: DateRangeInput) {
    const { start, end } = this.resolveRange(input);

    const newUsers: any = await User.query()
      .where('createdAt', '>=', start)
      .where('createdAt', '<=', end)
      .count('* as count')
      .first();

    const totalUsers: any = await User.query().count('* as count').first();

    const byRole: any[] = await User.query()
      .select('role')
      .count('* as count')
      .groupBy('role');

    const activeBuyers: any = await Order.knex().raw(
      `SELECT COUNT(DISTINCT "customerId")::int as count
       FROM orders
       WHERE "createdAt" >= ? AND "createdAt" <= ?
         AND "orderStatus" != 'CANCELLED'
         AND "customerId" IS NOT NULL`,
      [start, end]
    );

    return {
      dateRange: { start, end },
      newUsers: Number(newUsers?.count || 0),
      totalUsers: Number(totalUsers?.count || 0),
      activeBuyers: activeBuyers.rows[0]?.count || 0,
      byRole: byRole.map((r) => ({
        role: r.role,
        count: Number(r.count),
      })),
    };
  }
}
