import { Request, Response, NextFunction } from 'express';
import { ReviewService } from './review.service';
import {
  createReviewSchema,
  updateReviewSchema,
  reviewQuerySchema,
} from './review.validation';
import type { AuthRequest } from '../../middleware/auth';

export class ReviewController {
  // POST /products/:productId/reviews
  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = createReviewSchema.parse(req.body);
      const review = await ReviewService.create(
        req.user!.id,
        String(req.params.productId),
        data
      );
      res.status(201).json({ review });
    } catch (error) {
      next(error);
    }
  }

  // GET /products/:productId/reviews
  static async listForProduct(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const query = reviewQuerySchema.parse(req.query);
      const result = await ReviewService.findByProduct(
        String(req.params.productId),
        query
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /reviews/me
  static async myReviews(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = reviewQuerySchema.parse(req.query);
      const result = await ReviewService.findByUser(req.user!.id, query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /reviews/:id
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const review = await ReviewService.findById(String(req.params.id));
      res.json({ review });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /reviews/:id
  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = updateReviewSchema.parse(req.body);
      const review = await ReviewService.update(
        String(req.params.id),
        req.user!.id,
        data
      );
      res.json({ review });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /reviews/:id
  static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user!.role === 'ADMIN';
      await ReviewService.delete(String(req.params.id), req.user!.id, isAdmin);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // GET /reviews/admin/all
  static async listAll(req: Request, res: Response, next: NextFunction) {
    try {
      const query = reviewQuerySchema.parse(req.query);
      const result = await ReviewService.findAll(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}