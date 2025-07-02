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

  // New methods for admin payment listing
  async getAllPayments(adminEmail: string, page: number = 1, limit: number = 10, status?: string, search?: string) {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      throw new NotFoundError('Admin not found');
    }
    if (admin.role !== 'ADMIN') {
      throw new BadRequestError('Only admins can view all payments');
    }

    const skip = (page - 1) * limit;
    
    // Build where clause
    const where: any = {};
    
    if (status && status !== 'all') {
      where.paymentStatus = status.toUpperCase();
    }
    
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { application: { applicationNumber: { contains: search, mode: 'insensitive' } } }
      ];
    }

    console.log('Fetching payments with where clause:', where);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          application: {
            select: {
              id: true,
              applicationNumber: true,
              visaType: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.payment.count({ where })
    ]);

    console.log(`Found ${payments.length} payments out of ${total} total`);

    return {
      payments: payments.map(this.mapToPaymentDto),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getPaymentById(adminEmail: string, paymentId: string) {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      throw new NotFoundError('Admin not found');
    }
    if (admin.role !== 'ADMIN') {
      throw new BadRequestError('Only admins can view payment details');
    }

    console.log(`Looking for payment with ID: ${paymentId}`);

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        application: {
          select: {
            id: true,
            applicationNumber: true,
            status: true,
            submissionDate: true,
            visaType: {
              select: {
                name: true,
                price: true
              }
            }
          }
        }
      }
    });

    if (!payment) {
      console.log(`Payment with ID ${paymentId} not found in database`);
      throw new NotFoundError('Payment not found');
    }

    console.log(`Found payment: ${payment.id}`);
    return this.mapToDetailedPaymentDto(payment);
  }

  async getPaymentStats(adminEmail: string) {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      throw new NotFoundError('Admin not found');
    }
    if (admin.role !== 'ADMIN') {
      throw new BadRequestError('Only admins can view payment statistics');
    }

    console.log('Fetching payment statistics...');

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Calculate date ranges for current month and previous month
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);
    const previousMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const previousMonthEnd = new Date(currentYear, currentMonth, 0);

    const [
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments,
      totalRevenue,
      currentMonthRevenue,
      previousMonthRevenue,
      currentMonthTransactions,
      previousMonthTransactions
    ] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.count({ where: { paymentStatus: 'COMPLETED' } }),
      prisma.payment.count({ where: { paymentStatus: 'PENDING' } }),
      prisma.payment.count({ where: { paymentStatus: 'FAILED' } }),
      prisma.payment.aggregate({
        where: { paymentStatus: 'COMPLETED' },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: { 
          paymentStatus: 'COMPLETED',
          createdAt: {
            gte: currentMonthStart,
            lte: currentMonthEnd
          }
        },
        _sum: { amount: true }
      }),
      prisma.payment.aggregate({
        where: { 
          paymentStatus: 'COMPLETED',
          createdAt: {
            gte: previousMonthStart,
            lte: previousMonthEnd
          }
        },
        _sum: { amount: true }
      }),
      prisma.payment.count({
        where: { 
          paymentStatus: 'COMPLETED',
          createdAt: {
            gte: currentMonthStart,
            lte: currentMonthEnd
          }
        }
      }),
      prisma.payment.count({
        where: { 
          paymentStatus: 'COMPLETED',
          createdAt: {
            gte: previousMonthStart,
            lte: previousMonthEnd
          }
        }
      })
    ]);

    const currentRevenue = currentMonthRevenue._sum.amount || 0;
    const previousRevenue = previousMonthRevenue._sum.amount || 0;
    const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    
    const transactionChange = previousMonthTransactions > 0 ? ((currentMonthTransactions - previousMonthTransactions) / previousMonthTransactions) * 100 : 0;

    console.log(`Payment stats: Total=${totalPayments}, Completed=${completedPayments}, Pending=${pendingPayments}, Failed=${failedPayments}`);
    console.log(`Revenue change: ${revenueChange.toFixed(1)}%, Transaction change: ${transactionChange.toFixed(1)}%`);

    return {
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments,
      totalRevenue: totalRevenue._sum.amount || 0,
      monthlyRevenue: currentRevenue,
      revenueChange: Math.round(revenueChange * 10) / 10, // Round to 1 decimal place
      transactionChange: Math.round(transactionChange * 10) / 10,
      currentMonthTransactions,
      previousMonthTransactions
    };
  }

  async getMonthlyRevenue(adminEmail: string, year: number = new Date().getFullYear()) {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      throw new NotFoundError('Admin not found');
    }
    if (admin.role !== 'ADMIN') {
      throw new BadRequestError('Only admins can view payment statistics');
    }

    console.log(`Fetching monthly revenue for year: ${year}`);

    // Get all completed payments for the year
    const payments = await prisma.payment.findMany({
      where: { 
        paymentStatus: 'COMPLETED',
        createdAt: {
          gte: new Date(year, 0, 1), // January 1st of the year
          lt: new Date(year + 1, 0, 1) // January 1st of next year
        }
      },
      select: {
        amount: true,
        createdAt: true
      }
    });

    console.log(`Found ${payments.length} completed payments for ${year}`);

    // Initialize array with all 12 months
    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(year, i, 1).toLocaleString('default', { month: 'short' }),
      revenue: 0
    }));

    // Sum up payments by month
    payments.forEach(payment => {
      const month = new Date(payment.createdAt).getMonth();
      monthlyRevenue[month].revenue += payment.amount;
    });

    console.log('Monthly revenue data:', monthlyRevenue);

    return monthlyRevenue;
  }

  private mapToPaymentDto(payment: any) {
    return {
      id: payment.id,
      applicationId: payment.application?.applicationNumber || 'N/A',
      applicant: payment.user?.name || 'Unknown',
      applicantEmail: payment.user?.email || 'N/A',
      amount: payment.amount,
      currency: payment.currency,
      date: payment.createdAt,
      method: payment.stripePaymentId ? 'Credit Card' : 'Unknown',
      status: payment.paymentStatus.toLowerCase(),
      visaType: payment.application?.visaType?.name || 'N/A'
    };
  }

  private mapToDetailedPaymentDto(payment: any) {
    return {
      id: payment.id,
      applicationId: payment.application?.applicationNumber || 'N/A',
      applicant: {
        name: payment.user?.name || 'Unknown',
        email: payment.user?.email || 'N/A',
        phone: payment.user?.phone || 'N/A'
      },
      amount: payment.amount,
      currency: payment.currency,
      date: payment.createdAt,
      method: payment.stripePaymentId ? 'Credit Card' : 'Unknown',
      status: payment.paymentStatus.toLowerCase(),
      stripePaymentId: payment.stripePaymentId,
      application: payment.application,
      cardDetails: payment.stripePaymentId ? {
        type: 'Visa', // This would come from Stripe in a real implementation
        last4: '4242', // This would come from Stripe in a real implementation
        expiry: '05/27' // This would come from Stripe in a real implementation
      } : null,
      items: [
        {
          description: `${payment.application?.visaType?.name || 'Visa'} Application Fee`,
          amount: payment.amount * 0.94 // 94% of total
        },
        {
          description: 'Processing Fee',
          amount: payment.amount * 0.06 // 6% of total
        }
      ],
      billingAddress: {
        line1: '123 Main St',
        line2: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'United States'
      },
      transactionId: payment.stripePaymentId,
      paymentProcessor: 'Stripe'
    };
  }
}