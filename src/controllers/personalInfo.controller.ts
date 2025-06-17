import { Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { BadRequestError, NotFoundError } from '../middleware/error.middleware';
import { prisma } from '../lib/prisma';
import { PersonalInfoService } from '../services/personalInfo.service';

const personalInfoService = new PersonalInfoService();

export class PersonalInfoController {
  static getPersonalInfo = [
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
          where: { id: applicationId },
          include: { personalInfo: true }
        });

        if (!application) {
          throw new NotFoundError('Application not found');
        }

        if (application.userId !== userId) {
          throw new BadRequestError('Access denied');
        }

        res.json({
          success: true,
          message: 'Personal information retrieved successfully',
          data: application.personalInfo
        });
      } catch (error) {
        throw error;
      }
    }
  ];

  static createOrUpdatePersonalInfo = [
    authenticate,
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

        // Format dates to ISO strings
        const formattedData = {
          ...data,
          dateOfBirth: new Date(data.dateOfBirth).toISOString(),
          passportIssueDate: new Date(data.passportIssueDate).toISOString(),
          passportExpiryDate: new Date(data.passportExpiryDate).toISOString(),
        };

        const result = await personalInfoService.createOrUpdatePersonalInfo(userId, applicationId, formattedData);
        
        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        throw error;
      }
    }
  ];
}
