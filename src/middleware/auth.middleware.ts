import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors';

interface DecodedToken {
  id: string;
  email: string;
  role: string;
  permission: string[];
}

export interface UserPayload {
  id: string;
  email: string;
  role: string;
  permission: string[];
}

const jwtSecret = process.env.JWT_SECRET || 'oZsRp0Rj9ndGDK';

export const authenticate = async (
  req: Request & { user?: UserPayload },
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtSecret) as DecodedToken;
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role, permission: decoded.permission };
    next();
  } catch (error: any) {
    console.log(error);
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

export const authorize = (p: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        if (!user || !user.permission.includes(p)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
};