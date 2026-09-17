import { Request, Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service';
import {
  adjustStockSchema,
  inventoryQuerySchema,
  transactionQuerySchema,
} from './inventory.validation';
import type { AuthRequest } from '../../middleware/auth';

export class InventoryController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = inventoryQuerySchema.parse(req.query);
      const result = await InventoryService.findAll(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async lowStock(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await InventoryService.getLowStock();
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }

  static async getByProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await InventoryService.getByProduct(String(req.params.productId));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getByVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await InventoryService.getByVariant(String(req.params.variantId));
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async adjust(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = adjustStockSchema.parse(req.body);
      const updated = await InventoryService.adjustStock(
        String(req.params.variantId),
        data,
        req.user?.id
      );
      res.json({ inventory: updated });
    } catch (error) {
      next(error);
    }
  }

  static async transactions(req: Request, res: Response, next: NextFunction) {
    try {
      const query = transactionQuerySchema.parse(req.query);
      const result = await InventoryService.findTransactions(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}