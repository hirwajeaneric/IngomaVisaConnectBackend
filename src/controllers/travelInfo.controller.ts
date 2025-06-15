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

  static getTravelInfo = async (req: RequestWithUser, res: Response): Promise<void> => {
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

      const travelInfo = await prisma.travelInfo.findFirst({
        where: {
          application: {
            id: applicationId,
            userId
          }
        }
      });

      if (!travelInfo) {
        res.status(404).json({
          success: false,
          message: 'Travel information not found'
        });
        return;
      }

      res.json({
        success: true,
        data: travelInfo
      });
    } catch (error) {
      console.error('Error in getTravelInfo:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  static createOrUpdateTravelInfo = async (req: RequestWithUser, res: Response): Promise<void> => {
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
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        res.status(400).json({
          success: false,
          message: error.message
        });
        return;
      }
      
      console.error('Error in createOrUpdateTravelInfo:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

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
