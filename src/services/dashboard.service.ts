import { PrismaClient } from '../generated/prisma/index';
import { BadRequestError, NotFoundError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export class DashboardService {
  async getDashboardStats(adminEmail: string, year: number = new Date().getFullYear()) {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      throw new NotFoundError('Admin not found');
    }
    if (admin.role !== 'ADMIN') {
      throw new BadRequestError('Only admins can view dashboard statistics');
    }

    console.log(`Fetching dashboard stats for year: ${year}`);

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Calculate date ranges for current month and previous month
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0);
    const previousMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const previousMonthEnd = new Date(currentYear, currentMonth, 0);

    // Year range for the selected year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const [
      totalApplications,
      currentMonthApplications,
      previousMonthApplications,
      totalUsers,
      currentMonthUsers,
      previousMonthUsers,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      averageProcessingTime
    ] = await Promise.all([
      // Total applications for the year
      prisma.visaApplication.count({
        where: {
          submissionDate: {
            gte: yearStart,
            lt: yearEnd
          }
        }
      }),
      // Current month applications
      prisma.visaApplication.count({
        where: {
          submissionDate: {
            gte: currentMonthStart,
            lte: currentMonthEnd
          }
        }
      }),
      // Previous month applications
      prisma.visaApplication.count({
        where: {
          submissionDate: {
            gte: previousMonthStart,
            lte: previousMonthEnd
          }
        }
      }),
      // Total users
      prisma.user.count({
        where: {
          role: 'APPLICANT',
          createdAt: {
            gte: yearStart,
            lt: yearEnd
          }
        }
      }),
      // Current month users
      prisma.user.count({
        where: {
          role: 'APPLICANT',
          createdAt: {
            gte: currentMonthStart,
            lte: currentMonthEnd
          }
        }
      }),
      // Previous month users
      prisma.user.count({
        where: {
          role: 'APPLICANT',
          createdAt: {
            gte: previousMonthStart,
            lte: previousMonthEnd
          }
        }
      }),
      // Pending applications
      prisma.visaApplication.count({
        where: {
          status: 'PENDING',
          submissionDate: {
            gte: yearStart,
            lt: yearEnd
          }
        }
      }),
      // Approved applications
      prisma.visaApplication.count({
        where: {
          status: 'APPROVED',
          submissionDate: {
            gte: yearStart,
            lt: yearEnd
          }
        }
      }),
      // Rejected applications
      prisma.visaApplication.count({
        where: {
          status: 'REJECTED',
          submissionDate: {
            gte: yearStart,
            lt: yearEnd
          }
        }
      }),
      // Average processing time (in days) - simplified calculation
      prisma.visaApplication.count({
        where: {
          status: { in: ['APPROVED', 'REJECTED'] },
          decisionDate: { not: null },
          submissionDate: {
            gte: yearStart,
            lt: yearEnd
          }
        }
      })
    ]);

    // Calculate percentage changes
    const applicationChange = previousMonthApplications > 0 
      ? ((currentMonthApplications - previousMonthApplications) / previousMonthApplications) * 100 
      : 0;
    
    const userChange = previousMonthUsers > 0 
      ? ((currentMonthUsers - previousMonthUsers) / previousMonthUsers) * 100 
      : 0;

    // Calculate pending percentage
    const pendingPercentage = totalApplications > 0 
      ? (pendingApplications / totalApplications) * 100 
      : 0;

    // Calculate average processing time (simplified)
    let avgProcessingDays = 4.2; // Placeholder - would need more complex calculation

    console.log(`Dashboard stats: Applications=${totalApplications}, Users=${totalUsers}, Pending=${pendingApplications}`);

    return {
      totalApplications,
      applicationChange: Math.round(applicationChange * 10) / 10,
      pendingPercentage: Math.round(pendingPercentage * 10) / 10,
      avgProcessingDays,
      totalUsers,
      userChange: Math.round(userChange * 10) / 10,
      pendingApplications,
      approvedApplications,
      rejectedApplications
    };
  }

  async getMonthlyApplications(adminEmail: string, year: number = new Date().getFullYear()) {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      throw new NotFoundError('Admin not found');
    }
    if (admin.role !== 'ADMIN') {
      throw new BadRequestError('Only admins can view dashboard statistics');
    }

    console.log(`Fetching monthly applications for year: ${year}`);

    // Get all applications for the year
    const applications = await prisma.visaApplication.findMany({
      where: {
        submissionDate: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1)
        }
      },
      select: {
        submissionDate: true
      }
    });

    console.log(`Found ${applications.length} applications for ${year}`);

    // Initialize array with all 12 months
    const monthlyApplications = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(year, i, 1).toLocaleString('default', { month: 'short' }),
      applications: 0
    }));

    // Count applications by month
    applications.forEach(app => {
      if (app.submissionDate) {
        const month = new Date(app.submissionDate).getMonth();
        monthlyApplications[month].applications += 1;
      }
    });

    console.log('Monthly applications data:', monthlyApplications);

    return monthlyApplications;
  }

  async getVisaTypeDistribution(adminEmail: string, year: number = new Date().getFullYear()) {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      throw new NotFoundError('Admin not found');
    }
    if (admin.role !== 'ADMIN') {
      throw new BadRequestError('Only admins can view dashboard statistics');
    }

    console.log(`Fetching visa type distribution for year: ${year}`);

    const visaTypeData = await prisma.visaApplication.groupBy({
      by: ['visaTypeId'],
      where: {
        submissionDate: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1)
        }
      },
      _count: {
        id: true
      }
    });

    // Get visa type names
    const visaTypes = await prisma.visaType.findMany({
      select: {
        id: true,
        name: true
      }
    });

    const distribution = visaTypeData.map(item => {
      const visaType = visaTypes.find(vt => vt.id === item.visaTypeId);
      return {
        name: visaType?.name || 'Unknown',
        value: item._count?.id || 0
      };
    });

    console.log('Visa type distribution:', distribution);

    return distribution;
  }

  async getApplicationStatusTrends(adminEmail: string, year: number = new Date().getFullYear()) {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      throw new NotFoundError('Admin not found');
    }
    if (admin.role !== 'ADMIN') {
      throw new BadRequestError('Only admins can view dashboard statistics');
    }

    console.log(`Fetching application status trends for year: ${year}`);

    // Get all applications for the year
    const applications = await prisma.visaApplication.findMany({
      where: {
        submissionDate: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1)
        }
      },
      select: {
        status: true,
        submissionDate: true
      }
    });

    console.log(`Found ${applications.length} applications for status trends`);

    // Initialize array with all 12 months
    const statusTrends = Array.from({ length: 12 }, (_, i) => ({
      name: new Date(year, i, 1).toLocaleString('default', { month: 'short' }),
      pending: 0,
      approved: 0,
      rejected: 0
    }));

    // Count applications by status and month
    applications.forEach(app => {
      if (app.submissionDate) {
        const month = new Date(app.submissionDate).getMonth();
        const status = app.status.toLowerCase();
        
        if (status === 'pending' || status === 'under_review' || status === 'submitted') {
          statusTrends[month].pending += 1;
        } else if (status === 'approved') {
          statusTrends[month].approved += 1;
        } else if (status === 'rejected') {
          statusTrends[month].rejected += 1;
        }
      }
    });

    console.log('Status trends data:', statusTrends);

    return statusTrends;
  }
} 