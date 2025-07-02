import { Router } from 'express';
import { ReportsController } from '../controllers/reports.controller';
import { RequestHandler } from 'express';

const router = Router();

// Get applications report
router.get('/applications', ...(ReportsController.getApplicationsReport as RequestHandler[]));

// Get payments report
router.get('/payments', ...(ReportsController.getPaymentsReport as RequestHandler[]));

// Get users report
router.get('/users', ...(ReportsController.getUsersReport as RequestHandler[]));

// Get interviews report
router.get('/interviews', ...(ReportsController.getInterviewsReport as RequestHandler[]));

// Get report summary
router.get('/summary', ...(ReportsController.getReportSummary as RequestHandler[]));

export default router; 