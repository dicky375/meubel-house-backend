import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../modules/auth/auth.service';
import { User } from '../modules/users/user.model';

export interface AuthRequest extends Request {
  user?: User;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = AuthService.verifyAccessToken(token);
    const user = await User.query().findById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
};