import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { BadRequestError } from '../middleware/error.middleware';
import { stripe } from '../services/payment.service';
import { authenticate, UserPayload } from '@/middleware/auth.middleware';

const paymentService = new PaymentService();

export class PaymentController {
  static createPaymentIntent = [
    authenticate,
    async (req: Request & { user?: UserPayload }, res: Response) => {
      try {
        const userId = req.user?.id;
        const { applicationId } = req.params;

        if (!userId) {
          throw new BadRequestError('User not authenticated');
        }

        const result = await paymentService.createPaymentIntent(userId, applicationId, req.body.amount);
        console.log(result);
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        throw error;
      }
    }
  ];

  static handleWebhook = [
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const sig = req.headers['stripe-signature'];

      try {
        const event = stripe.webhooks.constructEvent(
          req.body,
          sig!,
          process.env.STRIPE_WEBHOOK_SECRET!
        );

        await paymentService.handleWebhook(event);
        res.json({ received: true });
      } catch (err: any) {
        console.error('Webhook Error:', err);
        res.status(400).send(`Webhook Error: ${err.message}`);
      }
    }
  ];

  static getPaymentStatus = [
    authenticate,
    async (req: Request & { user?: { id: string } }, res: Response) => {
      try {
        const { paymentId } = req.params;
        const payment = await paymentService.getPaymentStatus(paymentId);

        res.json({
          success: true,
          data: payment
        });
      } catch (error) {
        throw error;
      }
    }
  ];

  static updatePaymentStatus = [
    async (req: Request, res: Response) => {
      try {
        const { paymentId } = req.params;
        const { stripePaymentId } = req.body;

        if (!stripePaymentId) {
          throw new BadRequestError('Stripe payment ID is required');
        }

        const updatedPayment = await paymentService.updatePaymentStatus(paymentId, stripePaymentId);

        res.json({
          success: true,
          data: updatedPayment
        });
      } catch (error) {
        throw error;
      }
    }
  ];

  // New admin endpoints
  static getAllPayments = [
    authenticate,
    async (req: Request & { user?: UserPayload }, res: Response) => {
      try {
        const adminEmail = req.user?.email;
        if (!adminEmail) {
          throw new BadRequestError('User not authenticated');
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const status = req.query.status as string;
        const search = req.query.search as string;

        const result = await paymentService.getAllPayments(adminEmail, page, limit, status, search);

        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        throw error;
      }
    }
  ];

  static getPaymentById = [
    authenticate,
    async (req: Request & { user?: UserPayload }, res: Response) => {
      try {
        const adminEmail = req.user?.email;
        const { paymentId } = req.params;

        if (!adminEmail) {
          throw new BadRequestError('User not authenticated');
        }

        const payment = await paymentService.getPaymentById(adminEmail, paymentId);

        res.json({
          success: true,
          data: payment
        });
      } catch (error) {
        throw error;
      }
    }
  ];

  static getPaymentStats = [
    authenticate,
    async (req: Request & { user?: UserPayload }, res: Response) => {
      try {
        const adminEmail = req.user?.email;
        if (!adminEmail) {
          throw new BadRequestError('User not authenticated');
        }

        const stats = await paymentService.getPaymentStats(adminEmail);

        res.json({
          success: true,
          data: stats
        });
      } catch (error) {
        throw error;
      }
    }
  ];

  // Test endpoint to check database and create test data if needed
  static testPayments = [
    authenticate,
    async (req: Request & { user?: UserPayload }, res: Response) => {
      try {
        const adminEmail = req.user?.email;
        if (!adminEmail) {
          throw new BadRequestError('User not authenticated');
        }

        // Check if there are any payments
        const allPayments = await paymentService.getAllPayments(adminEmail, 1, 1);
        
        res.json({
          success: true,
          data: {
            hasPayments: allPayments.payments.length > 0,
            totalPayments: allPayments.pagination.total,
            message: allPayments.payments.length > 0 
              ? 'Payments found in database' 
              : 'No payments found in database. You may need to create some test payments.',
            samplePaymentIds: allPayments.payments.slice(0, 3).map(p => p.id)
          }
        });
      } catch (error) {
        throw error;
      }
    }
  ];

  static getMonthlyRevenue = [
    authenticate,
    async (req: Request & { user?: UserPayload }, res: Response) => {
      try {
        const adminEmail = req.user?.email;
        if (!adminEmail) {
          throw new BadRequestError('User not authenticated');
        }

        const year = parseInt(req.query.year as string) || new Date().getFullYear();
        const monthlyRevenue = await paymentService.getMonthlyRevenue(adminEmail, year);

        res.json({
          success: true,
          data: monthlyRevenue
        });
      } catch (error) {
        throw error;
      }
    }
  ];
}
