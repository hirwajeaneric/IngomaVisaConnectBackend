import { Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import { ReportsService } from '../services/reports.service';
import { authenticate, authorize, UserPayload } from '../middleware/auth.middleware';
import { BadRequestError } from '../utils/errors';

const reportsService = new ReportsService();

export class ReportsController {
  static getApplicationsReport = [
    authenticate,
    authorize('REPORTS_VIEW_REPORTS'),
    check('reportType').isIn(['all_applications', 'approved', 'rejected', 'pending', 'under_review']).withMessage('Invalid report type'),
    check('fromDate').optional().isISO8601().withMessage('Invalid from date'),
    check('toDate').optional().isISO8601().withMessage('Invalid to date'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const adminEmail = req.user?.email;
      if (!adminEmail) {
        throw new BadRequestError('User not authenticated');
      }

      const { reportType, fromDate, toDate } = req.query;
      
      const from = fromDate ? new Date(fromDate as string) : undefined;
      const to = toDate ? new Date(toDate as string) : undefined;

      const report = await reportsService.getApplicationsReport(
        adminEmail,
        reportType as string,
        from,
        to
      );

      res.json({
        success: true,
        message: 'Applications report generated successfully',
        data: report
      });
    }
  ];

  static getPaymentsReport = [
    authenticate,
    authorize('REPORTS_VIEW_REPORTS'),
    check('reportType').isIn(['payments', 'revenue', 'completed', 'pending', 'failed', 'refunded']).withMessage('Invalid report type'),
    check('fromDate').optional().isISO8601().withMessage('Invalid from date'),
    check('toDate').optional().isISO8601().withMessage('Invalid to date'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const adminEmail = req.user?.email;
      if (!adminEmail) {
        throw new BadRequestError('User not authenticated');
      }

      const { reportType, fromDate, toDate } = req.query;
      
      const from = fromDate ? new Date(fromDate as string) : undefined;
      const to = toDate ? new Date(toDate as string) : undefined;

      const report = await reportsService.getPaymentsReport(
        adminEmail,
        reportType as string,
        from,
        to
      );

      res.json({
        success: true,
        message: 'Payments report generated successfully',
        data: report
      });
    }
  ];

  static getUsersReport = [
    authenticate,
    authorize('REPORTS_VIEW_REPORTS'),
    check('reportType').isIn(['users', 'applicants', 'officers', 'admins']).withMessage('Invalid report type'),
    check('fromDate').optional().isISO8601().withMessage('Invalid from date'),
    check('toDate').optional().isISO8601().withMessage('Invalid to date'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const adminEmail = req.user?.email;
      if (!adminEmail) {
        throw new BadRequestError('User not authenticated');
      }

      const { reportType, fromDate, toDate } = req.query;
      
      const from = fromDate ? new Date(fromDate as string) : undefined;
      const to = toDate ? new Date(toDate as string) : undefined;

      const report = await reportsService.getUsersReport(
        adminEmail,
        reportType as string,
        from,
        to
      );

      res.json({
        success: true,
        message: 'Users report generated successfully',
        data: report
      });
    }
  ];

  static getInterviewsReport = [
    authenticate,
    authorize('REPORTS_VIEW_REPORTS'),
    check('reportType').isIn(['interviews', 'scheduled', 'completed', 'cancelled', 'no_show']).withMessage('Invalid report type'),
    check('fromDate').optional().isISO8601().withMessage('Invalid from date'),
    check('toDate').optional().isISO8601().withMessage('Invalid to date'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const adminEmail = req.user?.email;
      if (!adminEmail) {
        throw new BadRequestError('User not authenticated');
      }

      const { reportType, fromDate, toDate } = req.query;
      
      const from = fromDate ? new Date(fromDate as string) : undefined;
      const to = toDate ? new Date(toDate as string) : undefined;

      const report = await reportsService.getInterviewsReport(
        adminEmail,
        reportType as string,
        from,
        to
      );

      res.json({
        success: true,
        message: 'Interviews report generated successfully',
        data: report
      });
    }
  ];

  static getReportSummary = [
    authenticate,
    authorize('REPORTS_VIEW_REPORTS'),
    check('reportType').isIn([
      'applications', 'all_applications', 'approved', 'rejected', 'pending',
      'payments', 'revenue', 'completed', 'failed', 'refunded',
      'users', 'applicants', 'officers', 'admins',
      'interviews', 'scheduled', 'cancelled', 'no_show'
    ]).withMessage('Invalid report type'),
    check('fromDate').optional().isISO8601().withMessage('Invalid from date'),
    check('toDate').optional().isISO8601().withMessage('Invalid to date'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const adminEmail = req.user?.email;
      if (!adminEmail) {
        throw new BadRequestError('User not authenticated');
      }

      const { reportType, fromDate, toDate } = req.query;
      
      const from = fromDate ? new Date(fromDate as string) : undefined;
      const to = toDate ? new Date(toDate as string) : undefined;

      const summary = await reportsService.getReportSummary(
        adminEmail,
        reportType as string,
        from,
        to
      );

      res.json({
        success: true,
        message: 'Report summary generated successfully',
        data: summary
      });
    }
  ];
} 