import prisma from '../config/database';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';
import { VerificationStatus } from '../generated/prisma';

// Define allowed document types matching frontend
const ALLOWED_DOCUMENT_TYPES = [
  'passportCopy',
  'photos',
  'yellowFeverCertificate',
  'travelInsurance',
  'invitationLetter',
  'employmentContract',
  'workPermit',
  'admissionLetter',
  'academicTranscripts',
  'criminalRecord',
  'medicalCertificate',
  'onwardTicket',
  'finalDestinationVisa'
] as const;

type DocumentType = typeof ALLOWED_DOCUMENT_TYPES[number];

export interface DocumentUploadData {
  documentType: DocumentType;
  fileName: string;
  filePath: string;
  fileSize: number;
}

export class DocumentService {
  async uploadDocument(userId: string, applicationId: string, data: DocumentUploadData): Promise<any> {
    // Validate document type
    if (!ALLOWED_DOCUMENT_TYPES.includes(data.documentType as DocumentType)) {
      throw new BadRequestError(`Invalid document type: ${data.documentType}`);
    }

    // Verify user and application
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: { documents: true }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (application.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    // Check if document of this type already exists
    const existingDocument = application.documents.find(
      doc => doc.documentType === data.documentType
    );

    let document;
    if (existingDocument) {
      // Update existing document
      document = await prisma.document.update({
        where: { id: existingDocument.id },
        data: {
          fileName: data.fileName,
          filePath: data.filePath,
          fileSize: data.fileSize,
          verificationStatus: VerificationStatus.PENDING,
          verifiedBy: null,
          verifiedAt: null,
          rejectionReason: null,
          uploadDate: new Date(),
        }
      });
    } else {
      // Create new document
      document = await prisma.document.create({
        data: {
          documentType: data.documentType,
          fileName: data.fileName,
          filePath: data.filePath,
          fileSize: data.fileSize,
          verificationStatus: VerificationStatus.PENDING,
          application: { connect: { id: applicationId } }
        }
      });
    }

    await this.logAuditEvent(
      userId,
      existingDocument ? 'DOCUMENT_UPDATED' : 'DOCUMENT_UPLOADED',
      `${existingDocument ? 'Updated' : 'Uploaded'} ${data.documentType} for application: ${application.applicationNumber}`
    );

    return this.mapToDocumentDto(document);
  }

  async getApplicationDocuments(userId: string, applicationId: string): Promise<any[]> {
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: { documents: true }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (application.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    return application.documents.map(this.mapToDocumentDto);
  }

  async verifyDocument(officerId: string, documentId: string, isApproved: boolean, rejectionReason?: string): Promise<any> {
    const officer = await prisma.user.findUnique({ where: { id: officerId } });
    if (!officer || !['ADMIN', 'OFFICER'].includes(officer.role)) {
      throw new ForbiddenError('Only officers can verify documents');
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        application: true,
      }
    });

    if (!document) {
      throw new NotFoundError('Document not found');
    }

    const verificationStatus = isApproved ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        verificationStatus,
        verifiedBy: officerId,
        verifiedAt: new Date(),
        rejectionReason: isApproved ? null : rejectionReason,
      }
    });

    // Create notification for document verification
    await prisma.notification.create({
      data: {
        userId: document.application.userId,
        applicationId: document.application.id,
        type: 'DOCUMENT_REQUIRED',
        message: isApproved
          ? `Your ${document.documentType} has been verified successfully.`
          : `Your ${document.documentType} was rejected. Reason: ${rejectionReason}`,
      }
    });

    await this.logAuditEvent(
      officerId,
      isApproved ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED',
      `${isApproved ? 'Verified' : 'Rejected'} document for application: ${document.applicationId}`
    );

    return this.mapToDocumentDto(updatedDocument);
  }

  private mapToDocumentDto(document: any): any {
    return {
      id: document.id,
      documentType: document.documentType,
      fileName: document.fileName,
      filePath: document.filePath,
      fileSize: document.fileSize,
      uploadDate: document.uploadDate.toISOString(),
      verificationStatus: document.verificationStatus,
      verifiedBy: document.verifiedBy,
      verifiedAt: document.verifiedAt?.toISOString(),
      rejectionReason: document.rejectionReason,
    };
  }

  private async logAuditEvent(userId: string, action: string, details: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    await prisma.auditLog.create({
      data: {
        user: { connect: { id: userId } },
        userRole: user?.role || 'UNKNOWN',
        action,
        entityType: 'DOCUMENT',
        details: { detail: details },
        createdAt: new Date(),
      },
    });
  }
}
