import { Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import { DocumentService } from '../services/document.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { BadRequestError } from '../utils/errors';

const documentService = new DocumentService();

export class DocumentController {
  static uploadDocument = [
    authenticate,
    check('applicationId').notEmpty().withMessage('Application ID is required').isString().withMessage('Application ID must be a string'),
    check('documentType')
      .notEmpty().withMessage('Document type is required')
      .isString().withMessage('Document type must be a string')
      .custom((value) => {
        const allowedTypes = [
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
        ];
        if (!allowedTypes.includes(value)) {
          throw new Error('Invalid document type');
        }
        return true;
      }),
    check('fileName').notEmpty().withMessage('File name is required'),
    check('filePath').notEmpty().withMessage('File path is required'),
    check('fileSize').isInt({ min: 1 }).withMessage('Invalid file size'),
    async (req: Request & { user?: { id: string } }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError('User not authenticated');
      }

      console.log(req.body);

      const document = await documentService.uploadDocument(
        userId,
        req.params.applicationId,
        req.body
      );

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: document
      });
    }
  ];

  static getApplicationDocuments = [
    authenticate,
    check('applicationId').isUUID().withMessage('Invalid application ID'),
    async (req: Request & { user?: { id: string } }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError('User not authenticated');
      }

      const documents = await documentService.getApplicationDocuments(userId, req.params.applicationId);

      res.json({
        success: true,
        message: 'Documents retrieved successfully',
        data: documents
      });
    }
  ];

  static verifyDocument = [
    authenticate,
    authorize('APPLICATIONS_MANAGE_APPLICATIONS'),
    check('documentId').isUUID().withMessage('Invalid document ID'),
    check('isApproved').isBoolean().withMessage('isApproved must be a boolean'),
    check('rejectionReason')
      .if(check('isApproved').equals('false'))
      .notEmpty()
      .withMessage('Rejection reason is required when rejecting a document'),
    async (req: Request & { user?: { id: string } }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const officerId = req.user?.id;
      if (!officerId) {
        throw new BadRequestError('User not authenticated');
      }

      const { isApproved, rejectionReason } = req.body;
      const document = await documentService.verifyDocument(
        officerId,
        req.params.documentId,
        isApproved,
        rejectionReason
      );

      res.json({
        success: true,
        message: `Document ${isApproved ? 'approved' : 'rejected'} successfully`,
        data: document
      });
    }
  ];
}
