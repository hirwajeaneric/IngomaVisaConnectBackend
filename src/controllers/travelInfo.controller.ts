import { Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import { TravelInfoService } from '../services/travelInfo.service';
import { authenticate, UserPayload } from '../middleware/auth.middleware';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { VisaApplicationService } from '../services/visaApplication.service';
import { TravelInfo } from '../generated/prisma';
import { prisma } from '../lib/prisma';

const travelInfoService = new TravelInfoService();

export class TravelInfoController {
  private visaApplicationService: VisaApplicationService;

  constructor() {
    this.visaApplicationService = new VisaApplicationService();
  }

  static getTravelInfo = [
    authenticate,
    check('applicationId').isUUID().withMessage('Invalid application ID'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
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
          include: { travelInfo: true }
        });

        if (!application) {
          throw new NotFoundError('Application not found');
        }

        if (application.userId !== userId) {
          throw new BadRequestError('Access denied');
        }

        res.json({
          success: true,
          message: 'Travel information retrieved successfully',
          data: application.travelInfo
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

  static createOrUpdateTravelInfo = [
    authenticate,
    check('applicationId').isUUID().withMessage('Invalid application ID'),
    check('visaTypeId').isUUID().withMessage('Invalid visa type ID'),
    check('purposeOfTravel').notEmpty().withMessage('Purpose of travel is required'),
    check('entryDate').isISO8601().withMessage('Invalid entry date'),
    check('exitDate').isISO8601().withMessage('Invalid exit date'),
    check('portOfEntry').notEmpty().withMessage('Port of entry is required'),
    check('previousVisits').isBoolean().withMessage('Previous visits must be boolean'),
    check('accommodation').notEmpty().withMessage('Accommodation details are required'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new BadRequestError(errors.array()[0].msg);
        }

        const { applicationId } = req.params;
        const userId = req.user?.id;
        const travelInfo = req.body;

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

        // Verify visa type exists
        const visaType = await prisma.visaType.findUnique({
          where: { id: travelInfo.visaTypeId }
        });

        if (!visaType || !visaType.isActive) {
          throw new BadRequestError('Invalid or inactive visa type');
        }

        // First find existing travel info
        const existingTravelInfo = await prisma.travelInfo.findFirst({
          where: {
            application: {
              id: applicationId
            }
          }
        });

        // Update or create travel info
        const updatedTravelInfo = await prisma.travelInfo.upsert({
          where: {
            id: existingTravelInfo?.id ?? 'new'
          },
          create: {
            ...travelInfo,
            application: {
              connect: {
                id: applicationId
              }
            }
          },
          update: travelInfo
        });

        // Log the update
        await prisma.auditLog.create({
          data: {
            email: userId,
            userRole: 'USER',
            action: 'TRAVEL_INFO_UPDATED',
            entityType: 'VISA_APPLICATION',
            details: { detail: `Updated travel information for application ${applicationId}` }
          }
        });

        res.json({
          success: true,
          message: 'Travel information updated successfully',
          data: updatedTravelInfo
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

  updateTravelInfo = async (req: Request & { user?: UserPayload }, res: Response) => {
    try {
      const { applicationId } = req.params;
      const userId = req.user?.id;
      const travelInfo: TravelInfo = req.body;

      if (!userId) {
        throw new BadRequestError('User ID is required');
      }

      // Verify application exists and belongs to user
      const application = await this.visaApplicationService.getApplicationById(userId, applicationId);
      
      if (!application) {
        throw new NotFoundError('Application not found');
      }

      // First find existing travel info
      const existingTravelInfo = await prisma.travelInfo.findFirst({
        where: {
          application: {
            id: applicationId
          }
        }
      });

      // Update or create travel info
      const updatedTravelInfo = await prisma.travelInfo.upsert({
        where: {
          id: existingTravelInfo?.id ?? 'new'
        },
        create: {
          ...travelInfo,
          application: {
            connect: {
              id: applicationId
            }
          }
        },
        update: travelInfo
      });

      // Log the update
      await prisma.auditLog.create({
        data: {
          email: userId,
          userRole: 'USER',
          action: 'TRAVEL_INFO_UPDATED',
          entityType: 'VISA_APPLICATION',
          details: { detail: `Updated travel information for application ${applicationId}` }
        }
      });

      res.json({
        success: true,
        message: 'Travel information updated successfully',
        data: updatedTravelInfo
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
  };
}
