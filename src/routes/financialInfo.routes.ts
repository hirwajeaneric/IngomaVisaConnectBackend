import { Router } from 'express';
import { FinancialInfoController } from '../controllers/financialInfo.controller';
import { RequestHandler } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation';
import { financialInfoSchema } from '../lib/validation/financialInfo.schema';

const router = Router();

// Get financial info for an application
router.get('/:applicationId', authenticate, ...(FinancialInfoController.getFinancialInfo as RequestHandler[]));

// Update financial info for an application
router.post('/:applicationId', 
  authenticate,
  validateRequest(financialInfoSchema),
  ...(FinancialInfoController.createOrUpdateFinancialInfo as RequestHandler[])
);

export default router; 