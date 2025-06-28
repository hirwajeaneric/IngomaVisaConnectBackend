import prisma from '../config/database';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';
import { RequestForDocumentStatus } from '../generated/prisma';
import { MailUtil } from '../utils/mail.utils';

export interface CreateRequestForDocumentData {
  documentName: string;
  additionalDetails?: string;
}

export interface UpdateRequestForDocumentData {
  documentName?: string;
  additionalDetails?: string;
}

export class RequestForDocumentService {
  async createRequestForDocument(
    officerId: string,
    applicationId: string,
    data: CreateRequestForDocumentData
  ): Promise<any> {
    // Verify officer exists and has proper permissions
    const officer = await prisma.user.findUnique({ where: { id: officerId } });
    if (!officer || !['ADMIN', 'OFFICER'].includes(officer.role)) {
      throw new ForbiddenError('Only officers can request documents');
    }

    // Verify application exists
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: { 
        user: true,
        visaType: true
      }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    // Create the document request
    const requestForDocument = await prisma.requestForDocument.create({
      data: {
        applicationId,
        documentName: data.documentName,
        additionalDetails: data.additionalDetails,
        officerId,
        status: RequestForDocumentStatus.SENT,
      },
      include: {
        application: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        officer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      }
    });

    await this.logAuditEvent(
      officerId,
      'DOCUMENT_REQUEST_CREATED',
      `Created document request: ${data.documentName} for application: ${application.applicationNumber}`
    );

    // Send email notification to applicant
    try {
      await MailUtil.sendDocumentRequestCreatedEmail(
        application.user.email,
        application.applicationNumber,
        data.documentName,
        data.additionalDetails,
        officer.name
      );
    } catch (error) {
      console.error('Failed to send document request email:', error);
      // Don't fail the operation if email fails
    }

    return this.mapToRequestForDocumentDto(requestForDocument);
  }

  async getApplicationDocumentRequests(userId: string, applicationId: string): Promise<any[]> {
    // Verify application exists and user has access
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: { user: true }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    // Check if user has access to this application
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (application.userId !== userId && !['ADMIN', 'OFFICER'].includes(user.role)) {
      throw new ForbiddenError('Access denied');
    }

    const requests = await prisma.requestForDocument.findMany({
      where: { applicationId },
      include: {
        officer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        document: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return requests.map(this.mapToRequestForDocumentDto);
  }

  async getRequestForDocumentById(userId: string, requestId: string): Promise<any> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const request = await prisma.requestForDocument.findUnique({
      where: { id: requestId },
      include: {
        application: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        officer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        document: true
      }
    });

    if (!request) {
      throw new NotFoundError('Document request not found');
    }

    // Check if user has access to this request
    if (request.application.userId !== userId && !['ADMIN', 'OFFICER'].includes(user.role)) {
      throw new ForbiddenError('Access denied');
    }

    return this.mapToRequestForDocumentDto(request);
  }

  async updateRequestForDocument(
    officerId: string,
    requestId: string,
    data: UpdateRequestForDocumentData
  ): Promise<any> {
    // Verify officer exists and has proper permissions
    const officer = await prisma.user.findUnique({ where: { id: officerId } });
    if (!officer || !['ADMIN', 'OFFICER'].includes(officer.role)) {
      throw new ForbiddenError('Only officers can update document requests');
    }

    const request = await prisma.requestForDocument.findUnique({
      where: { id: requestId },
      include: {
        application: true,
        officer: true
      }
    });

    if (!request) {
      throw new NotFoundError('Document request not found');
    }

    // Only the officer who created the request can update it
    if (request.officerId !== officerId) {
      throw new ForbiddenError('Only the requesting officer can update this request');
    }

    // Cannot update if already submitted or cancelled
    if (request.status !== RequestForDocumentStatus.SENT) {
      throw new BadRequestError('Cannot update a request that has been submitted or cancelled');
    }

    const updatedRequest = await prisma.requestForDocument.update({
      where: { id: requestId },
      data: {
        documentName: data.documentName,
        additionalDetails: data.additionalDetails,
      },
      include: {
        application: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        officer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        document: true
      }
    });

    await this.logAuditEvent(
      officerId,
      'DOCUMENT_REQUEST_UPDATED',
      `Updated document request: ${requestId}`
    );

    return this.mapToRequestForDocumentDto(updatedRequest);
  }

  async cancelRequestForDocument(officerId: string, requestId: string): Promise<any> {
    // Verify officer exists and has proper permissions
    const officer = await prisma.user.findUnique({ where: { id: officerId } });
    if (!officer || !['ADMIN', 'OFFICER'].includes(officer.role)) {
      throw new ForbiddenError('Only officers can cancel document requests');
    }

    const request = await prisma.requestForDocument.findUnique({
      where: { id: requestId },
      include: {
        application: {
          include: {
            user: true,
            visaType: true
          }
        },
        officer: true
      }
    });

    if (!request) {
      throw new NotFoundError('Document request not found');
    }

    // Only the officer who created the request can cancel it
    if (request.officerId !== officerId) {
      throw new ForbiddenError('Only the requesting officer can cancel this request');
    }

    // Cannot cancel if already submitted
    if (request.status === RequestForDocumentStatus.SUBMITTED) {
      throw new BadRequestError('Cannot cancel a request that has been submitted');
    }

    // Cannot cancel if already cancelled
    if (request.status === RequestForDocumentStatus.CANCELLED) {
      throw new BadRequestError('Request is already cancelled');
    }

    const updatedRequest = await prisma.requestForDocument.update({
      where: { id: requestId },
      data: {
        status: RequestForDocumentStatus.CANCELLED,
      },
      include: {
        application: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        officer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        document: true
      }
    });

    await this.logAuditEvent(
      officerId,
      'DOCUMENT_REQUEST_CANCELLED',
      `Cancelled document request: ${requestId}`
    );

    // Send email notification to applicant
    try {
      await MailUtil.sendDocumentRequestCancelledEmail(
        request.application.user.email,
        request.application.applicationNumber,
        request.documentName,
        officer.name
      );
    } catch (error) {
      console.error('Failed to send document request cancellation email:', error);
      // Don't fail the operation if email fails
    }

    return this.mapToRequestForDocumentDto(updatedRequest);
  }

  async submitDocumentForRequest(
    userId: string,
    requestId: string,
    documentData: {
      documentType: string;
      fileName: string;
      filePath: string;
      fileSize: number;
    }
  ): Promise<any> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const request = await prisma.requestForDocument.findUnique({
      where: { id: requestId },
      include: {
        application: {
          include: {
            user: true,
            visaType: true
          }
        },
        officer: true
      }
    });

    if (!request) {
      throw new NotFoundError('Document request not found');
    }

    // Only the applicant can submit documents for their own application
    if (request.application.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    // Cannot submit if request is cancelled
    if (request.status === RequestForDocumentStatus.CANCELLED) {
      throw new BadRequestError('Cannot submit document for a cancelled request');
    }

    // Cannot submit if already submitted
    if (request.status === RequestForDocumentStatus.SUBMITTED) {
      throw new BadRequestError('Document has already been submitted for this request');
    }

    // Create the document
    const document = await prisma.document.create({
      data: {
        applicationId: request.applicationId,
        documentType: documentData.documentType,
        fileName: documentData.fileName,
        filePath: documentData.filePath,
        fileSize: documentData.fileSize,
        verificationStatus: 'PENDING',
      }
    });

    // Update the request status to submitted and link the document
    const updatedRequest = await prisma.requestForDocument.update({
      where: { id: requestId },
      data: {
        status: RequestForDocumentStatus.SUBMITTED,
        documentId: document.id,
      },
      include: {
        application: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        officer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        document: true
      }
    });

    await this.logAuditEvent(
      userId,
      'DOCUMENT_SUBMITTED_FOR_REQUEST',
      `Submitted document for request: ${requestId}`
    );

    // Send email notification to officer
    try {
      await MailUtil.sendDocumentSubmittedForRequestEmail(
        request.officer.email,
        request.application.user.name,
        request.application.applicationNumber,
        request.documentName,
        documentData.fileName
      );
    } catch (error) {
      console.error('Failed to send document submission email:', error);
      // Don't fail the operation if email fails
    }

    return this.mapToRequestForDocumentDto(updatedRequest);
  }

  private mapToRequestForDocumentDto(request: any): any {
    return {
      id: request.id,
      applicationId: request.applicationId,
      documentName: request.documentName,
      additionalDetails: request.additionalDetails,
      status: request.status,
      officer: request.officer,
      document: request.document,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }

  private async logAuditEvent(userId: string, action: string, details: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.auditLog.create({
      data: {
        user: { connect: { id: userId } },
        userRole: user?.role || 'UNKNOWN',
        action,
        entityType: 'REQUEST_FOR_DOCUMENT',
        details: { detail: details },
        createdAt: new Date(),
      },
    });
  }
}
