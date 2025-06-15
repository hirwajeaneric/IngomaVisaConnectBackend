import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation';
import { financialInfoSchema } from '../lib/validation/financialInfo.schema';
import { FinancialInfoController } from '../controllers/financialInfo.controller';

const router = Router();

// Get financial info for an application
router.get(
  '/:applicationId',
  authenticate,
  FinancialInfoController.getFinancialInfo
);

// Create or update financial info for an application
router.post(
  '/:applicationId',
  authenticate,
  validateRequest(financialInfoSchema),
  FinancialInfoController.createOrUpdateFinancialInfo
);

export default router; 