import { Router } from 'express';
import { NotesController } from '../controllers/notes.controller';
import { RequestHandler } from 'express';

const router = Router();

// Get all notes for an application
router.get('/applications/:applicationId/notes', ...(NotesController.getApplicationNotes as RequestHandler[]));

// Create a new note for an application
router.post('/applications/:applicationId/notes', ...(NotesController.createNote as RequestHandler[]));

// Update a note
router.put('/notes/:noteId', ...(NotesController.updateNote as RequestHandler[]));

// Delete a note
router.delete('/notes/:noteId', ...(NotesController.deleteNote as RequestHandler[]));

export default router; 