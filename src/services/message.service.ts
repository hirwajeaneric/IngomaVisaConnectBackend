import { PrismaClient, Message, Prisma } from '../generated/prisma';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { MailUtil } from '../utils/mail.utils';

const prisma = new PrismaClient();

export interface CreateMessageData {
  senderId: string;
  recipientId: string;
  applicationId: string;
  content: string;
  replyToId?: string;
  attachments?: string[];
}

export interface UpdateMessageData {
  content?: string;
  isRead?: boolean;
  attachments?: string[];
}

export class MessageService {
  /**
   * Create a new message
   */
  static async createMessage(data: CreateMessageData): Promise<Message> {
    try {
      // Validate that sender and recipient exist
      const [sender, recipient, application] = await Promise.all([
        prisma.user.findUnique({ where: { id: data.senderId } }),
        prisma.user.findUnique({ where: { id: data.recipientId } }),
        prisma.visaApplication.findUnique({ where: { id: data.applicationId } })
      ]);

      if (!sender) {
        throw new NotFoundError('Sender not found');
      }

      if (!recipient) {
        throw new NotFoundError('Recipient not found');
      }

      if (!application) {
        throw new NotFoundError('Application not found');
      }

      // If this is a reply, validate the parent message
      if (data.replyToId) {
        const parentMessage = await prisma.message.findUnique({
          where: { id: data.replyToId }
        });
        if (!parentMessage) {
          throw new NotFoundError('Parent message not found');
        }
      }

      const message = await prisma.message.create({
        data: {
          senderId: data.senderId,
          recipientId: data.recipientId,
          applicationId: data.applicationId,
          content: data.content,
          replyToId: data.replyToId,
          attachments: data.attachments || [],
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          },
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          },
          application: {
            select: {
              id: true,
              applicationNumber: true,
            }
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              sender: {
                select: {
                  name: true,
                }
              }
            }
          }
        }
      });

      // Send notification to recipient
      await MailUtil.sendMail({
        to: recipient.email,
        subject: 'New Message Received',
        html: `You have received a new message from ${sender.name} regarding application ${application.applicationNumber}.`
      });

      // Log the action
      await prisma.auditLog.create({
        data: {
          email: sender.email,
          userRole: sender.role,
          action: 'CREATE_MESSAGE',
          entityType: 'Message',
          details: {
            messageId: message.id,
            applicationId: data.applicationId,
            recipientId: data.recipientId,
          }  
        }
      });

      return message;
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof UnauthorizedError) {
        throw error;
      }
      throw new BadRequestError('Failed to create message');
    }
  }

  /**
   * Get all messages for a specific application
   */
  static async getMessagesByApplication(
    applicationId: string,
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ messages: Message[]; total: number; page: number; totalPages: number }> {
    try {
      // Verify application exists (removed access control restriction)
      const application = await prisma.visaApplication.findUnique({
        where: { id: applicationId }
      });

      if (!application) {
        throw new NotFoundError('Application not found');
      }

      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where: { applicationId },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              }
            },
            recipient: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              }
            },
            replies: {
              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  }
                },
                recipient: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.message.count({ where: { applicationId } })
      ]);

      return {
        messages,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      throw new BadRequestError('Failed to fetch messages');
    }
  }

  /**
   * Get messages between two users
   */
  static async getMessagesBetweenUsers(
    userId1: string,
    userId2: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ messages: Message[]; total: number; page: number; totalPages: number }> {
    try {
      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where: {
            OR: [
              {
                AND: [
                  { senderId: userId1 },
                  { recipientId: userId2 }
                ]
              },
              {
                AND: [
                  { senderId: userId2 },
                  { recipientId: userId1 }
                ]
              }
            ]
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              }
            },
            recipient: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              }
            },
            application: {
              select: {
                id: true,
                applicationNumber: true,
              }
            },
            replies: {
              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  }
                },
                recipient: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.message.count({
          where: {
            OR: [
              {
                AND: [
                  { senderId: userId1 },
                  { recipientId: userId2 }
                ]
              },
              {
                AND: [
                  { senderId: userId2 },
                  { recipientId: userId1 }
                ]
              }
            ]
          }
        })
      ]);

      return {
        messages,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new BadRequestError('Failed to fetch messages between users');
    }
  }

  /**
   * Get a specific message by ID
   */
  static async getMessageById(messageId: string, userId: string): Promise<Message> {
    try {
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          OR: [
            { senderId: userId },
            { recipientId: userId }
          ]
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          },
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          },
          application: {
            select: {
              id: true,
              applicationNumber: true,
            }
          },
          replyTo: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                }
              },
              recipient: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                }
              }
            }
          },
          replies: {
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                }
              },
              recipient: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                }
              }
            }
          }
        }
      });

      if (!message) {
        throw new NotFoundError('Message not found or access denied');
      }

      return message;
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      throw new BadRequestError('Failed to fetch message');
    }
  }

  /**
   * Update a message (only sender can update)
   */
  static async updateMessage(
    messageId: string,
    data: UpdateMessageData,
    userId: string
  ): Promise<Message> {
    try {
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          senderId: userId
        }
      });

      if (!message) {
        throw new NotFoundError('Message not found or you are not authorized to edit it');
      }

      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: {
          content: data.content,
          isRead: data.isRead,
          attachments: data.attachments,
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          },
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          },
          application: {
            select: {
              id: true,
              applicationNumber: true,
            }
          }
        }
      });

      // Log the action
      await prisma.auditLog.create({
        data: {
          email: updatedMessage.sender.email,
          userRole: updatedMessage.sender.role,
          action: 'UPDATE_MESSAGE',
          entityType: 'Message',
          details: {
            messageId: messageId,
            applicationId: updatedMessage.applicationId,
          }
        }
      });

      return updatedMessage;
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      throw new BadRequestError('Failed to update message');
    }
  }

  /**
   * Mark message as read
   */
  static async markAsRead(messageId: string, userId: string): Promise<Message> {
    try {
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          recipientId: userId
        }
      });

      if (!message) {
        throw new NotFoundError('Message not found or you are not the recipient');
      }

      if (message.isRead) {
        return message;
      }

      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: { isRead: true },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          },
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          }
        }
      });

      return updatedMessage;
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      throw new BadRequestError('Failed to mark message as read');
    }
  }

  /**
   * Mark all messages as read for a user in an application
   */
  static async markAllAsRead(applicationId: string, userId: string): Promise<{ count: number }> {
    try {
      const result = await prisma.message.updateMany({
        where: {
          applicationId,
          recipientId: userId,
          isRead: false
        },
        data: { isRead: true }
      });

      return { count: result.count };
    } catch (error) {
      throw new BadRequestError('Failed to mark messages as read');
    }
  }

  /**
   * Delete a message (only sender can delete)
   */
  static async deleteMessage(messageId: string, userId: string): Promise<void> {
    try {
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          senderId: userId
        },
        include: {
          sender: {
            select: {
              email: true,
              role: true,
            }
          }
        }
      });

      if (!message) {
        throw new NotFoundError('Message not found or you are not authorized to delete it');
      }

      await prisma.message.delete({
        where: { id: messageId }
      });

      // Log the action
      await prisma.auditLog.create({
        data: {
          email: message.sender.email,
          userRole: message.sender.role,
          action: 'DELETE_MESSAGE',
          entityType: 'Message',
          details: {
            messageId: messageId,
            applicationId: message.applicationId,
          }
        }
      });
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError) {
        throw error;
      }
      throw new BadRequestError('Failed to delete message');
    }
  }

  /**
   * Get unread message count for a user
   */
  static async getUnreadCount(userId: string): Promise<{ count: number }> {
    try {
      const count = await prisma.message.count({
        where: {
          recipientId: userId,
          isRead: false
        }
      });

      return { count };
    } catch (error) {
      throw new BadRequestError('Failed to get unread message count');
    }
  }

  /**
   * Get unread message count for a user in a specific application
   */
  static async getUnreadCountByApplication(
    applicationId: string,
    userId: string
  ): Promise<{ count: number }> {
    try {
      const count = await prisma.message.count({
        where: {
          applicationId,
          recipientId: userId,
          isRead: false
        }
      });

      return { count };
    } catch (error) {
      throw new BadRequestError('Failed to get unread message count');
    }
  }

  /**
   * Get all messages where the user is the recipient
   */
  static async getMyMessages(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ messages: Message[]; total: number; page: number; totalPages: number }> {
    try {
      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where: { recipientId: userId },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              }
            },
            recipient: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              }
            },
            application: {
              select: {
                id: true,
                applicationNumber: true,
                status: true,
                visaType: {
                  select: {
                    name: true,
                  }
                }
              }
            },
            replyTo: {
              select: {
                id: true,
                content: true,
                sender: {
                  select: {
                    name: true,
                  }
                }
              }
            },
            replies: {
              include: {
                sender: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  }
                },
                recipient: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.message.count({ where: { recipientId: userId } })
      ]);

      return {
        messages,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new BadRequestError('Failed to fetch your messages');
    }
  }
}
