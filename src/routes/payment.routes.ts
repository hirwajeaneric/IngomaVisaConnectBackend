import express from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { RequestHandler } from 'express';

const router = express.Router();

// Create payment intent
router.post(
  '/:applicationId/create-intent', ...(PaymentController.createPaymentIntent as RequestHandler[]));
// Update payment status
router.post('/:paymentId/update-status', ...(PaymentController.updatePaymentStatus as RequestHandler[]));

// Handle Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), ...(PaymentController.handleWebhook as RequestHandler[]));

// Get payment status
router.get('/:paymentId/status', ...(PaymentController.getPaymentStatus as RequestHandler[]));

export default router;
