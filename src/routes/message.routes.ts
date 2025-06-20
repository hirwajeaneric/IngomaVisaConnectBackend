import { Router } from 'express';
import { MessageController } from '../controllers/message.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all message routes
router.use(authenticate);

// Create a new message
// POST /api/messages
router.post('/', MessageController.createMessage);

// Get messages for a specific application
// GET /api/messages/application/:applicationId
router.get('/application/:applicationId', MessageController.getMessagesByApplication);

// Get messages between two users
// GET /api/messages/between/:userId1/:userId2
router.get('/between/:userId1/:userId2', MessageController.getMessagesBetweenUsers);

// Get a specific message by ID
// GET /api/messages/:messageId
router.get('/:messageId', MessageController.getMessageById);

// Update a message
// PUT /api/messages/:messageId
router.put('/:messageId', MessageController.updateMessage);

// Mark message as read
// PATCH /api/messages/:messageId/read
router.patch('/:messageId/read', MessageController.markAsRead);

// Mark all messages as read for a user in an application
// PATCH /api/messages/application/:applicationId/read-all
router.patch('/application/:applicationId/read-all', MessageController.markAllAsRead);

// Delete a message
// DELETE /api/messages/:messageId
router.delete('/:messageId', MessageController.deleteMessage);

// Get unread message count for a user
// GET /api/messages/unread/count
router.get('/unread/count', MessageController.getUnreadCount);

// Get unread message count for a user in a specific application
// GET /api/messages/application/:applicationId/unread/count
router.get('/application/:applicationId/unread/count', MessageController.getUnreadCountByApplication);

export default router;
