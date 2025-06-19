import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { RequestHandler } from 'express';

const router = Router();

// Public routes
router.post('/login', ...(AuthController.login as RequestHandler[]));
router.post('/signup', ...(AuthController.signup as RequestHandler[]));
router.post('/verify-otp', ...(AuthController.verifyOtp as RequestHandler[]));
router.post('/resend-otp', ...(AuthController.resendOtp as RequestHandler[]));
router.post('/request-password-reset', ...(AuthController.requestPasswordReset as RequestHandler[]));
router.post('/confirm-password-reset', ...(AuthController.confirmPasswordReset as RequestHandler[]));

// Protected routes
router.post('/logout', ...(AuthController.logout as RequestHandler[]));
router.post('/refresh', ...(AuthController.refreshToken as RequestHandler[]));
router.post('/change-password', ...(AuthController.changePassword as RequestHandler[]));

export default router;