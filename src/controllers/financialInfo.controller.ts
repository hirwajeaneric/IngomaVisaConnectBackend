import { Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { prisma } from '../lib/prisma';

export class FinancialInfoController {
  static getFinancialInfo = [
    authenticate,
    check('applicationId').isUUID().withMessage('Invalid application ID'),
    async (req: Request & { user?: { id: string } }, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new BadRequestError(errors.array()[0].msg);
        }

        const { applicationId } = req.params;
        const userId = req.user?.id;

        if (!userId) {
          throw new BadRequestError('User ID is required');
        }

        // Get application and verify ownership
        const application = await prisma.visaApplication.findUnique({
          where: { id: applicationId }
        });

        if (!application) {
          throw new NotFoundError('Application not found');
        }

        if (application.userId !== userId) {
          throw new BadRequestError('Access denied');
        }

        res.json({
          success: true,
          message: 'Financial information retrieved successfully',
          data: {
            fundingSource: application.fundingSource,
            monthlyIncome: application.monthlyIncome
          }
        });
      } catch (error) {
        if (error instanceof Error) {
          res.status(error instanceof BadRequestError || error instanceof NotFoundError ? 400 : 500).json({
            success: false,
            message: error.message
          });
        } else {
          res.status(500).json({
            success: false,
            message: 'An unexpected error occurred'
          });
        }
      }
    }
  ];

  static createOrUpdateFinancialInfo = [
    authenticate,
    check('applicationId').isUUID().withMessage('Invalid application ID'),
    check('fundingSource').notEmpty().withMessage('Funding source is required'),
    check('monthlyIncome').isNumeric().withMessage('Monthly income must be a number'),
    async (req: Request & { user?: { id: string } }, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new BadRequestError(errors.array()[0].msg);
        }

        const { applicationId } = req.params;
        const userId = req.user?.id;
        const data = req.body;

        if (!userId) {
          throw new BadRequestError('User ID is required');
        }

        // Get user email for audit log
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true }
        });

        if (!user) {
          throw new BadRequestError('User not found');
        }

        // Verify application exists and belongs to user
        const application = await prisma.visaApplication.findUnique({
          where: { id: applicationId }
        });

        if (!application) {
          throw new NotFoundError('Application not found');
        }

        if (application.userId !== userId) {
          throw new BadRequestError('Access denied');
        }

        // Update financial information
        const updatedApplication = await prisma.visaApplication.update({
          where: { id: applicationId },
          data: {
            fundingSource: data.fundingSource,
            monthlyIncome: parseFloat(data.monthlyIncome)
          }
        });

        // Log the update
        await prisma.auditLog.create({
          data: {
            email: user.email,
            userRole: 'USER',
            action: 'FINANCIAL_INFO_UPDATED',
            entityType: 'VISA_APPLICATION',
            details: { detail: `Updated financial information for application ${applicationId}` }
          }
        });

        res.json({
          success: true,
          message: 'Financial information updated successfully',
          data: {
            fundingSource: updatedApplication.fundingSource,
            monthlyIncome: updatedApplication.monthlyIncome
          }
        });
      } catch (error) {
        if (error instanceof BadRequestError || error instanceof NotFoundError) {
          res.status(400).json({
            success: false,
            message: error.message
          });
          return;
        }
        
        console.error('Error in createOrUpdateFinancialInfo:', error);
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  ];
} 