import { Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import { VisaService } from '../services/visa.service';
import { authenticate, authorize, UserPayload } from '../middleware/auth.middleware';
import { BadRequestError } from '../utils/errors';

const visaService = new VisaService();

export class VisaController {
  static createVisaType = [
    authenticate,
    check('name').notEmpty().withMessage('Name is required'),
    check('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    check('processingTime').notEmpty().withMessage('Processing time is required'),
    check('duration').notEmpty().withMessage('Duration is required'),
    check('requirements').isArray().withMessage('Requirements must be an array'),
    check('eligibleCountries').isArray().withMessage('Eligible countries must be an array'),
    check('coverImage').notEmpty().withMessage('Cover image is required'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const userEmail = req.user?.email;
      if (!userEmail) {
        throw new BadRequestError('User not authenticated');
      }

      const visaType = await visaService.createVisaType(userEmail, req.body);
      res.json({
        success: true,
        message: 'Visa type created successfully',
        data: visaType
      });
    }
  ];

  static getAllVisaTypes = [
    async (req: Request, res: Response) => {
      const visaTypes = await visaService.getAllVisaTypes();
      res.json({
        success: true,
        message: 'Visa types retrieved successfully',
        data: visaTypes
      });
    }
  ];

  static getAllVisaTypesWithoutFilter = [
    authenticate,
    async (req: Request, res: Response) => {
      const visaTypes = await visaService.getAllVisaTypesWithoutFilter();
      res.json({
        success: true,
        message: '',
        data: visaTypes
      })
    }
  ];

  static getVisaTypeById = [
    check('id').isUUID().withMessage('Invalid visa type ID'),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const visaType = await visaService.getVisaTypeById(req.params.id);
      res.json({
        success: true,
        message: 'Visa type retrieved successfully',
        data: visaType
      });
    }
  ];

  static getVisaTypeBySlug = [
    check('slug').notEmpty().withMessage('Slug is required'),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const visaType = await visaService.getVisaTypeBySlug(req.params.slug);
      res.json({
        success: true,
        message: 'Visa type retrieved successfully',
        data: visaType
      });
    }
  ];

  static updateVisaType = [
    authenticate,
    check('id').isUUID().withMessage('Invalid visa type ID'),
    check('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    check('requirements').optional().isArray().withMessage('Requirements must be an array'),
    check('eligibleCountries').optional().isArray().withMessage('Eligible countries must be an array'),
    check('coverImage').optional().notEmpty().withMessage('Cover image is required'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const userEmail = req.user?.email;
      if (!userEmail) {
        throw new BadRequestError('User not authenticated');
      }

      const visaType = await visaService.updateVisaType(userEmail, req.params.id, req.body);
      res.json({
        success: true,
        message: 'Visa type updated successfully',
        data: visaType
      });
    }
  ];

  static deleteVisaType = [
    authenticate,
    check('id').isUUID().withMessage('Invalid visa type ID'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const userEmail = req.user?.email;
      if (!userEmail) {
        throw new BadRequestError('User not authenticated');
      }

      await visaService.deleteVisaType(userEmail, req.params.id);
      res.json({
        success: true,
        message: 'Visa type deleted successfully'
      });
    }
  ];
}
