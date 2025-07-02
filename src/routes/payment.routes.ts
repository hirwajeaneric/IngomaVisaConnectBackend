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

// Admin endpoints
router.get('/admin/all', ...(PaymentController.getAllPayments as RequestHandler[]));
router.get('/admin/stats', ...(PaymentController.getPaymentStats as RequestHandler[]));
router.get('/admin/monthly-revenue', ...(PaymentController.getMonthlyRevenue as RequestHandler[]));
router.get('/admin/test', ...(PaymentController.testPayments as RequestHandler[]));
router.get('/admin/:paymentId', ...(PaymentController.getPaymentById as RequestHandler[]));

export default router;
