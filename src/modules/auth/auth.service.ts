import jwt from 'jsonwebtoken';
import { User } from '../users/user.model';

export class AuthService {
  static generateTokens(user: User) {
    const payload = { id: user.id, email: user.email, role: user.role };
    
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRY || '15m' }
    );
    
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
    );
    
    return { accessToken, refreshToken };
  }

  static verifyAccessToken(token: string) {
    return jwt.verify(token, process.env.JWT_SECRET!);
  }

  static verifyRefreshToken(token: string) {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!);
  }

  static async refreshAccessToken(refreshToken: string) {
    const decoded: any = this.verifyRefreshToken(refreshToken);
    const user = await User.query().findById(decoded.id);
    if (!user || !user.isActive) throw new Error('Invalid refresh token');
    
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRY || '15m' }
    );
    
    return { accessToken: newAccessToken };
  }
}