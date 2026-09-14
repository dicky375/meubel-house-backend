import { Request, Response, NextFunction } from 'express';
import { CategoryService } from './category.service';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryQuerySchema,
} from './category.validation';

export class CategoryController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createCategorySchema.parse(req.body);
      const category = await CategoryService.create(data);
      res.status(201).json({ category });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = categoryQuerySchema.parse(req.query);
      const result = await CategoryService.findAll(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoryService.findById(String(req.params.id));
      res.json({ category });
    } catch (error) {
      next(error);
    }
  }

  static async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoryService.findBySlug(String(req.params.slug));
      res.json({ category });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateCategorySchema.parse(req.body);
      const category = await CategoryService.update(String(req.params.id), data);
      res.json({ category });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await CategoryService.delete(String(req.params.id));
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}