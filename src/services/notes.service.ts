import { PrismaClient } from '../generated/prisma/index';
import { BadRequestError, NotFoundError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export class NotesService {
  async getApplicationNotes(applicationId: string) {
    const notes = await prisma.notes.findMany({
      where: {
        applicationId
      },
      include: {
        officer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return notes;
  }

  async createNote(officerId: string, applicationId: string, content: string) {
    // Verify the application exists
    const application = await prisma.visaApplication.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    // Verify the officer exists
    const officer = await prisma.user.findUnique({
      where: { id: officerId }
    });

    if (!officer) {
      throw new NotFoundError('Officer not found');
    }

    const note = await prisma.notes.create({
      data: {
        applicationId,
        content,
        officerId
      },
      include: {
        officer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return note;
  }

  async updateNote(officerId: string, noteId: string, content: string) {
    const note = await prisma.notes.findUnique({
      where: { id: noteId }
    });

    if (!note) {
      throw new NotFoundError('Note not found');
    }

    // Only the officer who created the note can update it
    if (note.officerId !== officerId) {
      throw new BadRequestError('You can only update your own notes');
    }

    const updatedNote = await prisma.notes.update({
      where: { id: noteId },
      data: { content },
      include: {
        officer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return updatedNote;
  }

  async deleteNote(officerId: string, noteId: string) {
    const note = await prisma.notes.findUnique({
      where: { id: noteId }
    });

    if (!note) {
      throw new NotFoundError('Note not found');
    }

    // Only the officer who created the note can delete it
    if (note.officerId !== officerId) {
      throw new BadRequestError('You can only delete your own notes');
    }

    await prisma.notes.delete({
      where: { id: noteId }
    });

    return { success: true };
  }
} 