import { Request, Response } from 'express';
import { MessageService, CreateMessageData, UpdateMessageData } from '../services/message.service';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permission: string[];
  };
}

export class MessageController {
  /**
   * Create a new message
   * POST /api/messages
   */
  static async createMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { recipientId, applicationId, content, replyToId, attachments } = req.body;
      const senderId = req.user?.id;

      if (!senderId) {
        throw new UnauthorizedError('User not authenticated');
      }

      if (!recipientId || !applicationId || !content) {
        throw new BadRequestError('recipientId, applicationId, and content are required');
      }

      const messageData: CreateMessageData = {
        senderId,
        recipientId,
        applicationId,
        content,
        replyToId,
        attachments
      };

      const message = await MessageService.createMessage(messageData);

      res.status(201).json({
        success: true,
        data: message,
        message: 'Message created successfully'
      });
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof UnauthorizedError) {
        res.status(error instanceof BadRequestError ? 400 : error instanceof NotFoundError ? 404 : 401).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get messages for a specific application
   * GET /api/messages/application/:applicationId
   */
  static async getMessagesByApplication(req: AuthenticatedRequest, res: Response) {
    try {
      const { applicationId } = req.params;
      const userId = req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      if (!applicationId) {
        throw new BadRequestError('Application ID is required');
      }

      const result = await MessageService.getMessagesByApplication(applicationId, userId, page, limit);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Messages retrieved successfully'
      });
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof UnauthorizedError) {
        res.status(error instanceof BadRequestError ? 400 : error instanceof NotFoundError ? 404 : 401).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get messages between two users
   * GET /api/messages/between/:userId1/:userId2
   */
  static async getMessagesBetweenUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId1, userId2 } = req.params;
      const currentUserId = req.user?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!currentUserId) {
        throw new UnauthorizedError('User not authenticated');
      }

      // Ensure the current user is one of the participants
      if (currentUserId !== userId1 && currentUserId !== userId2) {
        throw new UnauthorizedError('You can only view messages you are part of');
      }

      const result = await MessageService.getMessagesBetweenUsers(userId1, userId2, page, limit);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Messages retrieved successfully'
      });
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof UnauthorizedError) {
        res.status(error instanceof BadRequestError ? 400 : 401).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get a specific message by ID
   * GET /api/messages/:messageId
   */
  static async getMessageById(req: AuthenticatedRequest, res: Response) {
    try {
      const { messageId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      if (!messageId) {
        throw new BadRequestError('Message ID is required');
      }

      const message = await MessageService.getMessageById(messageId, userId);

      res.status(200).json({
        success: true,
        data: message,
        message: 'Message retrieved successfully'
      });
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof UnauthorizedError) {
        res.status(error instanceof BadRequestError ? 400 : error instanceof NotFoundError ? 404 : 401).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  /**
   * Update a message
   * PUT /api/messages/:messageId
   */
  static async updateMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { messageId } = req.params;
      const { content, isRead, attachments } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      if (!messageId) {
        throw new BadRequestError('Message ID is required');
      }

      const updateData: UpdateMessageData = {
        content,
        isRead,
        attachments
      };

      const message = await MessageService.updateMessage(messageId, updateData, userId);

      res.status(200).json({
        success: true,
        data: message,
        message: 'Message updated successfully'
      });
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof UnauthorizedError) {
        res.status(error instanceof BadRequestError ? 400 : error instanceof NotFoundError ? 404 : 401).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  /**
   * Mark message as read
   * PATCH /api/messages/:messageId/read
   */
  static async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const { messageId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      if (!messageId) {
        throw new BadRequestError('Message ID is required');
      }

      const message = await MessageService.markAsRead(messageId, userId);

      res.status(200).json({
        success: true,
        data: message,
        message: 'Message marked as read'
      });
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof UnauthorizedError) {
        res.status(error instanceof BadRequestError ? 400 : error instanceof NotFoundError ? 404 : 401).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  /**
   * Mark all messages as read for a user in an application
   * PATCH /api/messages/application/:applicationId/read-all
   */
  static async markAllAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const { applicationId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      if (!applicationId) {
        throw new BadRequestError('Application ID is required');
      }

      const result = await MessageService.markAllAsRead(applicationId, userId);

      res.status(200).json({
        success: true,
        data: result,
        message: `${result.count} messages marked as read`
      });
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof UnauthorizedError) {
        res.status(error instanceof BadRequestError ? 400 : 401).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  /**
   * Delete a message
   * DELETE /api/messages/:messageId
   */
  static async deleteMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const { messageId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      if (!messageId) {
        throw new BadRequestError('Message ID is required');
      }

      await MessageService.deleteMessage(messageId, userId);

      res.status(200).json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof UnauthorizedError) {
        res.status(error instanceof BadRequestError ? 400 : error instanceof NotFoundError ? 404 : 401).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get unread message count for a user
   * GET /api/messages/unread/count
   */
  static async getUnreadCount(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const result = await MessageService.getUnreadCount(userId);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Unread count retrieved successfully'
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        res.status(401).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get unread message count for a user in a specific application
   * GET /api/messages/application/:applicationId/unread/count
   */
  static async getUnreadCountByApplication(req: AuthenticatedRequest, res: Response) {
    try {
      const { applicationId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      if (!applicationId) {
        throw new BadRequestError('Application ID is required');
      }

      const result = await MessageService.getUnreadCountByApplication(applicationId, userId);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Unread count retrieved successfully'
      });
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof UnauthorizedError) {
        res.status(error instanceof BadRequestError ? 400 : 401).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }
}
