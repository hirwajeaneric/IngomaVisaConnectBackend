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
}
