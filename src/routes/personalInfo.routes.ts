import { Router } from 'express';
import { PersonalInfoController } from '../controllers/personalInfo.controller';
import { RequestHandler } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation';
import { personalInfoSchema } from '../lib/validation/personalInfo.schema';

const router = Router();

// Get personal info for an application
router.get('/:applicationId', authenticate, ...(PersonalInfoController.getPersonalInfo as RequestHandler[]));

// Update personal info for an application
router.put('/:applicationId', 
  authenticate,
  validateRequest(personalInfoSchema),
  ...(PersonalInfoController.createOrUpdatePersonalInfo as RequestHandler[])
);

export default router;
