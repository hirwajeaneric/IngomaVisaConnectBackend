import { Router } from 'express';
import { VisaController } from '../controllers/visa.controller';
import { RequestHandler } from 'express';

const router = Router();

// Visa Type routes
router.post('/types', ...(VisaController.createVisaType as RequestHandler[]));
router.get('/types', ...(VisaController.getAllVisaTypes as RequestHandler[]));
router.get('/types', ...(VisaController.getAllVisaTypesWithoutFilter as RequestHandler[]));
router.get('/types/:id', ...(VisaController.getVisaTypeById as RequestHandler[]));
router.get('/types/slug/:slug', ...(VisaController.getVisaTypeBySlug as RequestHandler[]));
router.put('/types/:id', ...(VisaController.updateVisaType as RequestHandler[]));
router.delete('/types/:id', ...(VisaController.deleteVisaType as RequestHandler[]));

export default router;
