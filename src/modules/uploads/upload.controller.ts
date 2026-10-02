import { Request, Response, NextFunction } from 'express';
import { UploadService } from './upload.service';
import { BadRequestError } from '../../utils/errors';

export class UploadController {
  static async uploadSingle(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new BadRequestError('No file uploaded');
      const { url, publicId } = await UploadService.uploadImage(req.file);
      res.status(201).json({ url, publicId });
    } catch (error) {
      next(error);
    }
  }

  static async uploadMultiple(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) throw new BadRequestError('No files uploaded');
      const urls = await UploadService.uploadMultiple(files);
      res.status(201).json({ urls });
    } catch (error) {
      next(error);
    }
  }
}
