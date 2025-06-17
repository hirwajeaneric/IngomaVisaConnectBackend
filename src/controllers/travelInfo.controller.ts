import { Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import { TravelInfoService } from '../services/travelInfo.service';
import { authenticate, UserPayload } from '../middleware/auth.middleware';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { VisaApplicationService } from '../services/visaApplication.service';
import { TravelInfo } from '../generated/prisma';
import { prisma } from '../lib/prisma';

const travelInfoService = new TravelInfoService();

interface RequestWithUser extends Request {
  user?: {
    id: string;
  };
}

export class TravelInfoController {
  private visaApplicationService: VisaApplicationService;

  constructor() {
    this.visaApplicationService = new VisaApplicationService();
  }

  static getTravelInfo = [
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
        throw error;
      }
    }
  ];

  static createOrUpdateTravelInfo = [
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

        // Format dates to ISO strings
        const formattedData = {
          purposeOfTravel: data.purposeOfTravel,
          entryDate: new Date(data.entryDate).toISOString(),
          exitDate: new Date(data.exitDate).toISOString(),
          previousVisits: data.previousVisits || false,
          intendedEntryDate: new Date(data.entryDate).toISOString(),
          intendedExitDate: new Date(data.exitDate).toISOString(),
          portOfEntry: data.portOfEntry,
          accommodationDetails: data.accommodationDetails,
          travelItinerary: data.travelItinerary,
          previousVisitDetails: data.previousVisitDetails,
          hostDetails: data.hostDetails,
          finalDestination: data.finalDestination,
          countriesVisitedOfAfterBurundi: data.countriesVisitedOfAfterBurundi
        };

        // Update or create travel info
        const updatedTravelInfo = await prisma.travelInfo.upsert({
          where: {
            id: application.travelInfoId || 'new'
          },
          create: {
            ...formattedData,
            application: {
              connect: {
                id: applicationId
              }
            }
          },
          update: formattedData
        });

        // Log the update
        await prisma.auditLog.create({
          data: {
            email: user.email,
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
        throw error;
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
      throw error;
    }
  };
}
