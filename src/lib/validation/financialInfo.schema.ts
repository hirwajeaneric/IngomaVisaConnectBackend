import { check } from 'express-validator';

export const financialInfoSchema = [
  check('fundingSource').notEmpty().withMessage('Funding source is required'),
  check('monthlyIncome').isNumeric().withMessage('Monthly income must be a number'),
  check('sponsorDetails').optional().isString().withMessage('Sponsor details must be a string')
]; 