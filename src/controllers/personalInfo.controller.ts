import { Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { BadRequestError, NotFoundError } from '../middleware/error.middleware';
import { prisma } from '../lib/prisma';

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

  static createOrUpdatePersonalInfo = [
    authenticate,
    check('applicationId').isUUID().withMessage('Invalid application ID'),
    check('firstName').notEmpty().withMessage('First name is required'),
    check('lastName').notEmpty().withMessage('Last name is required'),
    check('dateOfBirth').isISO8601().withMessage('Invalid date of birth'),
    check('nationality').notEmpty().withMessage('Nationality is required'),
    check('passportNumber').notEmpty().withMessage('Passport number is required'),
    check('passportIssueDate').isISO8601().withMessage('Invalid passport issue date'),
    check('passportExpiryDate').isISO8601().withMessage('Invalid passport expiry date'),
    check('passportIssuingCountry').notEmpty().withMessage('Place of passport issuance is required'),
    check('gender').isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
    check('email').isEmail().withMessage('Invalid email format'),
    check('phone').notEmpty().withMessage('Phone number is required'),
    check('address').notEmpty().withMessage('Current address is required'),
    async (req: Request & { user?: { id: string } }, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new BadRequestError(errors.array()[0].msg);
        }

        const { applicationId } = req.params;
        const userId = req.user?.id;
        const personalInfo = req.body;

        if (!userId) {
          throw new BadRequestError('User ID is required');
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

        // Update personal information
        const updatedApplication = await prisma.visaApplication.update({
          where: { id: applicationId },
          data: {
            personalInfo: {
              upsert: {
                create: {
                  ...personalInfo,
                  userId
                },
                update: personalInfo
              }
            }
          },
          include: {
            personalInfo: true
          }
        });

        // Log the update
        await prisma.auditLog.create({
          data: {
            email: userId,
            userRole: 'USER',
            action: 'PERSONAL_INFO_UPDATED',
            entityType: 'VISA_APPLICATION',
            details: { detail: `Updated personal information for application ${applicationId}` }
          }
        });

        res.json({
          success: true,
          message: 'Personal information updated successfully',
          data: updatedApplication.personalInfo
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
}
