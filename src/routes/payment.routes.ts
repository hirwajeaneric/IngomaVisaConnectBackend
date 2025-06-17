import express from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Create payment intent
router.post(
  '/:applicationId/create-intent',
  authenticate,
  PaymentController.createPaymentIntent
);

// Update payment status
router.post(
  '/:paymentId/update-status',
  authenticate,
  PaymentController.updatePaymentStatus
);

// Handle Stripe webhook
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  PaymentController.handleWebhook
);

// Get payment status
router.get(
  '/:paymentId/status',
  authenticate,
  PaymentController.getPaymentStatus
);

export default router;
