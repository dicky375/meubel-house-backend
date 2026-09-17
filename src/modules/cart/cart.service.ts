import { Cart } from './cart.model';
import { Product } from '../products/product.model';
import { ProductVariant } from '../products/productVariant.model';
import { Inventory } from '../inventory/inventory.model';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import type { AddToCartInput, UpdateCartItemInput } from './cart.validation';

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

export class CartService {
  // ─── GET OR CREATE CART ─────────────────────────
  private static async getOrCreate(userId: string): Promise<Cart> {
    let cart = await Cart.query().where('userId', userId).first();
    if (!cart) {
      cart = await Cart.query().insert({
        userId,
        items: [],
        subtotal: 0,
        discount: 0,
        total: 0,
      });
    }
    return cart;
  }

  // ─── GET CART ───────────────────────────────────
  static async getCart(userId: string) {
    const cart = await this.getOrCreate(userId);
    return cart;
  }

  // ─── ADD ITEM ───────────────────────────────────
  static async addItem(userId: string, input: AddToCartInput) {
    const { productId, variantId, quantity } = input;

    // Load product + validate visibility
    const product = await Product.query().findById(productId);
    if (!product) throw new NotFoundError('Product');
    if (!product.isActive || !product.isPublished) {
      throw new BadRequestError('Product is not available for purchase');
    }

    // Determine price & stock source
    let unitPrice = Number(product.price);
    let variantLabel: string | undefined;
    let sku = product.sku;
    let inventory: Inventory | undefined;

    if (variantId) {
      const variant = await ProductVariant.query()
        .where({ id: variantId, productId })
        .first();

      if (!variant) throw new NotFoundError('Variant');
      unitPrice = Number(variant.price);
      sku = variant.sku;
      variantLabel = [variant.colour, variant.size, variant.material]
        .filter(Boolean)
        .join(' / ');

      inventory = await Inventory.query()
        .where({ productId, variantId })
        .first();
    } else {
      // Simple product — use inventory row with null variantId
      inventory = await Inventory.query()
        .where({ productId })
        .whereNull('variantId')
        .first();
    }

    if (!inventory) throw new BadRequestError('No inventory record found');

    // Check stock
    const cart = await this.getOrCreate(userId);
    const items = (cart.items as CartItem[]) || [];

    const existingIdx = items.findIndex(
      (i) => i.productId === productId && i.variantId === variantId
    );

    const currentQty = existingIdx >= 0 ? items[existingIdx].quantity : 0;
    const desiredQty = currentQty + quantity;

    if (desiredQty > inventory.availableQuantity) {
      throw new BadRequestError(
        `Only ${inventory.availableQuantity} unit(s) available (you have ${currentQty} in cart)`
      );
    }

    if (existingIdx >= 0) {
      // Update quantity
      items[existingIdx].quantity = desiredQty;
      items[existingIdx].subtotal = desiredQty * unitPrice;
      items[existingIdx].unitPrice = unitPrice; // re-derive current price
    } else {
      // Add new item
      items.push({
        productId,
        variantId,
        productName: product.name,
        variantLabel,
        sku,
        image: product.images?.[0],
        quantity,
        unitPrice,
        subtotal: quantity * unitPrice,
      });
    }

    return this.recalculateAndSave(cart, items);
  }

  // ─── UPDATE ITEM QUANTITY ───────────────────────
  static async updateItem(
    userId: string,
    itemIndex: number,
    input: UpdateCartItemInput
  ) {
    const { quantity } = input;
    const cart = await this.getOrCreate(userId);
    const items = (cart.items as CartItem[]) || [];

    if (itemIndex < 0 || itemIndex >= items.length) {
      throw new NotFoundError('Cart item');
    }

    const item = items[itemIndex];

    if (quantity === 0) {
      // Remove item
      items.splice(itemIndex, 1);
    } else {
      // Validate stock
      const inventory = await Inventory.query()
        .where('productId', item.productId)
        .modify((qb) => {
          if (item.variantId) qb.where('variantId', item.variantId);
          else qb.whereNull('variantId');
        })
        .first();

      if (!inventory) throw new BadRequestError('Inventory record missing');
      if (quantity > inventory.availableQuantity) {
        throw new BadRequestError(
          `Only ${inventory.availableQuantity} unit(s) available`
        );
      }

      item.quantity = quantity;
      item.subtotal = quantity * item.unitPrice;
    }

    return this.recalculateAndSave(cart, items);
  }

  // ─── REMOVE ITEM ────────────────────────────────
  static async removeItem(userId: string, itemIndex: number) {
    const cart = await this.getOrCreate(userId);
    const items = (cart.items as CartItem[]) || [];

    if (itemIndex < 0 || itemIndex >= items.length) {
      throw new NotFoundError('Cart item');
    }

    items.splice(itemIndex, 1);
    return this.recalculateAndSave(cart, items);
  }

  // ─── CLEAR CART ─────────────────────────────────
  static async clear(userId: string) {
    const cart = await this.getOrCreate(userId);
    return Cart.query().patchAndFetchById(cart.id, {
      items: [],
      subtotal: 0,
      discount: 0,
      total: 0,
    });
  }

  // ─── HELPERS ────────────────────────────────────
  private static async recalculateAndSave(cart: Cart, items: CartItem[]) {
    const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
    const discount = 0; // promotions applied at checkout
    const total = subtotal - discount;

    return Cart.query().patchAndFetchById(cart.id, {
      items: items as any,
      subtotal,
      discount,
      total,
    });
  }
}