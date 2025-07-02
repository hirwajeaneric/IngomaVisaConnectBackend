import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { RequestHandler } from 'express';

const router = Router();

// Get dashboard summary statistics
router.get('/stats', ...(DashboardController.getDashboardStats as RequestHandler[]));

// Get monthly applications chart data
router.get('/monthly-applications', ...(DashboardController.getMonthlyApplications as RequestHandler[]));

// Get visa type distribution chart data
router.get('/visa-type-distribution', ...(DashboardController.getVisaTypeDistribution as RequestHandler[]));

// Get application status trends chart data
router.get('/status-trends', ...(DashboardController.getApplicationStatusTrends as RequestHandler[]));

export default router; 