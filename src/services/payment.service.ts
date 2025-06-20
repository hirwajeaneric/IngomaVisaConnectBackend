import { PrismaClient } from '../generated/prisma';
import Stripe from 'stripe';
import { BadRequestError, NotFoundError } from '../middleware/error.middleware';

const prisma = new PrismaClient();
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

export class PaymentService {
  async createPaymentIntent(userId: string, applicationId: string, amount: number) {
    // Verify application exists and belongs to user
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: { user: true, visaType: true }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (application.userId !== userId) {
      throw new BadRequestError('Unauthorized access to application');
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findFirst({
      where: {
        application: {
          id: applicationId
        },
        paymentStatus: 'COMPLETED'
      }
    });

    if (existingPayment) {
      throw new BadRequestError('Payment already completed for this application');
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        applicationId,
        userId,
        visaTypeId: application.visaTypeId
      }
    });

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        application: { connect: { id: applicationId } },
        amount,
        currency: 'USD',
        paymentStatus: 'PENDING',
        stripePaymentId: paymentIntent.id
      }
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id
    };
  }

  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await this.handleSuccessfulPayment(paymentIntent);
        break;
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        await this.handleFailedPayment(failedPayment);
        break;
    }
  }

  private async handleSuccessfulPayment(paymentIntent: Stripe.PaymentIntent) {
    const { applicationId } = paymentIntent.metadata;

    await prisma.payment.update({
      where: { stripePaymentId: paymentIntent.id },
      data: {
        paymentStatus: 'COMPLETED',
        updatedAt: new Date()
      }
    });

    // Update application status if needed
    await prisma.visaApplication.update({
      where: { id: applicationId },
      data: {
        status: 'SUBMITTED'
      }
    });

    // Create notification for user
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentId: paymentIntent.id },
      include: { user: true }
    });

    if (payment) {
      // Send email notification
      // TODO: Implement email notification
    }
  }

  private async handleFailedPayment(paymentIntent: Stripe.PaymentIntent) {
    await prisma.payment.update({
      where: { stripePaymentId: paymentIntent.id },
      data: {
        paymentStatus: 'FAILED',
        updatedAt: new Date()
      }
    });
  }

  async getPaymentStatus(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        application: {
          include: {
            visaType: true
          }
        }
      }
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    return payment;
  }

  async updatePaymentStatus(paymentId: string, stripePaymentId: string) {
    // Verify payment exists
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { application: true }
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Verify Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentId);
    
    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestError('Payment has not been completed');
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentStatus: 'COMPLETED',
        stripePaymentId: stripePaymentId,
        updatedAt: new Date()
      },
      include: {
        application: {
          include: {
            visaType: true
          }
        }
      }
    });

    // Update application status if needed
    if (payment.application) {
      await prisma.visaApplication.update({
        where: { id: payment.application.id },
        data: {
          status: 'SUBMITTED'
        }
      });

      // Send email notification
      // TODO: Implement email notification
    }

    return updatedPayment;
  }
}