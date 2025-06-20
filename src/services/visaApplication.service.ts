import prisma from '../config/database';
import { Status, VisaApplication } from '../generated/prisma';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';

export class VisaApplicationService {
  async createApplication(userId: string, visaTypeId: string): Promise<any> {
    console.log('[VisaApplicationService] Creating application:', {
      userId,
      visaTypeId,
      timestamp: new Date().toISOString()
    });

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if visa type exists and is active
    const visaType = await prisma.visaType.findUnique({ 
      where: { id: visaTypeId }
    });
    if (!visaType || !visaType.isActive) {
      throw new NotFoundError('Visa type not found or inactive');
    }

    // Check for existing pending applications for this user
    const existingApplication = await prisma.visaApplication.findFirst({
      where: {
        userId,
        visaTypeId,
        status: 'PENDING',
        submissionDate: null // Only check unsubmitted applications
      }
    });

    if (existingApplication) {
      console.log('[VisaApplicationService] Found existing pending application:', {
        applicationId: existingApplication.id,
        userId,
        visaTypeId
      });
      return this.mapToApplicationDto(existingApplication);
    }

    // Generate application number (format: VISA-YYYY-XXXXX)
    const applicationNumber = `VISA-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    console.log('[VisaApplicationService] No existing application found, creating new one:', {
      applicationNumber,
      userId,
      visaTypeId
    });

    const application = await prisma.visaApplication.create({
      data: {
        applicationNumber,
        userId,
        visaTypeId,
        status: Status.PENDING,
        submissionDate: null, // Will be set when application is submitted
      },
      include: {
        visaType: true,
        personalInfo: true,
        travelInfo: true,
        documents: true,
        payment: true,
      }
    });

    await this.logAuditEvent(userId, 'APPLICATION_CREATED', `Created application: ${applicationNumber}`);
    
    console.log('[VisaApplicationService] Successfully created application:', {
      applicationId: application.id,
      applicationNumber,
      userId,
      visaTypeId
    });

    return this.mapToApplicationDto(application);
  }

  async getApplicationById(userId: string, applicationId: string): Promise<any> {
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: {
        visaType: true,
        personalInfo: true,
        travelInfo: true,
        documents: true,
        payment: true,
      }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    // Only allow access to own applications unless admin/officer
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (application.userId !== userId && !['ADMIN', 'OFFICER'].includes(user.role)) {
      throw new ForbiddenError('Access denied');
    }

    return this.mapToApplicationDto(application);
  }

  async getUserApplications(userId: string): Promise<any[]> {
    const applications = await prisma.visaApplication.findMany({
      where: { userId },
      include: {
        visaType: true,
        personalInfo: true,
        travelInfo: true,
        documents: true,
        payment: true,
      },
      orderBy: { submissionDate: 'desc' }
    });

    return applications.map(this.mapToApplicationDto);
  }

  async submitApplication(userId: string, applicationId: string): Promise<any> {
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: {
        personalInfo: true,
        travelInfo: true,
        documents: true,
        visaType: true,
      }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (application.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    if (application.status !== Status.PENDING) {
      throw new BadRequestError('Application cannot be submitted');
    }

    // Validate required information
    if (!application.personalInfo || !application.travelInfo) {
      throw new BadRequestError('Personal and travel information are required');
    }

    const updatedApplication = await prisma.visaApplication.update({
      where: { id: applicationId },
      data: {
        status: Status.SUBMITTED,
        submissionDate: new Date(),
      },
      include: {
        visaType: true,
        personalInfo: true,
        travelInfo: true,
        documents: true,
        payment: true,
      }
    });

    // Create notification for submission
    await prisma.notification.create({
      data: {
        userId,
        applicationId,
        type: 'APPLICATION_SUBMITTED',
        message: `Your visa application ${application.applicationNumber} has been submitted successfully.`,
      }
    });

    await this.logAuditEvent(userId, 'APPLICATION_SUBMITTED', `Submitted application: ${application.applicationNumber}`);
    return this.mapToApplicationDto(updatedApplication);
  }

  async updateApplicationStatus(officerId: string, applicationId: string, status: Status, rejectionReason?: string): Promise<any> {
    const officer = await prisma.user.findUnique({ where: { id: officerId } });
    if (!officer || !['ADMIN', 'OFFICER'].includes(officer.role)) {
      throw new ForbiddenError('Only officers can update application status');
    }

    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: {
        visaType: true,
        personalInfo: true,
        travelInfo: true,
        documents: true,
        payment: true,
      }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (application.status === status) {
      throw new BadRequestError('Application is already in this status');
    }

    const updatedApplication = await prisma.visaApplication.update({
      where: { id: applicationId },
      data: {
        status,
        decisionDate: new Date(),
        rejectionReason: status === Status.REJECTED ? rejectionReason : null,
        expiryDate: status === Status.APPROVED ? 
          new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)) : // 90 days from approval
          null
      },
      include: {
        visaType: true,
        personalInfo: true,
        travelInfo: true,
        documents: true,
        payment: true,
      }
    });

    // Create notification for status update
    await prisma.notification.create({
      data: {
        userId: application.userId,
        applicationId,
        type: 'APPLICATION_STATUS_UPDATED',
        message: `Your visa application ${application.applicationNumber} has been ${status.toLowerCase()}.`,
      }
    });

    await this.logAuditEvent(
      officerId, 
      'APPLICATION_STATUS_UPDATED',
      `Updated application ${application.applicationNumber} status to ${status}`
    );

    return this.mapToApplicationDto(updatedApplication);
  }

  async getAllApplications(): Promise<any[]> {
    const applications = await prisma.visaApplication.findMany({
      include: {
        visaType: true,
        user: true,
      }
    });
    return applications;
  }

  private mapToApplicationDto(application: any): any {
    return {
      id: application.id,
      applicationNumber: application.applicationNumber,
      status: application.status,
      submissionDate: application.submissionDate?.toISOString(),
      decisionDate: application.decisionDate?.toISOString(),
      expiryDate: application.expiryDate?.toISOString(),
      rejectionReason: application.rejectionReason,
      visaType: application.visaType,
      personalInfo: application.personalInfo,
      travelInfo: application.travelInfo,
      documents: application.documents,
      payment: application.payment,
      fundingSource: application.fundingSource,
      monthlyIncome: application.monthlyIncome,
    };
  }

  private async logAuditEvent(userId: string, action: string, details: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.auditLog.create({
      data: {
        user: { connect: { id: userId } },
        userRole: user?.role || 'UNKNOWN',
        action,
        entityType: 'VISA_APPLICATION',
        details: { detail: details },
        createdAt: new Date(),
      },
    });
  }
}
