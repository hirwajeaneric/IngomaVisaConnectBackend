import { check } from 'express-validator';

export const travelInfoSchema = [
  check('visaTypeId').isUUID().withMessage('Invalid visa type ID'),
  check('purposeOfTravel').notEmpty().withMessage('Purpose of travel is required'),
  check('entryDate').isISO8601().withMessage('Invalid entry date'),
  check('exitDate').isISO8601().withMessage('Invalid exit date'),
  check('portOfEntry').notEmpty().withMessage('Port of entry is required'),
  check('previousVisits').isBoolean().withMessage('Previous visits must be boolean'),
  check('accommodationDetails').notEmpty().withMessage('Accommodation details are required')
]; 