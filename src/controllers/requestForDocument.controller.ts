import { Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import { RequestForDocumentService } from '../services/requestForDocument.service';
import { authenticate, authorize, UserPayload } from '../middleware/auth.middleware';
import { BadRequestError } from '../utils/errors';

const requestForDocumentService = new RequestForDocumentService();

export class RequestForDocumentController {
  static createRequestForDocument = [
    authenticate,
    authorize('APPLICATIONS_MANAGE_APPLICATIONS'),
    check('applicationId').isUUID().withMessage('Invalid application ID'),
    check('documentName').notEmpty().withMessage('Document name is required'),
    check('additionalDetails').optional().isString().withMessage('Additional details must be a string'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const officerId = req.user?.id;
      if (!officerId) {
        throw new BadRequestError('User not authenticated');
      }

      const { documentName, additionalDetails } = req.body;
      const requestForDocument = await requestForDocumentService.createRequestForDocument(
        officerId,
        req.params.applicationId,
        { documentName, additionalDetails }
      );

      res.status(201).json({
        success: true,
        message: 'Document request created successfully',
        data: requestForDocument
      });
    }
  ];

  static getApplicationDocumentRequests = [
    authenticate,
    check('applicationId').isUUID().withMessage('Invalid application ID'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError('User not authenticated');
      }

      const requests = await requestForDocumentService.getApplicationDocumentRequests(
        userId,
        req.params.applicationId
      );

      res.json({
        success: true,
        message: 'Document requests retrieved successfully',
        data: requests
      });
    }
  ];

  static getRequestForDocumentById = [
    authenticate,
    check('requestId').isUUID().withMessage('Invalid request ID'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError('User not authenticated');
      }

      const request = await requestForDocumentService.getRequestForDocumentById(
        userId,
        req.params.requestId
      );

      res.json({
        success: true,
        message: 'Document request retrieved successfully',
        data: request
      });
    }
  ];

  static updateRequestForDocument = [
    authenticate,
    authorize('APPLICATIONS_MANAGE_APPLICATIONS'),
    check('requestId').isUUID().withMessage('Invalid request ID'),
    check('documentName').optional().notEmpty().withMessage('Document name cannot be empty'),
    check('additionalDetails').optional().isString().withMessage('Additional details must be a string'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const officerId = req.user?.id;
      if (!officerId) {
        throw new BadRequestError('User not authenticated');
      }

      const { documentName, additionalDetails } = req.body;
      const request = await requestForDocumentService.updateRequestForDocument(
        officerId,
        req.params.requestId,
        { documentName, additionalDetails }
      );

      res.json({
        success: true,
        message: 'Document request updated successfully',
        data: request
      });
    }
  ];

  static cancelRequestForDocument = [
    authenticate,
    authorize('APPLICATIONS_MANAGE_APPLICATIONS'),
    check('requestId').isUUID().withMessage('Invalid request ID'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const officerId = req.user?.id;
      if (!officerId) {
        throw new BadRequestError('User not authenticated');
      }

      const request = await requestForDocumentService.cancelRequestForDocument(
        officerId,
        req.params.requestId
      );

      res.json({
        success: true,
        message: 'Document request cancelled successfully',
        data: request
      });
    }
  ];

  static submitDocumentForRequest = [
    authenticate,
    check('requestId').isUUID().withMessage('Invalid request ID'),
    check('documentType').notEmpty().withMessage('Document type is required'),
    check('fileName').notEmpty().withMessage('File name is required'),
    check('filePath').notEmpty().withMessage('File path is required'),
    check('fileSize').isInt({ min: 1 }).withMessage('Invalid file size'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError('User not authenticated');
      }

      const { documentType, fileName, filePath, fileSize } = req.body;
      const request = await requestForDocumentService.submitDocumentForRequest(
        userId,
        req.params.requestId,
        { documentType, fileName, filePath, fileSize }
      );

      res.json({
        success: true,
        message: 'Document submitted for request successfully',
        data: request
      });
    }
  ];
}
