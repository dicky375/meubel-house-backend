import { Request, Response, NextFunction } from 'express';
import { ReportService } from './report.service';
import {
  dateRangeSchema,
  timeSeriesSchema,
  topProductsSchema,
} from './report.validation';

export class ReportController {
  static async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const query = dateRangeSchema.parse(req.query);
      const result = await ReportService.getSummary(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async salesOverTime(req: Request, res: Response, next: NextFunction) {
    try {
      const query = timeSeriesSchema.parse(req.query);
      const result = await ReportService.getSalesOverTime(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async topProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const query = topProductsSchema.parse(req.query);
      const result = await ReportService.getTopProducts(query as any);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async lowStock(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ReportService.getLowStock();
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async salesRepPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const query = dateRangeSchema.parse(req.query);
      const result = await ReportService.getSalesRepPerformance(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async orderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const query = dateRangeSchema.parse(req.query);
      const result = await ReportService.getOrderStatusBreakdown(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async paymentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const query = dateRangeSchema.parse(req.query);
      const result = await ReportService.getPaymentStatusBreakdown(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async userStats(req: Request, res: Response, next: NextFunction) {
    try {
      const query = dateRangeSchema.parse(req.query);
      const result = await ReportService.getUserStats(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
