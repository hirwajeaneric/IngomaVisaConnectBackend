import { Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import { NotesService } from '../services/notes.service';
import { authenticate, authorize, UserPayload } from '../middleware/auth.middleware';
import { BadRequestError } from '../utils/errors';

const notesService = new NotesService();

export class NotesController {
  static getApplicationNotes = [
    authenticate,
    authorize('APPLICATIONS_VIEW_APPLICATIONS'),
    check('applicationId').isUUID().withMessage('Invalid application ID'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const notes = await notesService.getApplicationNotes(req.params.applicationId);

      res.json({
        success: true,
        message: 'Notes retrieved successfully',
        data: notes
      });
    }
  ];

  static createNote = [
    authenticate,
    authorize('APPLICATIONS_MANAGE_APPLICATIONS'),
    check('applicationId').isUUID().withMessage('Invalid application ID'),
    check('content').notEmpty().withMessage('Note content is required'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const officerId = req.user?.id;
      if (!officerId) {
        throw new BadRequestError('User not authenticated');
      }

      const { content } = req.body;
      const note = await notesService.createNote(officerId, req.params.applicationId, content);

      res.status(201).json({
        success: true,
        message: 'Note created successfully',
        data: note
      });
    }
  ];

  static updateNote = [
    authenticate,
    authorize('APPLICATIONS_MANAGE_APPLICATIONS'),
    check('noteId').isUUID().withMessage('Invalid note ID'),
    check('content').notEmpty().withMessage('Note content is required'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const officerId = req.user?.id;
      if (!officerId) {
        throw new BadRequestError('User not authenticated');
      }

      const { content } = req.body;
      const note = await notesService.updateNote(officerId, req.params.noteId, content);

      res.json({
        success: true,
        message: 'Note updated successfully',
        data: note
      });
    }
  ];

  static deleteNote = [
    authenticate,
    authorize('APPLICATIONS_MANAGE_APPLICATIONS'),
    check('noteId').isUUID().withMessage('Invalid note ID'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const officerId = req.user?.id;
      if (!officerId) {
        throw new BadRequestError('User not authenticated');
      }

      await notesService.deleteNote(officerId, req.params.noteId);

      res.json({
        success: true,
        message: 'Note deleted successfully'
      });
    }
  ];
} 