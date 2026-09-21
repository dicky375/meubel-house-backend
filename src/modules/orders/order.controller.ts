import { Response, NextFunction } from 'express';
import { OrderService } from './order.service';
import {
  checkoutSchema,
  updateOrderStatusSchema,
  orderQuerySchema,
} from './order.validation';
import type { AuthRequest } from '../../middleware/auth';

export class OrderController {
  // POST /orders/checkout
  static async checkout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = checkoutSchema.parse(req.body);
      const order = await OrderService.checkout(req.user!.id, data);
      res.status(201).json({ order });
    } catch (error) {
      next(error);
    }
  }

  // GET /orders (my orders — customer)
  static async myOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = orderQuerySchema.parse(req.query);
      const result = await OrderService.getMyOrders(req.user!.id, query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /orders/:id
  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.getById(
        String(req.params.id),
        req.user!.id,
        req.user!.role
      );
      res.json({ order });
    } catch (error) {
      next(error);
    }
  }

  // POST /orders/:id/cancel (customer)
  static async cancel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.cancelOrder(
        String(req.params.id),
        req.user!.id
      );
      res.json({ order });
    } catch (error) {
      next(error);
    }
  }

  // GET /orders/admin/all (admin — all orders)
  static async listAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = orderQuerySchema.parse(req.query);
      const result = await OrderService.findAll(query, req.user!.id, 'ADMIN');
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /orders/sales-rep/all (sales rep — own sales)
  static async listMine(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = orderQuerySchema.parse(req.query);
      const result = await OrderService.findAll(
        query,
        req.user!.id,
        req.user!.role
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /orders/admin/:id/status (admin)
  static async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateOrderStatusSchema.parse(req.body);
      const order = await OrderService.updateStatus(String(req.params.id), data);
      res.json({ order });
    } catch (error) {
      next(error);
    }
  }
}
