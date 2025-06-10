import { Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import { VisaApplicationService } from '../services/visaApplication.service';
import { authenticate, authorize, UserPayload } from '../middleware/auth.middleware';
import { BadRequestError } from '../utils/errors';
import { Status } from '../generated/prisma';

const visaApplicationService = new VisaApplicationService();

export class VisaApplicationController {
  static createApplication = [
    authenticate,
    check('visaTypeId').isUUID().withMessage('Invalid visa type ID'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError('User not authenticated');
      }

      const { visaTypeId } = req.body;
      const application = await visaApplicationService.createApplication(userId, visaTypeId);

      res.status(201).json({
        success: true,
        message: 'Application created successfully',
        data: application
      });
    }
  ];

  static getApplicationById = [
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

      const application = await visaApplicationService.getApplicationById(userId, req.params.applicationId);

      res.json({
        success: true,
        message: 'Application retrieved successfully',
        data: application
      });
    }
  ];

  static getUserApplications = [
    authenticate,
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError('User not authenticated');
      }

      const applications = await visaApplicationService.getUserApplications(userId);

      res.json({
        success: true,
        message: 'Applications retrieved successfully',
        data: applications
      });
    }
  ];

  static submitApplication = [
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

      console.log("User");
      console.log(userId);
      console.log("Application ID");
      console.log(req.params.applicationId);

      const application = await visaApplicationService.submitApplication(userId, req.params.applicationId);

      res.json({
        success: true,
        message: 'Application submitted successfully',
        data: application
      });
    }
  ];

  static updateApplicationStatus = [
    authenticate,
    authorize('APPLICATIONS_MANAGE_APPLICATIONS'),
    check('applicationId').isUUID().withMessage('Invalid application ID'),
    check('status').isIn(Object.values(Status)).withMessage('Invalid status'),
    check('rejectionReason').optional().isString().withMessage('Rejection reason must be a string'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const officerId = req.user?.id;
      if (!officerId) {
        throw new BadRequestError('User not authenticated');
      }

      const { status, rejectionReason } = req.body;
      const application = await visaApplicationService.updateApplicationStatus(
        officerId,
        req.params.applicationId,
        status,
        rejectionReason
      );

      res.json({
        success: true,
        message: 'Application status updated successfully',
        data: application
      });
    }
  ];
}
