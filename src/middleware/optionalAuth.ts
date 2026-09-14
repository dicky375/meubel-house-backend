import { Response, NextFunction } from 'express';
import { AuthService } from '../modules/auth/auth.service';
import { User } from '../modules/users/user.model';
import type { AuthRequest } from './auth';

/**
 * Like `authenticate`, but doesn't fail if no token present.
 * Populates req.user when a valid token exists.
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = AuthService.verifyAccessToken(token);
    const user = await User.query().findById(decoded.id);
    if (user && user.isActive) req.user = user;
  } catch {
    // Ignore invalid tokens — treat as anonymous
  }
  next();
};