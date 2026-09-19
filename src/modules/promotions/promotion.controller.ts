import { Response, NextFunction } from 'express';
import { PromotionService } from './promotion.service';
import {
  createPromotionSchema,
  updatePromotionSchema,
  validatePromotionSchema,
  promotionQuerySchema,
} from './promotion.validation';
import type { AuthRequest } from '../../middleware/auth';

export class PromotionController {
  // POST /promotions (admin)
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createPromotionSchema.parse(req.body);
      const promo = await PromotionService.create(data);
      res.status(201).json({ promotion: promo });
    } catch (error) {
      next(error);
    }
  }

  // GET /promotions (admin)
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = promotionQuerySchema.parse(req.query);
      const result = await PromotionService.findAll(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /promotions/:id (admin)
  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const promo = await PromotionService.findById(String(req.params.id));
      res.json({ promotion: promo });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /promotions/:id (admin)
  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updatePromotionSchema.parse(req.body);
      const promo = await PromotionService.update(String(req.params.id), data);
      res.json({ promotion: promo });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /promotions/:id (admin)
  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await PromotionService.delete(String(req.params.id));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // POST /promotions/validate (customer, auth)
  static async validateCode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = validatePromotionSchema.parse(req.body);
      const result = await PromotionService.validate(req.user!.id, data);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}