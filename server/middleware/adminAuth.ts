import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AdminJwtPayload {
  adminId: number;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminJwtPayload;
    }
  }
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'change_this_to_strong_secret';
    
    const decoded = jwt.verify(token, jwtSecret) as AdminJwtPayload;
    req.admin = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json({ ok: false, message: 'Invalid or expired token' });
  }
}
