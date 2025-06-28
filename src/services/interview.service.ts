import { PrismaClient } from '../generated/prisma';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { MailUtil } from '../utils/mail.utils';

const prisma = new PrismaClient();

export class InterviewService {
  // Create a new interview (officer only)
  async createInterview(applicationId: string, officerId: string, data: {
    scheduledDate: string;
    location: string;
    notes?: string;
  }) {
    // Check if user is an officer
    const officer = await prisma.user.findUnique({
      where: { id: officerId },
      select: { role: true, name: true }
    });

    if (!officer || officer.role !== 'OFFICER') {
      throw new ForbiddenError('Only officers can create interviews');
    }

    // Check if application exists
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        visaType: {
          select: {
            name: true
          }
        }
      }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    // Create the interview
    const interview = await prisma.interview.create({
      data: {
        applicationId,
        officerId,
        officerName: officer.name,
        scheduledDate: new Date(data.scheduledDate),
        location: data.location,
        status: 'SCHEDULED',
        notes: data.notes,
        scheduler: officer.name,
        schedulerId: officerId
      },
      include: {
        application: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
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
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Send email notification to applicant
    try {
      await MailUtil.sendInterviewScheduledEmail(
        application.user.email,
        application.applicationNumber,
        application.visaType.name,
        interview.scheduledDate.toISOString(),
        interview.location,
        officer.name,
        data.notes
      );
    } catch (error) {
      console.error('Failed to send interview scheduled email:', error);
    }

    return {
      success: true,
      message: 'Interview scheduled successfully',
      data: interview
    };
  }

  // Get a specific interview by ID
  async getInterviewById(interviewId: string, userId: string) {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
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
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!interview) {
      throw new NotFoundError('Interview not found');
    }

    // Check if user has access to this interview
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, id: true }
    });

    if (!user) {
      throw new ForbiddenError('User not found');
    }

    const hasAccess = 
      user.role === 'OFFICER' || 
      user.role === 'ADMIN' || 
      interview.application.userId === userId;

    if (!hasAccess) {
      throw new ForbiddenError('Access denied');
    }

    return {
      success: true,
      message: 'Interview retrieved successfully',
      data: interview
    };
  }

  // Get all interviews for an application
  async getApplicationInterviews(applicationId: string, userId: string) {
    // Check if user has access to this application
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId },
      select: { userId: true }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, id: true }
    });

    if (!user) {
      throw new ForbiddenError('User not found');
    }

    const hasAccess = 
      user.role === 'OFFICER' || 
      user.role === 'ADMIN' || 
      application.userId === userId;

    if (!hasAccess) {
      throw new ForbiddenError('Access denied');
    }

    const interviews = await prisma.interview.findMany({
      where: { applicationId },
      include: {
        application: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
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
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    });

    return {
      success: true,
      message: 'Interviews retrieved successfully',
      data: interviews
    };
  }

  // Get all interviews scheduled by an officer
  async getOfficerInterviews(officerId: string) {
    const user = await prisma.user.findUnique({
      where: { id: officerId },
      select: { role: true }
    });

    if (!user || user.role !== 'OFFICER') {
      throw new ForbiddenError('Only officers can view their interviews');
    }

    const interviews = await prisma.interview.findMany({
      where: { officerId },
      include: {
        application: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
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
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    });

    return {
      success: true,
      message: 'Interviews retrieved successfully',
      data: interviews
    };
  }

  // Get all interviews for the current applicant
  async getApplicantInterviews(applicantId: string) {
    const user = await prisma.user.findUnique({
      where: { id: applicantId },
      select: { role: true }
    });

    if (!user || user.role !== 'APPLICANT') {
      throw new ForbiddenError('Only applicants can view their interviews');
    }

    const interviews = await prisma.interview.findMany({
      where: {
        application: {
          userId: applicantId
        }
      },
      include: {
        application: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
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
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    });

    return {
      success: true,
      message: 'Interviews retrieved successfully',
      data: interviews
    };
  }

  // Reschedule an interview (officer only)
  async rescheduleInterview(interviewId: string, officerId: string, data: {
    scheduledDate?: string;
    location?: string;
    notes?: string;
  }) {
    const user = await prisma.user.findUnique({
      where: { id: officerId },
      select: { role: true, name: true }
    });

    if (!user || user.role !== 'OFFICER') {
      throw new ForbiddenError('Only officers can reschedule interviews');
    }

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            visaType: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!interview) {
      throw new NotFoundError('Interview not found');
    }

    if (interview.officerId !== officerId) {
      throw new ForbiddenError('You can only reschedule your own interviews');
    }

    const updateData: any = {
      status: 'RESCHEDULED'
    };

    if (data.scheduledDate) {
      updateData.scheduledDate = new Date(data.scheduledDate);
    }
    if (data.location) {
      updateData.location = data.location;
    }
    if (data.notes) {
      updateData.notes = data.notes;
    }

    const updatedInterview = await prisma.interview.update({
      where: { id: interviewId },
      data: updateData,
      include: {
        application: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
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
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Send email notification to applicant
    try {
      await MailUtil.sendInterviewRescheduledEmail(
        interview.application.user.email,
        interview.application.applicationNumber,
        interview.application.visaType.name,
        interview.scheduledDate.toISOString(),
        updatedInterview.scheduledDate.toISOString(),
        interview.location,
        updatedInterview.location,
        user.name
      );
    } catch (error) {
      console.error('Failed to send interview rescheduled email:', error);
    }

    return {
      success: true,
      message: 'Interview rescheduled successfully',
      data: updatedInterview
    };
  }

  // Cancel an interview (officer only)
  async cancelInterview(interviewId: string, officerId: string) {
    const user = await prisma.user.findUnique({
      where: { id: officerId },
      select: { role: true, name: true }
    });

    if (!user || user.role !== 'OFFICER') {
      throw new ForbiddenError('Only officers can cancel interviews');
    }

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            visaType: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!interview) {
      throw new NotFoundError('Interview not found');
    }

    if (interview.officerId !== officerId) {
      throw new ForbiddenError('You can only cancel your own interviews');
    }

    const cancelledInterview = await prisma.interview.update({
      where: { id: interviewId },
      data: { status: 'CANCELLED' },
      include: {
        application: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
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
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Send email notification to applicant
    try {
      await MailUtil.sendInterviewCancelledEmail(
        interview.application.user.email,
        interview.application.applicationNumber,
        interview.application.visaType.name,
        interview.scheduledDate.toISOString(),
        interview.location,
        user.name
      );
    } catch (error) {
      console.error('Failed to send interview cancelled email:', error);
    }

    return {
      success: true,
      message: 'Interview cancelled successfully',
      data: cancelledInterview
    };
  }

  // Confirm an interview (applicant only)
  async confirmInterview(interviewId: string, applicantId: string) {
    const user = await prisma.user.findUnique({
      where: { id: applicantId },
      select: { role: true }
    });

    if (!user || user.role !== 'APPLICANT') {
      throw new ForbiddenError('Only applicants can confirm interviews');
    }

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: {
          select: { userId: true }
        }
      }
    });

    if (!interview) {
      throw new NotFoundError('Interview not found');
    }

    if (interview.application.userId !== applicantId) {
      throw new ForbiddenError('You can only confirm your own interviews');
    }

    if (interview.status !== 'SCHEDULED' && interview.status !== 'RESCHEDULED') {
      throw new ForbiddenError('Only scheduled or rescheduled interviews can be confirmed');
    }

    if (interview.confirmed) {
      throw new ForbiddenError('Interview is already confirmed');
    }

    const confirmedInterview = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        confirmed: true,
        confirmedAt: new Date()
      },
      include: {
        application: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
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
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return {
      success: true,
      message: 'Interview confirmed successfully',
      data: confirmedInterview
    };
  }

  // Mark an interview as completed (officer only)
  async markInterviewCompleted(interviewId: string, officerId: string, data: {
    outcome: string;
    notes?: string;
  }) {
    const user = await prisma.user.findUnique({
      where: { id: officerId },
      select: { role: true, name: true }
    });

    if (!user || user.role !== 'OFFICER') {
      throw new ForbiddenError('Only officers can mark interviews as completed');
    }

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        application: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            visaType: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!interview) {
      throw new NotFoundError('Interview not found');
    }

    if (interview.officerId !== officerId) {
      throw new ForbiddenError('You can only mark your own interviews as completed');
    }

    if (interview.status === 'CANCELLED') {
      throw new ForbiddenError('Cancelled interviews cannot be marked as completed');
    }

    const completedInterview = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: 'COMPLETED',
        outcome: data.outcome,
        notes: data.notes
      },
      include: {
        application: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
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
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Send email notification to applicant
    try {
      await MailUtil.sendInterviewCompletedEmail(
        interview.application.user.email,
        interview.application.applicationNumber,
        interview.application.visaType.name,
        data.outcome,
        user.name
      );
    } catch (error) {
      console.error('Failed to send interview completed email:', error);
    }

    return {
      success: true,
      message: 'Interview marked as completed successfully',
      data: completedInterview
    };
  }
}
