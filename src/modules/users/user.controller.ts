import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { z } from 'zod';

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  role: z.enum(['CUSTOMER', 'SALES_REP', 'ADMIN']).optional(),
  search: z.string().optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(['CUSTOMER', 'SALES_REP', 'ADMIN']),
});

export class UserController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listQuerySchema.parse(req.query);
      const result = await UserService.findAll(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.findById(String(req.params.id));
      res.json({ user });
    } catch (error) {
      next(error);
    }
  }

  static async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { role } = updateRoleSchema.parse(req.body);
      const user = await UserService.updateRole(String(req.params.id), role);
      res.json({ user });
    } catch (error) {
      next(error);
    }
  }

  static async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.deactivate(String(req.params.id));
      res.json({ user });
    } catch (error) {
      next(error);
    }
  }

  static async me(req: any, res: Response) {
    res.json({ user: req.user });
  }
}
