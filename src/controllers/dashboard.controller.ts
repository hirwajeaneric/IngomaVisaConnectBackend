import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { authenticate, UserPayload } from '../middleware/auth.middleware';

const dashboardService = new DashboardService();

export class DashboardController {
  static getDashboardStats = [
    authenticate,
    async (req: Request & { user?: UserPayload }, res: Response) => {
      try {
        const adminEmail = req.user?.email;
        if (!adminEmail) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const year = parseInt(req.query.year as string) || new Date().getFullYear();
        
        console.log(`Dashboard stats requested for year: ${year} by admin: ${adminEmail}`);

        const stats = await dashboardService.getDashboardStats(adminEmail, year);
        
        res.json({
          success: true,
          data: stats
        });
      } catch (error: any) {
        console.error('Error fetching dashboard stats:', error);
        res.status(error.statusCode || 500).json({
          success: false,
          error: error.message || 'Failed to fetch dashboard statistics'
        });
      }
    },
  ];

  static getMonthlyApplications = [
    authenticate,
    async (req: Request & { user?: UserPayload }, res: Response) => {
      try {
        const adminEmail = req.user?.email;
        if (!adminEmail) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const year = parseInt(req.query.year as string) || new Date().getFullYear();
        
        console.log(`Monthly applications requested for year: ${year} by admin: ${adminEmail}`);

        const data = await dashboardService.getMonthlyApplications(adminEmail, year);
        
        res.json({
          success: true,
          data
        });
      } catch (error: any) {
        console.error('Error fetching monthly applications:', error);
        res.status(error.statusCode || 500).json({
          success: false,
          error: error.message || 'Failed to fetch monthly applications data'
        });
      }
    },
  ];

  static getVisaTypeDistribution = [
    authenticate,
    async (req: Request & { user?: UserPayload }, res: Response) => {
      try {
        const adminEmail = req.user?.email;
        if (!adminEmail) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const year = parseInt(req.query.year as string) || new Date().getFullYear();
        
        console.log(`Visa type distribution requested for year: ${year} by admin: ${adminEmail}`);

        const data = await dashboardService.getVisaTypeDistribution(adminEmail, year);
        
        res.json({
          success: true,
          data
        });
      } catch (error: any) {
        console.error('Error fetching visa type distribution:', error);
        res.status(error.statusCode || 500).json({
          success: false,
          error: error.message || 'Failed to fetch visa type distribution'
        });
      }
    },
  ];

  static getApplicationStatusTrends = [
    authenticate,
    async (req: Request & { user?: UserPayload }, res: Response) => {
      try {
        const adminEmail = req.user?.email;
        if (!adminEmail) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const year = parseInt(req.query.year as string) || new Date().getFullYear();
        
        console.log(`Application status trends requested for year: ${year} by admin: ${adminEmail}`);

        const data = await dashboardService.getApplicationStatusTrends(adminEmail, year);
        
        res.json({
          success: true,
          data
        });
      } catch (error: any) {
        console.error('Error fetching application status trends:', error);
        res.status(error.statusCode || 500).json({
          success: false,
          error: error.message || 'Failed to fetch application status trends'
        });
      }
    },
  ];
} 