import { Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import { InterviewService } from '../services/interview.service';
import { authenticate, authorize, UserPayload } from '../middleware/auth.middleware';
import { BadRequestError } from '../utils/errors';

const interviewService = new InterviewService();

export class InterviewController {
  static createInterview = [
    authenticate,
    authorize('APPLICATIONS_MANAGE_APPLICATIONS'),
    check('applicationId').isUUID().withMessage('Invalid application ID'),
    check('assignedOfficerId').isUUID().withMessage('Invalid assigned officer ID'),
    check('scheduledDate').isISO8601().withMessage('Invalid scheduled date'),
    check('location').notEmpty().withMessage('Location is required'),
    check('notes').optional().isString().withMessage('Notes must be a string'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const schedulerId = req.user?.id;
      if (!schedulerId) {
        throw new BadRequestError('User not authenticated');
      }

      const { applicationId, assignedOfficerId, scheduledDate, location, notes } = req.body;
      const interview = await interviewService.createInterview(
        schedulerId,
        applicationId,
        assignedOfficerId,
        { scheduledDate, location, notes }
      );

      res.status(201).json({
        success: true,
        message: 'Interview scheduled successfully',
        data: interview
      });
    }
  ];

  static getInterviewById = [
    authenticate,
    check('interviewId').isUUID().withMessage('Invalid interview ID'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const userId = req.user?.id;
      if (!userId) {
        throw new BadRequestError('User not authenticated');
      }

      const interview = await interviewService.getInterviewById(
        userId,
        req.params.interviewId
      );

      res.json({
        success: true,
        message: 'Interview retrieved successfully',
        data: interview
      });
    }
  ];

  static getApplicationInterviews = [
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

      const interviews = await interviewService.getApplicationInterviews(
        userId,
        req.params.applicationId
      );

      res.json({
        success: true,
        message: 'Application interviews retrieved successfully',
        data: interviews
      });
    }
  ];

  static getOfficerInterviews = [
    authenticate,
    authorize('APPLICATIONS_MANAGE_APPLICATIONS'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const officerId = req.user?.id;
      if (!officerId) {
        throw new BadRequestError('User not authenticated');
      }

      const interviews = await interviewService.getOfficerInterviews(officerId);

      res.json({
        success: true,
        message: 'Officer interviews retrieved successfully',
        data: interviews
      });
    }
  ];

  static getApplicantInterviews = [
    authenticate,
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const applicantId = req.user?.id;
      if (!applicantId) {
        throw new BadRequestError('User not authenticated');
      }

      const interviews = await interviewService.getApplicantInterviews(applicantId);

      res.json({
        success: true,
        message: 'Applicant interviews retrieved successfully',
        data: interviews
      });
    }
  ];

  static rescheduleInterview = [
    authenticate,
    authorize('APPLICATIONS_MANAGE_APPLICATIONS'),
    check('interviewId').isUUID().withMessage('Invalid interview ID'),
    check('scheduledDate').optional().isISO8601().withMessage('Invalid scheduled date'),
    check('location').optional().notEmpty().withMessage('Location cannot be empty'),
    check('notes').optional().isString().withMessage('Notes must be a string'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const officerId = req.user?.id;
      if (!officerId) {
        throw new BadRequestError('User not authenticated');
      }

      const { scheduledDate, location, notes } = req.body;
      const interview = await interviewService.rescheduleInterview(
        officerId,
        req.params.interviewId,
        { scheduledDate, location, notes }
      );

      res.json({
        success: true,
        message: 'Interview rescheduled successfully',
        data: interview
      });
    }
  ];

  static cancelInterview = [
    authenticate,
    authorize('APPLICATIONS_MANAGE_APPLICATIONS'),
    check('interviewId').isUUID().withMessage('Invalid interview ID'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const officerId = req.user?.id;
      if (!officerId) {
        throw new BadRequestError('User not authenticated');
      }

      const interview = await interviewService.cancelInterview(
        officerId,
        req.params.interviewId
      );

      res.json({
        success: true,
        message: 'Interview cancelled successfully',
        data: interview
      });
    }
  ];

  static confirmInterview = [
    authenticate,
    check('interviewId').isUUID().withMessage('Invalid interview ID'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const applicantId = req.user?.id;
      if (!applicantId) {
        throw new BadRequestError('User not authenticated');
      }

      const interview = await interviewService.confirmInterview(
        applicantId,
        req.params.interviewId
      );

      res.json({
        success: true,
        message: 'Interview confirmed successfully',
        data: interview
      });
    }
  ];

  static markInterviewCompleted = [
    authenticate,
    authorize('APPLICATIONS_MANAGE_APPLICATIONS'),
    check('interviewId').isUUID().withMessage('Invalid interview ID'),
    check('outcome').notEmpty().withMessage('Interview outcome is required'),
    check('notes').optional().isString().withMessage('Notes must be a string'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const officerId = req.user?.id;
      if (!officerId) {
        throw new BadRequestError('User not authenticated');
      }

      const { outcome, notes } = req.body;
      const interview = await interviewService.markInterviewCompleted(
        officerId,
        req.params.interviewId,
        { outcome, notes }
      );

      res.json({
        success: true,
        message: 'Interview marked as completed successfully',
        data: interview
      });
    }
  ];

  // New endpoint to get officers for assignment
  static getOfficersForAssignment = [
    authenticate,
    authorize('APPLICATIONS_MANAGE_APPLICATIONS'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const officers = await interviewService.getOfficersForAssignment();

      res.json({
        success: true,
        message: 'Officers retrieved successfully',
        data: officers
      });
    }
  ];

  // New endpoint to get applications for interview scheduling
  static getApplicationsForInterviewScheduling = [
    authenticate,
    authorize('APPLICATIONS_MANAGE_APPLICATIONS'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const applications = await interviewService.getApplicationsForInterviewScheduling();

      res.json({
        success: true,
        message: 'Applications retrieved successfully',
        data: applications
      });
    }
  ];
}
