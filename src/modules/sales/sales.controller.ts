import { Response, NextFunction } from 'express';
import { SalesService } from './sales.service';
import {
  createInStoreSaleSchema,
  salesQuerySchema,
  productSearchSchema,
  customerSearchSchema,
} from './sales.validation';
import type { AuthRequest } from '../../middleware/auth';

export class SalesController {
  // GET /sales/products/search
  static async searchProducts(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const query = productSearchSchema.parse(req.query);
      const result = await SalesService.searchProducts(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /sales/products/:id/stock
  static async checkStock(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await SalesService.checkStock(String(req.params.id));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /sales/customers/search?q=...
  static async searchCustomers(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { q } = customerSearchSchema.parse(req.query);
      const customers = await SalesService.searchCustomers(q);
      res.json({ customers });
    } catch (error) {
      next(error);
    }
  }

  // POST /sales/orders
  static async createSale(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createInStoreSaleSchema.parse(req.body);
      const order = await SalesService.createSale(req.user!.id, data);
      res.status(201).json({ order });
    } catch (error) {
      next(error);
    }
  }

  // GET /sales/orders
  static async mySales(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = salesQuerySchema.parse(req.query);
      const result = await SalesService.getMySales(req.user!.id, query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /sales/orders/:id
  static async getSale(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user!.role === 'ADMIN';
      const order = await SalesService.getSaleById(
        String(req.params.id),
        req.user!.id,
        isAdmin
      );
      res.json({ order });
    } catch (error) {
      next(error);
    }
  }
}