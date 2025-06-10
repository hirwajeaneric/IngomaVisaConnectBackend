import { Router } from 'express';
import { TravelInfoController } from '../controllers/travelInfo.controller';
import { RequestHandler } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation';
import { travelInfoSchema } from '../lib/validation/travelInfo.schema';

const router = Router();

// Get travel info for an application
router.get('/:applicationId', authenticate, ...(TravelInfoController.getTravelInfo as RequestHandler[]));

// Update travel info for an application
router.put('/:applicationId', 
  authenticate,
  validateRequest(travelInfoSchema),
  ...(TravelInfoController.createOrUpdateTravelInfo as RequestHandler[])
);

export default router;