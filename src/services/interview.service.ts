import prisma from '../config/database';
import { InterviewStatus } from '../generated/prisma';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';
import { MailUtil } from '../utils/mail.utils';

export class InterviewService {
  async createInterview(
    schedulerId: string,
    applicationId: string,
    assignedOfficerId: string,
    data: {
      scheduledDate: string;
      location: string;
      notes?: string;
    }
  ): Promise<any> {
    // Verify the scheduler exists and has proper permissions
    const scheduler = await prisma.user.findUnique({
      where: { id: schedulerId }
    });
    if (!scheduler || !['ADMIN', 'OFFICER'].includes(scheduler.role)) {
      throw new ForbiddenError('Only officers and admins can schedule interviews');
    }

    // Verify the assigned officer exists and is an officer
    const assignedOfficer = await prisma.user.findUnique({
      where: { id: assignedOfficerId }
    });
    if (!assignedOfficer || assignedOfficer.role !== 'OFFICER') {
      throw new BadRequestError('Invalid assigned officer');
    }

    // Verify the application exists
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

    // Check if there's already a scheduled interview for this application
    const existingInterview = await prisma.interview.findFirst({
      where: {
        applicationId,
        status: {
          in: ['SCHEDULED', 'RESCHEDULED']
        }
      }
    });

    if (existingInterview) {
      throw new BadRequestError('An interview is already scheduled for this application');
    }

    const interview = await prisma.interview.create({
      data: {
        applicationId,
        assignedOfficerId,
        assignedOfficerName: assignedOfficer.name,
        schedulerId,
        schedulerName: scheduler.name,
        scheduledDate: new Date(data.scheduledDate),
        location: data.location,
        status: InterviewStatus.SCHEDULED,
        notes: data.notes,
        confirmed: false,
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
        },
        scheduler: {
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
        assignedOfficer.name,
        data.notes
      );
    } catch (error) {
      console.error('Failed to send interview scheduled email:', error);
    }

    return this.mapToInterviewDto(interview);
  }

  async getInterviewById(userId: string, interviewId: string): Promise<any> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
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
        },
        assignedOfficer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        scheduler: {
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

    // Check access permissions
    if (user.role === 'APPLICANT' && interview.application.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    return this.mapToInterviewDto(interview);
  }

  async getApplicationInterviews(userId: string, applicationId: string): Promise<any[]> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    // Check access permissions
    if (user.role === 'APPLICANT' && application.userId !== userId) {
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
        },
        scheduler: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { scheduledDate: 'desc' }
    });

    return interviews.map(this.mapToInterviewDto);
  }

  async getOfficerInterviews(officerId: string): Promise<any[]> {
    const officer = await prisma.user.findUnique({ where: { id: officerId } });
    if (!officer || !['ADMIN', 'OFFICER'].includes(officer.role)) {
      throw new ForbiddenError('Access denied');
    }

    const interviews = await prisma.interview.findMany({
      where: {
        OR: [
          { assignedOfficerId: officerId },
          { schedulerId: officerId }
        ]
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
        },
        scheduler: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { scheduledDate: 'desc' }
    });

    return interviews.map(this.mapToInterviewDto);
  }

  async getApplicantInterviews(applicantId: string): Promise<any[]> {
    const applicant = await prisma.user.findUnique({ where: { id: applicantId } });
    if (!applicant) {
      throw new NotFoundError('User not found');
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
        },
        scheduler: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { scheduledDate: 'desc' }
    });

    return interviews.map(this.mapToInterviewDto);
  }

  async rescheduleInterview(
    officerId: string,
    interviewId: string,
    data: {
      scheduledDate?: string;
      location?: string;
      notes?: string;
    }
  ): Promise<any> {
    const officer = await prisma.user.findUnique({ where: { id: officerId } });
    if (!officer || !['ADMIN', 'OFFICER'].includes(officer.role)) {
      throw new ForbiddenError('Only officers and admins can reschedule interviews');
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
        },
        assignedOfficer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        scheduler: {
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

    // Only the assigned officer or scheduler can reschedule
    if (interview.assignedOfficerId !== officerId && interview.schedulerId !== officerId) {
      throw new ForbiddenError('Only the assigned officer or scheduler can reschedule this interview');
    }

    const updateData: any = {
      status: InterviewStatus.RESCHEDULED,
      confirmed: false,
      confirmedAt: null
    };

    if (data.scheduledDate) {
      updateData.scheduledDate = new Date(data.scheduledDate);
    }
    if (data.location) {
      updateData.location = data.location;
    }
    if (data.notes !== undefined) {
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
        },
        scheduler: {
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
        interview.assignedOfficer.name
      );
    } catch (error) {
      console.error('Failed to send interview rescheduled email:', error);
    }

    return this.mapToInterviewDto(updatedInterview);
  }

  async cancelInterview(officerId: string, interviewId: string): Promise<any> {
    const officer = await prisma.user.findUnique({ where: { id: officerId } });
    if (!officer || !['ADMIN', 'OFFICER'].includes(officer.role)) {
      throw new ForbiddenError('Only officers and admins can cancel interviews');
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
        },
        assignedOfficer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        scheduler: {
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

    // Only the assigned officer or scheduler can cancel
    if (interview.assignedOfficerId !== officerId && interview.schedulerId !== officerId) {
      throw new ForbiddenError('Only the assigned officer or scheduler can cancel this interview');
    }

    if (interview.status === 'CANCELLED') {
      throw new BadRequestError('Interview is already cancelled');
    }

    const updatedInterview = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: InterviewStatus.CANCELLED,
        confirmed: false,
        confirmedAt: null
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
        },
        scheduler: {
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
        interview.assignedOfficer.name
      );
    } catch (error) {
      console.error('Failed to send interview cancelled email:', error);
    }

    return this.mapToInterviewDto(updatedInterview);
  }

  async confirmInterview(applicantId: string, interviewId: string): Promise<any> {
    const applicant = await prisma.user.findUnique({ where: { id: applicantId } });
    if (!applicant) {
      throw new NotFoundError('User not found');
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
        },
        assignedOfficer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        scheduler: {
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

    // Only the applicant can confirm their own interview
    if (interview.application.userId !== applicantId) {
      throw new ForbiddenError('Access denied');
    }

    if (interview.confirmed) {
      throw new BadRequestError('Interview is already confirmed');
    }

    if (interview.status === 'CANCELLED') {
      throw new BadRequestError('Cannot confirm a cancelled interview');
    }

    const updatedInterview = await prisma.interview.update({
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
        },
        scheduler: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Send email notification to officer
    try {
      await MailUtil.sendInterviewConfirmedEmail(
        interview.assignedOfficer.email,
        interview.application.user.name,
        interview.application.applicationNumber,
        interview.application.visaType.name,
        interview.scheduledDate.toISOString(),
        interview.location
      );
    } catch (error) {
      console.error('Failed to send interview confirmed email:', error);
    }

    return this.mapToInterviewDto(updatedInterview);
  }

  async markInterviewCompleted(
    officerId: string,
    interviewId: string,
    data: {
      outcome: string;
      notes?: string;
    }
  ): Promise<any> {
    const officer = await prisma.user.findUnique({ where: { id: officerId } });
    if (!officer || !['ADMIN', 'OFFICER'].includes(officer.role)) {
      throw new ForbiddenError('Only officers and admins can mark interviews as completed');
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
        },
        assignedOfficer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        scheduler: {
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

    // Only the assigned officer can mark as completed
    if (interview.assignedOfficerId !== officerId) {
      throw new ForbiddenError('Only the assigned officer can mark this interview as completed');
    }

    if (interview.status === 'COMPLETED') {
      throw new BadRequestError('Interview is already marked as completed');
    }

    if (interview.status === 'CANCELLED') {
      throw new BadRequestError('Cannot mark a cancelled interview as completed');
    }

    const updatedInterview = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: InterviewStatus.COMPLETED,
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
        },
        scheduler: {
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
        interview.assignedOfficer.name
      );
    } catch (error) {
      console.error('Failed to send interview completed email:', error);
    }

    return this.mapToInterviewDto(updatedInterview);
  }

  // New method to get all officers for assignment
  async getOfficersForAssignment(): Promise<any[]> {
    const officers = await prisma.user.findMany({
      where: {
        role: 'OFFICER',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        title: true
      },
      orderBy: { name: 'asc' }
    });

    return officers;
  }

  // New method to get applications for interview scheduling
  async getApplicationsForInterviewScheduling(): Promise<any[]> {
    const applications = await prisma.visaApplication.findMany({
      where: {
        status: {
          in: ['SUBMITTED', 'UNDER_REVIEW']
        }
      },
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
            id: true,
            name: true
          }
        }
      },
      orderBy: { submissionDate: 'desc' }
    });

    return applications.map(app => ({
      id: app.id,
      applicationNumber: app.applicationNumber,
      applicantName: app.user.name,
      applicantEmail: app.user.email,
      visaTypeName: app.visaType.name,
      visaTypeId: app.visaType.id,
      status: app.status,
      submissionDate: app.submissionDate
    }));
  }

  private mapToInterviewDto(interview: any): any {
    return {
      id: interview.id,
      applicationId: interview.applicationId,
      scheduledDate: interview.scheduledDate,
      location: interview.location,
      status: interview.status,
      confirmed: interview.confirmed,
      confirmedAt: interview.confirmedAt,
      notes: interview.notes,
      outcome: interview.outcome,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
      application: interview.application,
      assignedOfficer: interview.assignedOfficer,
      scheduler: interview.scheduler
    };
  }
}
