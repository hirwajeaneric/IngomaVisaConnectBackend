import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors';
import prisma from '../config/database';
import { JwtUtil } from '../utils/jwt.utils';

export const authenticate = async (
  req: Request & { user?: { id: string } },
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as { userId: string };
    
    req.user = { id: decoded.userId };
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

export const authorize = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        if (!user || !user.permissions.includes(permission)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
};