import { Promotion } from './promotion.model';
import { Order } from '../orders/order.model';
import { Cart } from '../cart/cart.model';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../utils/errors';
import { getPagination, buildPaginatedResult } from '../../utils/pagination';
import type {
  CreatePromotionInput,
  UpdatePromotionInput,
  ValidatePromotionInput,
  PromotionQueryInput,
} from './promotion.validation';

interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export class PromotionService {
  // ─── CREATE (admin) ─────────────────────────────
  static async create(input: CreatePromotionInput): Promise<Promotion> {
    const code = input.code.toUpperCase();

    const existing = await Promotion.query().where('code', code).first();
    if (existing) throw new ConflictError(`Promo code "${code}" already exists`);

    if (new Date(input.startDate) >= new Date(input.endDate)) {
      throw new BadRequestError('startDate must be before endDate');
    }

    if (input.type === 'PERCENTAGE' && input.value > 100) {
      throw new BadRequestError('Percentage value cannot exceed 100');
    }

    return Promotion.query().insert({
      ...input,
      code,
    } as any);
  }

  // ─── UPDATE (admin) ─────────────────────────────
  static async update(
    id: string,
    input: UpdatePromotionInput
  ): Promise<Promotion> {
    const promo = await Promotion.query().findById(id);
    if (!promo) throw new NotFoundError('Promotion');

    const patch: any = { ...input };

    if (input.code) {
      patch.code = input.code.toUpperCase();
      const existing = await Promotion.query()
        .where('code', patch.code)
        .whereNot('id', id)
        .first();
      if (existing) {
        throw new ConflictError(`Promo code "${patch.code}" already exists`);
      }
    }

    if (input.type === 'PERCENTAGE' && input.value && input.value > 100) {
      throw new BadRequestError('Percentage value cannot exceed 100');
    }

    return Promotion.query().patchAndFetchById(id, patch);
  }

  // ─── DELETE (admin) ─────────────────────────────
  static async delete(id: string): Promise<void> {
    const promo = await Promotion.query().findById(id);
    if (!promo) throw new NotFoundError('Promotion');
    await Promotion.query().deleteById(id);
  }

  // ─── GET ONE ────────────────────────────────────
  static async findById(id: string): Promise<Promotion> {
    const promo = await Promotion.query().findById(id);
    if (!promo) throw new NotFoundError('Promotion');
    return promo;
  }

  // ─── LIST (admin) ───────────────────────────────
  static async findAll(query: PromotionQueryInput) {
    const { page, limit, offset, sortBy, sortOrder } = getPagination(query);

    let qb = Promotion.query();

    if (query.isActive !== undefined) qb = qb.where('isActive', query.isActive);
    if (query.type) qb = qb.where('type', query.type);
    if (query.search) {
      qb = qb.where((builder) => {
        builder
          .where('code', 'ilike', `%${query.search}%`)
          .orWhere('description', 'ilike', `%${query.search}%`);
      });
    }

    const total = await qb.clone().resultSize();

    const data = await qb.orderBy(sortBy, sortOrder).limit(limit).offset(offset);

    return buildPaginatedResult(data, total, page, limit);
  }

  // ─── VALIDATE (customer, at cart) ───────────────
  static async validate(userId: string, input: ValidatePromotionInput) {
    const code = input.code.toUpperCase();
    const deliveryFee = input.deliveryFee || 0;

    // ─── Step 1: Validate the promo first ──────────
    const promo = await Promotion.query().where('code', code).first();
    if (!promo) throw new NotFoundError('Promo code');
    if (!promo.isActive) {
      throw new BadRequestError('Promo code is not active');
    }

    const now = new Date();
    if (new Date(promo.startDate) > now) {
      throw new BadRequestError('Promo code is not yet active');
    }
    if (new Date(promo.endDate) < now) {
      throw new BadRequestError('Promo code has expired');
    }

    if (promo.usageLimit !== undefined && promo.usageLimit !== null) {
      if (promo.usedCount >= promo.usageLimit) {
        throw new BadRequestError('Promo code has reached its usage limit');
      }
    }

    // ─── Step 2: Validate the cart ─────────────────
    const cart = await Cart.query().where('userId', userId).first();
    if (!cart) throw new BadRequestError('Cart is empty');

    const items = this.parseItems(cart.items) as CartItem[];
    if (items.length === 0) throw new BadRequestError('Cart is empty');

    const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);

    // ─── Step 3: Minimum order check ───────────────
    const minimumOrder = Number(promo.minimumOrder || 0);
    if (subtotal < minimumOrder) {
      throw new BadRequestError(
        `Minimum order of $${minimumOrder.toFixed(
          2
        )} required (current: $${subtotal.toFixed(2)})`
      );
    }

    // ─── Step 4: Compute discount ──────────────────
    let discount = 0;
    let appliedToDelivery = 0;

    switch (promo.type) {
      case 'PERCENTAGE':
        discount = (subtotal * Number(promo.value)) / 100;
        break;
      case 'FIXED':
        discount = Math.min(Number(promo.value), subtotal);
        break;
      case 'FREE_SHIPPING':
        appliedToDelivery = deliveryFee;
        break;
    }

    const newSubtotal = Math.max(0, subtotal - discount);
    const newDeliveryFee = Math.max(0, deliveryFee - appliedToDelivery);
    const newTotal = newSubtotal + newDeliveryFee;

    return {
      valid: true,
      code: promo.code,
      type: promo.type,
      description: promo.description,
      discount: Math.round(discount * 100) / 100,
      deliveryDiscount: Math.round(appliedToDelivery * 100) / 100,
      originalSubtotal: subtotal,
      newSubtotal: Math.round(newSubtotal * 100) / 100,
      originalDeliveryFee: deliveryFee,
      newDeliveryFee: Math.round(newDeliveryFee * 100) / 100,
      newTotal: Math.round(newTotal * 100) / 100,
    };
  }

  // ─── INTERNAL: apply + increment usage (called by OrderService) ─
  static async applyAndIncrement(
    code: string,
    trx: any
  ): Promise<Promotion> {
    const promo = await Promotion.query(trx)
      .where('code', code.toUpperCase())
      .first();

    if (!promo) throw new NotFoundError('Promo code');
    if (!promo.isActive) {
      throw new BadRequestError('Promo code is not active');
    }

    const now = new Date();
    if (new Date(promo.startDate) > now) {
      throw new BadRequestError('Promo code is not yet active');
    }
    if (new Date(promo.endDate) < now) {
      throw new BadRequestError('Promo code has expired');
    }

    if (promo.usageLimit !== undefined && promo.usageLimit !== null) {
      if (promo.usedCount >= promo.usageLimit) {
        throw new BadRequestError('Promo code has reached its usage limit');
      }
    }

    await Promotion.query(trx).patchAndFetchById(promo.id, {
      usedCount: promo.usedCount + 1,
    });

    return promo;
  }

  // ─── HELPERS ────────────────────────────────────
  private static parseItems(raw: any): CartItem[] {
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
}
