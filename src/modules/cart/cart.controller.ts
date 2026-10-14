import { Response, NextFunction } from 'express';
import { CartService } from './cart.service';
import {
  addToCartSchema,
  updateCartItemSchema,
  cartItemRefParam,
} from './cart.validation';
import type { AuthRequest } from '../../middleware/auth';

export class CartController {
  // GET /cart
  static async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const cart = await CartService.getCart(req.user!.id);
      res.json({ cart });
    } catch (error) {
      next(error);
    }
  }

  // POST /cart/items
  static async addItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = addToCartSchema.parse(req.body);
      const cart = await CartService.addItem(req.user!.id, data);
      res.status(201).json({ cart });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /cart/items/:index  →  index can be integer OR cartItemId UUID
  static async updateItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const ref = cartItemRefParam.parse(String(req.params.index));
      const data = updateCartItemSchema.parse(req.body);
      const cart = await CartService.updateItem(req.user!.id, ref, data);
      res.json({ cart });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /cart/items/:index  →  index can be integer OR cartItemId UUID
  static async removeItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const ref = cartItemRefParam.parse(String(req.params.index));
      const cart = await CartService.removeItem(req.user!.id, ref);
      res.json({ cart });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /cart
  static async clear(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const cart = await CartService.clear(req.user!.id);
      res.json({ cart });
    } catch (error) {
      next(error);
    }
  }
}
