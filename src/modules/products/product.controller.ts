import { Request, Response, NextFunction } from 'express';
import { ProductService } from './product.service';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from './product.validation';
import type { AuthRequest } from '../../middleware/auth';

export class ProductController {
  // ─── Public: list products ──────────────────────
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = productQuerySchema.parse(req.query);
      const isAdmin = req.user?.role === 'ADMIN';
      const result = await ProductService.findAll(query, isAdmin);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // ─── Public: get by slug ────────────────────────
  static async getBySlug(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      const product = await ProductService.findBySlug(String(req.params.slug), isAdmin);
      res.json({ product });
    } catch (error) {
      next(error);
    }
  }

  // ─── Public: get by id ──────────────────────────
  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const isAdmin = req.user?.role === 'ADMIN';
      const product = await ProductService.findById(String(req.params.id), isAdmin);
      res.json({ product });
    } catch (error) {
      next(error);
    }
  }

  // ─── Admin: create ──────────────────────────────
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createProductSchema.parse(req.body);
      const product = await ProductService.create(data);
      res.status(201).json({ product });
    } catch (error) {
      next(error);
    }
  }

  // ─── Admin: update ──────────────────────────────
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateProductSchema.parse(req.body);
      const product = await ProductService.update(String(req.params.id), data);
      res.json({ product });
    } catch (error) {
      next(error);
    }
  }

  // ─── Admin: delete ──────────────────────────────
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await ProductService.delete(String(req.params.id));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}