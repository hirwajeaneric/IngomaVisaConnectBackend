import { check } from 'express-validator';

export const personalInfoSchema = [
  check('firstName').notEmpty().withMessage('First name is required'),
  check('lastName').notEmpty().withMessage('Last name is required'),
  check('dateOfBirth').isISO8601().withMessage('Invalid date of birth'),
  check('nationality').notEmpty().withMessage('Nationality is required'),
  check('passportNumber').notEmpty().withMessage('Passport number is required'),
  check('passportIssueDate').isISO8601().withMessage('Invalid passport issue date'),
  check('passportExpiryDate').isISO8601().withMessage('Invalid passport expiry date'),
  check('passportIssuingCountry').notEmpty().withMessage('Place of passport issuance is required'),
  check('gender').isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  check('email').isEmail().withMessage('Invalid email format'),
  check('phone').notEmpty().withMessage('Phone number is required'),
  check('address').notEmpty().withMessage('Current address is required')
]; 