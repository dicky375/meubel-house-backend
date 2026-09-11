import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);
  
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors,
    });
  }
  
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate entry' });
  }
  
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  
  return res.status(500).json({ error: 'Internal server error' });
};