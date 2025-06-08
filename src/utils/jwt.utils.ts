import { Role } from '@/generated/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const JWT_EXPIRATION = 86400000; // 1 day in milliseconds
const JWT_REFRESH_EXPIRATION = 604800000; // 7 days in milliseconds

export class JwtUtil {
    static generateToken(email: string, id: string, role: Role, permission: string[]): string {
        return jwt.sign({ email, id, role, permission }, JWT_SECRET, { expiresIn: JWT_EXPIRATION / 1000 });
    }

    static generateRefreshToken(email: string): string {
        return jwt.sign({ email }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRATION / 1000 });
    }

    static verifyToken(token: string): any {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }
}