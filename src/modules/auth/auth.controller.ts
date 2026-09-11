import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { User } from '../users/user.model';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const data = registerSchema.parse(req.body);
      
      const existingUser = await User.findByEmail(data.email);
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      
      const user = await User.query().insert(data);
      const tokens = AuthService.generateTokens(user);
      
      return res.status(201).json({ user, ...tokens });
    } catch (error) {
      throw error;
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await User.findByEmail(email);
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      if (!user.isActive) {
        return res.status(403).json({ error: 'Account is deactivated' });
      }
      
      await user.$query().patch({ lastLogin: new Date() });
      const tokens = AuthService.generateTokens(user);
      
      return res.json({ user, ...tokens });
    } catch (error) {
      throw error;
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
      }
      
      const { accessToken } = await AuthService.refreshAccessToken(refreshToken);
      return res.json({ accessToken });
    } catch (error) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
  }
}