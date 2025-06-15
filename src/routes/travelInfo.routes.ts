import { Router } from 'express';
import { TravelInfoController } from '../controllers/travelInfo.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Create or update travel information
router.post(
  '/:applicationId',
  authenticate,
  TravelInfoController.createOrUpdateTravelInfo
);

// Get travel information
router.get(
  '/:applicationId',
  authenticate,
  TravelInfoController.getTravelInfo
);

export default router;