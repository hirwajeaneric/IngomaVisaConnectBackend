import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { BadRequestError, NotFoundError } from '../utils/errors';

interface RequestWithUser extends Request {
  user?: {
    id: string;
  };
}

export class FinancialInfoController {
  static getFinancialInfo = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const { applicationId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
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
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        res.status(400).json({
          success: false,
          message: error.message
        });
        return;
      }
      
      console.error('Error in getFinancialInfo:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  static createOrUpdateFinancialInfo = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
      const { applicationId } = req.params;
      const userId = req.user?.id;
      const data = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      // Get user email for audit log
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true }
      });

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found'
        });
        return;
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
  };
} 