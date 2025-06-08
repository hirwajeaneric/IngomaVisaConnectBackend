import prisma from '../config/database';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';

export interface TravelInfoData {
  purposeOfTravel: string;
  intendedEntryDate: Date;
  intendedExitDate: Date;
  portOfEntry?: string;
  accommodationDetails?: string;
  travelItinerary?: string;
  previousVisitDetails?: string;
  hostDetails?: string;
  finalDestination?: string;
  countriesVisitedOfAfterBurundi?: string;
}

export class TravelInfoService {
  async createOrUpdateTravelInfo(userId: string, applicationId: string, data: TravelInfoData): Promise<any> {
    // Verify user and application
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: { travelInfo: true }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (application.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    // Validate dates
    const today = new Date();
    if (data.intendedEntryDate < today) {
      throw new BadRequestError('Entry date cannot be in the past');
    }

    if (data.intendedExitDate < data.intendedEntryDate) {
      throw new BadRequestError('Exit date must be after entry date');
    }

    // Calculate maximum stay duration (e.g., 90 days)
    const maxStayDuration = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
    const stayDuration = data.intendedExitDate.getTime() - data.intendedEntryDate.getTime();
    if (stayDuration > maxStayDuration) {
      throw new BadRequestError('Maximum stay duration is 90 days');
    }

    let travelInfo;
    if (application.travelInfo) {
      // Update existing travel info
      travelInfo = await prisma.travelInfo.update({
        where: { id: application.travelInfo.id },
        data: {
          ...data,
          intendedEntryDate: new Date(data.intendedEntryDate),
          intendedExitDate: new Date(data.intendedExitDate),
        }
      });
    } else {
      // Create new travel info
      travelInfo = await prisma.travelInfo.create({
        data: {
          ...data,
          intendedEntryDate: new Date(data.intendedEntryDate),
          intendedExitDate: new Date(data.intendedExitDate),
          application: { connect: { id: applicationId } }
        }
      });
    }

    await this.logAuditEvent(
      userId,
      application.travelInfo ? 'TRAVEL_INFO_UPDATED' : 'TRAVEL_INFO_CREATED',
      `${application.travelInfo ? 'Updated' : 'Created'} travel info for application: ${application.applicationNumber}`
    );

    return this.mapToTravelInfoDto(travelInfo);
  }

  async getTravelInfo(userId: string, applicationId: string): Promise<any> {
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: { travelInfo: true }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (application.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    if (!application.travelInfo) {
      throw new NotFoundError('Travel information not found');
    }

    return this.mapToTravelInfoDto(application.travelInfo);
  }

  private mapToTravelInfoDto(travelInfo: any): any {
    return {
      id: travelInfo.id,
      purposeOfTravel: travelInfo.purposeOfTravel,
      intendedEntryDate: travelInfo.intendedEntryDate.toISOString(),
      intendedExitDate: travelInfo.intendedExitDate.toISOString(),
      portOfEntry: travelInfo.portOfEntry,
      accommodationDetails: travelInfo.accommodationDetails,
      travelItinerary: travelInfo.travelItinerary,
      previousVisitDetails: travelInfo.previousVisitDetails,
      hostDetails: travelInfo.hostDetails,
      finalDestination: travelInfo.finalDestination,
      countriesVisitedOfAfterBurundi: travelInfo.countriesVisitedOfAfterBurundi,
    };
  }

  private async logAuditEvent(userId: string, action: string, details: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.auditLog.create({
      data: {
        user: { connect: { id: userId } },
        userRole: user?.role || 'UNKNOWN',
        action,
        entityType: 'TRAVEL_INFO',
        details: { detail: details },
        createdAt: new Date(),
      },
    });
  }
}
