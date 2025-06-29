import prisma from '../config/database';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';

export interface PersonalInfoData {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  nationality: string;
  passportNumber: string;
  passportIssueDate: Date;
  passportExpiryDate: Date;
  passportIssuingCountry: string;
  gender: string;
  email: string;
  phone: string;
  maritalStatus?: string;
  address: string;
  currentAddress?: string;
  occupation?: string;
  employerDetails?: string;
  city: string;
  country: string;
  postalCode?: string;
}

export class PersonalInfoService {
  async createOrUpdatePersonalInfo(userId: string, applicationId: string, data: PersonalInfoData): Promise<any> {
    // Verify user and application
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: { personalInfo: true }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (application.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    // Format dates to ISO strings
    const formattedData = {
      ...data,
      dateOfBirth: new Date(data.dateOfBirth).toISOString(),
      passportIssueDate: new Date(data.passportIssueDate).toISOString(),
      passportExpiryDate: new Date(data.passportExpiryDate).toISOString(),
    };

    // Validate passport expiry date
    const today = new Date();
    if (new Date(formattedData.passportExpiryDate) < today) {
      throw new BadRequestError('Passport has expired');
    }

    // Calculate minimum validity period (usually 6 months)
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    if (new Date(formattedData.passportExpiryDate) < sixMonthsFromNow) {
      throw new BadRequestError('Passport must be valid for at least 6 months');
    }

    // Use upsert to handle both create and update cases
    const personalInfo = await prisma.personalInfo.upsert({
      where: {
        userId: userId
      },
      update: {
        ...formattedData,
        application: {
          connect: { id: applicationId }
        }
      },
      create: {
        ...formattedData,
        userId,
        application: {
          connect: { id: applicationId }
        }
      }
    });

    await this.logAuditEvent(
      userId,
      application.personalInfo ? 'PERSONAL_INFO_UPDATED' : 'PERSONAL_INFO_CREATED',
      `${application.personalInfo ? 'Updated' : 'Created'} personal info for application: ${application.applicationNumber}`
    );

    return this.mapToPersonalInfoDto(personalInfo);
  }

  async getPersonalInfo(userId: string, applicationId: string): Promise<any> {
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: { personalInfo: true }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (application.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    if (!application.personalInfo) {
      throw new NotFoundError('Personal information not found');
    }

    return this.mapToPersonalInfoDto(application.personalInfo);
  }

  private mapToPersonalInfoDto(personalInfo: any): any {
    return {
      id: personalInfo.id,
      firstName: personalInfo.firstName,
      lastName: personalInfo.lastName,
      dateOfBirth: personalInfo.dateOfBirth.toISOString(),
      nationality: personalInfo.nationality,
      passportNumber: personalInfo.passportNumber,
      passportIssueDate: personalInfo.passportIssueDate.toISOString(),
      passportExpiryDate: personalInfo.passportExpiryDate.toISOString(),
      passportIssuingCountry: personalInfo.passportIssuingCountry,
      gender: personalInfo.gender,
      email: personalInfo.email,
      phone: personalInfo.phone,
      maritalStatus: personalInfo.maritalStatus,
      address: personalInfo.address,
      currentAddress: personalInfo.currentAddress,
      occupation: personalInfo.occupation,
      employerDetails: personalInfo.employerDetails,
      city: personalInfo.city,
      country: personalInfo.country,
      postalCode: personalInfo.postalCode,
    };
  }

  private async logAuditEvent(userId: string, action: string, details: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.auditLog.create({
      data: {
        email: user?.email || 'unknown',
        userRole: user?.role || 'UNKNOWN',
        action,
        entityType: 'PERSONAL_INFO',
        details: { detail: details },
        createdAt: new Date(),
      },
    });
  }
}
