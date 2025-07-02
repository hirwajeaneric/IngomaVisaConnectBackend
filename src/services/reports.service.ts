import { PrismaClient } from '../generated/prisma/index';
import { BadRequestError, NotFoundError } from '../middleware/error.middleware';

// Country code to name mapping
const countryMap: Record<string, string> = {
  'af': 'Afghanistan', 'al': 'Albania', 'dz': 'Algeria', 'ad': 'Andorra', 'ao': 'Angola',
  'ag': 'Antigua and Barbuda', 'ar': 'Argentina', 'am': 'Armenia', 'au': 'Australia',
  'at': 'Austria', 'az': 'Azerbaijan', 'bs': 'Bahamas', 'bh': 'Bahrain', 'bd': 'Bangladesh',
  'bb': 'Barbados', 'by': 'Belarus', 'be': 'Belgium', 'bz': 'Belize', 'bj': 'Benin',
  'bt': 'Bhutan', 'bo': 'Bolivia', 'ba': 'Bosnia and Herzegovina', 'bw': 'Botswana',
  'br': 'Brazil', 'bn': 'Brunei', 'bg': 'Bulgaria', 'bf': 'Burkina Faso', 'bi': 'Burundi',
  'kh': 'Cambodia', 'cm': 'Cameroon', 'ca': 'Canada', 'cv': 'Cape Verde',
  'cf': 'Central African Republic', 'td': 'Chad', 'cl': 'Chile', 'cn': 'China',
  'co': 'Colombia', 'km': 'Comoros', 'cg': 'Congo', 'cd': 'DR Congo', 'cr': 'Costa Rica',
  'ci': 'Côte d\'Ivoire', 'hr': 'Croatia', 'cu': 'Cuba', 'cy': 'Cyprus', 'cz': 'Czech Republic',
  'dk': 'Denmark', 'dj': 'Djibouti', 'dm': 'Dominica', 'do': 'Dominican Republic',
  'ec': 'Ecuador', 'eg': 'Egypt', 'sv': 'El Salvador', 'gq': 'Equatorial Guinea',
  'er': 'Eritrea', 'ee': 'Estonia', 'et': 'Ethiopia', 'fj': 'Fiji', 'fi': 'Finland',
  'fr': 'France', 'ga': 'Gabon', 'gm': 'Gambia', 'ge': 'Georgia', 'de': 'Germany',
  'gh': 'Ghana', 'gr': 'Greece', 'gd': 'Grenada', 'gt': 'Guatemala', 'gn': 'Guinea',
  'gw': 'Guinea-Bissau', 'gy': 'Guyana', 'ht': 'Haiti', 'hn': 'Honduras', 'hu': 'Hungary',
  'is': 'Iceland', 'in': 'India', 'id': 'Indonesia', 'ir': 'Iran', 'iq': 'Iraq',
  'ie': 'Ireland', 'il': 'Israel', 'it': 'Italy', 'jm': 'Jamaica', 'jp': 'Japan',
  'jo': 'Jordan', 'kz': 'Kazakhstan', 'ke': 'Kenya', 'ki': 'Kiribati', 'kp': 'North Korea',
  'kr': 'South Korea', 'kw': 'Kuwait', 'kg': 'Kyrgyzstan', 'la': 'Laos', 'lv': 'Latvia',
  'lb': 'Lebanon', 'ls': 'Lesotho', 'lr': 'Liberia', 'ly': 'Libya', 'li': 'Liechtenstein',
  'lt': 'Lithuania', 'lu': 'Luxembourg', 'mg': 'Madagascar', 'mw': 'Malawi', 'my': 'Malaysia',
  'mv': 'Maldives', 'ml': 'Mali', 'mt': 'Malta', 'mh': 'Marshall Islands', 'mr': 'Mauritania',
  'mu': 'Mauritius', 'mx': 'Mexico', 'fm': 'Micronesia', 'md': 'Moldova', 'mc': 'Monaco',
  'mn': 'Mongolia', 'me': 'Montenegro', 'ma': 'Morocco', 'mz': 'Mozambique', 'mm': 'Myanmar',
  'na': 'Namibia', 'nr': 'Nauru', 'np': 'Nepal', 'nl': 'Netherlands', 'nz': 'New Zealand',
  'ni': 'Nicaragua', 'ne': 'Niger', 'ng': 'Nigeria', 'no': 'Norway', 'om': 'Oman',
  'pk': 'Pakistan', 'pw': 'Palau', 'pa': 'Panama', 'pg': 'Papua New Guinea', 'py': 'Paraguay',
  'pe': 'Peru', 'ph': 'Philippines', 'pl': 'Poland', 'pt': 'Portugal', 'qa': 'Qatar',
  'ro': 'Romania', 'ru': 'Russia', 'rw': 'Rwanda', 'kn': 'Saint Kitts and Nevis',
  'lc': 'Saint Lucia', 'vc': 'Saint Vincent and the Grenadines', 'ws': 'Samoa', 'sm': 'San Marino',
  'st': 'São Tomé and Príncipe', 'sa': 'Saudi Arabia', 'sn': 'Senegal', 'rs': 'Serbia',
  'sc': 'Seychelles', 'sl': 'Sierra Leone', 'sg': 'Singapore', 'sk': 'Slovakia',
  'si': 'Slovenia', 'sb': 'Solomon Islands', 'so': 'Somalia', 'za': 'South Africa',
  'ss': 'South Sudan', 'es': 'Spain', 'lk': 'Sri Lanka', 'sd': 'Sudan', 'sr': 'Suriname',
  'sz': 'Eswatini', 'se': 'Sweden', 'ch': 'Switzerland', 'sy': 'Syria', 'tw': 'Taiwan',
  'tj': 'Tajikistan', 'tz': 'Tanzania', 'th': 'Thailand', 'tl': 'Timor-Leste', 'tg': 'Togo',
  'to': 'Tonga', 'tt': 'Trinidad and Tobago', 'tn': 'Tunisia', 'tr': 'Turkey', 'tm': 'Turkmenistan',
  'tv': 'Tuvalu', 'ug': 'Uganda', 'ua': 'Ukraine', 'ae': 'United Arab Emirates',
  'gb': 'United Kingdom', 'us': 'United States', 'uy': 'Uruguay', 'uz': 'Uzbekistan',
  'vu': 'Vanuatu', 'va': 'Vatican City', 've': 'Venezuela', 'vn': 'Vietnam', 'ye': 'Yemen',
  'zm': 'Zambia', 'zw': 'Zimbabwe'
};

const getCountryName = (countryCode: string): string => {
  if (!countryCode) return 'N/A';
  
  // Handle case where the code might already be a full name
  if (countryCode.length > 3) {
    return countryCode;
  }
  
  return countryMap[countryCode.toLowerCase()] || countryCode;
};

const prisma = new PrismaClient();

export class ReportsService {
  async getApplicationsReport(adminEmail: string, reportType: string, fromDate?: Date, toDate?: Date) {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      throw new NotFoundError('Admin not found');
    }
    if (admin.role !== 'ADMIN') {
      throw new BadRequestError('Only admins can generate reports');
    }

    console.log(`Generating applications report: ${reportType} from ${fromDate} to ${toDate}`);

    // Build where clause based on report type and date range
    let whereClause: any = {};
    
    if (fromDate && toDate) {
      whereClause.submissionDate = {
        gte: fromDate,
        lte: toDate
      };
    }

    // Add status filter based on report type
    switch (reportType) {
      case 'approved':
        whereClause.status = 'APPROVED';
        break;
      case 'rejected':
        whereClause.status = 'REJECTED';
        break;
      case 'pending':
        whereClause.status = 'PENDING';
        break;
      case 'under_review':
        whereClause.status = 'UNDER_REVIEW';
        break;
      // For 'all_applications', no additional status filter
    }

    const applications = await prisma.visaApplication.findMany({
      where: whereClause,
      include: {
        personalInfo: true,
        travelInfo: true,
        visaType: true,
        payment: true,
        documents: true
      },
      orderBy: {
        submissionDate: 'desc'
      }
    });

    console.log(`Found ${applications.length} applications for report`);

    return applications.map(app => ({
      applicationId: app.applicationNumber,
      applicantName: app.personalInfo ? `${app.personalInfo.firstName} ${app.personalInfo.lastName}` : 'N/A',
      visaType: app.visaType?.name || 'N/A',
      status: app.status,
      submissionDate: app.submissionDate,
      decisionDate: app.decisionDate,
      nationality: getCountryName(app.personalInfo?.nationality || ''),
      passportNumber: app.personalInfo?.passportNumber || 'N/A',
      purposeOfTravel: app.travelInfo?.purposeOfTravel || 'N/A',
      entryDate: app.travelInfo?.entryDate,
      exitDate: app.travelInfo?.exitDate,
      paymentStatus: app.payment?.paymentStatus || 'N/A',
      paymentAmount: app.payment?.amount || 0,
      documentsCount: app.documents?.length || 0
    }));
  }

  async getPaymentsReport(adminEmail: string, reportType: string, fromDate?: Date, toDate?: Date) {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      throw new NotFoundError('Admin not found');
    }
    if (admin.role !== 'ADMIN') {
      throw new BadRequestError('Only admins can generate reports');
    }

    console.log(`Generating payments report: ${reportType} from ${fromDate} to ${toDate}`);

    let whereClause: any = {};
    
    if (fromDate && toDate) {
      whereClause.createdAt = {
        gte: fromDate,
        lte: toDate
      };
    }

    // Add status filter based on report type
    switch (reportType) {
      case 'completed':
        whereClause.paymentStatus = 'COMPLETED';
        break;
      case 'pending':
        whereClause.paymentStatus = 'PENDING';
        break;
      case 'failed':
        whereClause.paymentStatus = 'FAILED';
        break;
      case 'refunded':
        whereClause.refundStatus = 'REFUNDED';
        break;
      // For 'revenue' and 'payments', no additional status filter
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        application: {
          select: {
            applicationNumber: true,
            visaType: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${payments.length} payments for report`);

    return payments.map(payment => ({
      transactionId: payment.stripePaymentId || `PAY-${payment.id.slice(0, 8)}`,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.paymentStatus,
      refundStatus: payment.refundStatus,
      refundReason: payment.refundReason,
      customerName: payment.user?.name || 'N/A',
      customerEmail: payment.user?.email || 'N/A',
      applicationNumber: payment.application?.applicationNumber || 'N/A',
      visaType: payment.application?.visaType?.name || 'N/A',
      paymentDate: payment.createdAt,
      updatedAt: payment.updatedAt
    }));
  }

  async getUsersReport(adminEmail: string, reportType: string, fromDate?: Date, toDate?: Date) {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      throw new NotFoundError('Admin not found');
    }
    if (admin.role !== 'ADMIN') {
      throw new BadRequestError('Only admins can generate reports');
    }

    console.log(`Generating users report: ${reportType} from ${fromDate} to ${toDate}`);

    let whereClause: any = {};
    
    if (fromDate && toDate) {
      whereClause.createdAt = {
        gte: fromDate,
        lte: toDate
      };
    }

    // Add role filter based on report type
    switch (reportType) {
      case 'applicants':
        whereClause.role = 'APPLICANT';
        break;
      case 'officers':
        whereClause.role = 'OFFICER';
        break;
      case 'admins':
        whereClause.role = 'ADMIN';
        break;
      // For 'users', no additional role filter
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            applications: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Found ${users.length} users for report`);

    return users.map(user => ({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      applicationsCount: user._count.applications,
      registrationDate: user.createdAt,
      lastUpdated: user.createdAt
    }));
  }

  async getInterviewsReport(adminEmail: string, reportType: string, fromDate?: Date, toDate?: Date) {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      throw new NotFoundError('Admin not found');
    }
    if (admin.role !== 'ADMIN') {
      throw new BadRequestError('Only admins can generate reports');
    }

    console.log(`Generating interviews report: ${reportType} from ${fromDate} to ${toDate}`);

    let whereClause: any = {};
    
    if (fromDate && toDate) {
      whereClause.scheduledDate = {
        gte: fromDate,
        lte: toDate
      };
    }

    // Add status filter based on report type
    switch (reportType) {
      case 'scheduled':
        whereClause.status = 'SCHEDULED';
        break;
      case 'completed':
        whereClause.status = 'COMPLETED';
        break;
      case 'cancelled':
        whereClause.status = 'CANCELLED';
        break;
      case 'no_show':
        whereClause.status = 'NO_SHOW';
        break;
      // For 'interviews', no additional status filter
    }

    const interviews = await prisma.interview.findMany({
      where: whereClause,
      include: {
        application: {
          select: {
            applicationNumber: true,
            personalInfo: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            },
            visaType: {
              select: {
                name: true
              }
            }
          }
        },
        assignedOfficer: {
          select: {
            name: true,
            email: true
          }
        },
        scheduler: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'desc'
      }
    });

    console.log(`Found ${interviews.length} interviews for report`);

    return interviews.map(interview => ({
      interviewId: interview.id,
      applicationNumber: interview.application?.applicationNumber || 'N/A',
      applicantName: interview.application?.personalInfo ? 
        `${interview.application.personalInfo.firstName} ${interview.application.personalInfo.lastName}` : 'N/A',
      applicantEmail: interview.application?.personalInfo?.email || 'N/A',
      visaType: interview.application?.visaType?.name || 'N/A',
      status: interview.status,
      scheduledDate: interview.scheduledDate,
      location: interview.location,
      assignedOfficer: interview.assignedOfficer?.name || 'N/A',
      scheduler: interview.scheduler?.name || 'N/A',
      confirmed: interview.confirmed,
      confirmedAt: interview.confirmedAt,
      notes: interview.notes,
      outcome: interview.outcome,
      createdAt: interview.createdAt
    }));
  }

  async getReportSummary(adminEmail: string, reportType: string, fromDate?: Date, toDate?: Date) {
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      throw new NotFoundError('Admin not found');
    }
    if (admin.role !== 'ADMIN') {
      throw new BadRequestError('Only admins can generate reports');
    }

    console.log(`Generating report summary: ${reportType} from ${fromDate} to ${toDate}`);

    let whereClause: any = {};
    
    if (fromDate && toDate) {
      whereClause.createdAt = {
        gte: fromDate,
        lte: toDate
      };
    }

    let summary: any = {};

    switch (reportType) {
      case 'applications':
      case 'all_applications':
      case 'approved':
      case 'rejected':
      case 'pending':
        // Add status filter for applications
        if (reportType !== 'all_applications') {
          whereClause.status = reportType.toUpperCase();
        }
        
        const applicationsCount = await prisma.visaApplication.count({ where: whereClause });
        const applicationsByStatus = await prisma.visaApplication.groupBy({
          by: ['status'],
          where: whereClause,
          _count: true
        });
        
        summary = {
          totalCount: applicationsCount,
          byStatus: applicationsByStatus.reduce((acc, item) => {
            acc[item.status] = item._count;
            return acc;
          }, {} as any)
        };
        break;

      case 'payments':
      case 'revenue':
      case 'completed':
      case 'pending':
      case 'failed':
      case 'refunded':
        // Add status filter for payments
        if (reportType !== 'payments' && reportType !== 'revenue') {
          whereClause.paymentStatus = reportType.toUpperCase();
        }
        
        const paymentsCount = await prisma.payment.count({ where: whereClause });
        const totalRevenue = await prisma.payment.aggregate({
          where: { ...whereClause, paymentStatus: 'COMPLETED' },
          _sum: { amount: true }
        });
        
        summary = {
          totalCount: paymentsCount,
          totalRevenue: totalRevenue._sum.amount || 0,
          averageAmount: paymentsCount > 0 ? (totalRevenue._sum.amount || 0) / paymentsCount : 0
        };
        break;

      case 'users':
      case 'applicants':
      case 'officers':
      case 'admins':
        // Add role filter for users
        if (reportType !== 'users') {
          whereClause.role = reportType.toUpperCase();
        }
        
        const usersCount = await prisma.user.count({ where: whereClause });
        
        summary = {
          totalCount: usersCount
        };
        break;

      case 'interviews':
      case 'scheduled':
      case 'completed':
      case 'cancelled':
      case 'no_show':
        // Add status filter for interviews
        if (reportType !== 'interviews') {
          whereClause.status = reportType.toUpperCase();
        }
        
        const interviewsCount = await prisma.interview.count({ where: whereClause });
        const interviewsByStatus = await prisma.interview.groupBy({
          by: ['status'],
          where: whereClause,
          _count: true
        });
        
        summary = {
          totalCount: interviewsCount,
          byStatus: interviewsByStatus.reduce((acc, item) => {
            acc[item.status] = item._count;
            return acc;
          }, {} as any)
        };
        break;
    }

    return summary;
  }
} 