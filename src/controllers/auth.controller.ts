import { NextFunction, Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { AuthService } from '../services/auth.service';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { authenticate } from '@/middleware/auth.middleware';

const authService = new AuthService();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: 'Too many login attempts. Please try again later.',
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset requests. Please try again later.',
});

export class AuthController {
  static login = [
    loginLimiter,
    check('email').isEmail().withMessage('Invalid email'),
    check('password').notEmpty().withMessage('Password is required'),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }
      const { email, password } = req.body;
      const { token, refreshToken, user } = await authService.login(email, password);

      // Set refresh token as secure HTTP-only cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/auth/refresh' // Only sent to refresh endpoint
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user
        }
      });
    },
  ];

  static logout = [
    authenticate,
    async (req: Request, res: Response) => {
      // Clear the refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth/refresh'
      });

      res.json({
        success: true,
        message: 'Logout successful'
      });
    },
  ];

  static refreshToken = [
    async (req: Request, res: Response) => {
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        throw new UnauthorizedError('No refresh token provided');
      }

      try {
        const { token, refreshToken: newRefreshToken } = await authService.refreshToken(refreshToken);

        // Set new refresh token cookie
        res.cookie('refreshToken', newRefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/api/auth/refresh'
        });

        res.json({
          success: true,
          message: 'Token refreshed successfully',
          data: { token }
        });
      } catch (error) {
        // Clear the invalid refresh token
        res.clearCookie('refreshToken', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/api/auth/refresh'
        });
        throw error;
      }
    },
  ];

  static signup = [
    check('email').isEmail().withMessage('Invalid email'),
    check('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    check('name').notEmpty().withMessage('Name is required'),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }
      const { email, password, name, role, phone, department, title } = req.body;
      await authService.signup({ email, password, name, role, phone, department, title });
      res.json({
        success: true,
        message: 'Signup successful. Please check your email for verification.'
      });
    },
  ];

  static verifyOtp = [
    check('email').isEmail().withMessage('Invalid email'),
    check('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }
      const { email, otp } = req.body;
      await authService.verifyOtp(email, otp);
      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    },
  ];

  static resendOtp = [
    check('email').isEmail().withMessage('Invalid email'),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }
      const { email } = req.query;
      await authService.resendOtp(email as string);
      res.json({
        success: true,
        message: 'OTP resent successfully'
      });
    },
  ];

  static requestPasswordReset = [
    passwordResetLimiter,
    check('email').isEmail().withMessage('Invalid email'),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }
      const { email } = req.body;
      await authService.requestPasswordReset(email);
      res.json({
        success: true,
        message: 'Password reset instructions sent to your email'
      });
    },
  ];

  static confirmPasswordReset = [
    check('token').notEmpty().withMessage('Token is required'),
    check('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }
      const { token, newPassword } = req.body;
      await authService.confirmPasswordReset(token, newPassword);
      res.json({
        success: true,
        message: 'Password reset successful'
      });
    },
  ];

  static changePassword = [
    authenticate,
    check('currentPassword').notEmpty().withMessage('Current password is required'),
    check('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }
      const email = (req as Request & { user?: { email: string } }).user?.email;
      if (!email) {
        throw new BadRequestError('User not authenticated');
      }
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(email, currentPassword, newPassword);
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    },
  ];
}