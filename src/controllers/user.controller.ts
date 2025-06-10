import { Request, Response } from 'express';
import { check, validationResult } from 'express-validator';
import { UserService } from '../services/user.service';
import { authenticate, authorize, UserPayload } from '../middleware/auth.middleware';
import { BadRequestError, ForbiddenError } from '../utils/errors';
import { Role } from '../generated/prisma';

const userService = new UserService();

export class UserController {
  static getProfile = [
    authenticate,
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const email = req.user?.email;
      if (!email) {
        throw new BadRequestError('User not authenticated');
      }
      const profile = await userService.getProfile(email);
      res.json({
        success: true,
        message: 'Profile retrieved successfully',
        data: profile
      });
    },
  ];

  static updateProfile = [
    authenticate,
    check('name').notEmpty().withMessage('Name is required'),
    check('email').optional().isEmail().withMessage('Invalid email format'),
    check('phone').optional().isMobilePhone('any').withMessage('Invalid phone number format'),
    check('department').optional(),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }
      const email = (req as Request & { user?: { email: string } }).user?.email;
      if (!email) {
        throw new BadRequestError('User not authenticated');
      }
      const { email: newEmail, name, phone } = req.body;
      const profile = await userService.updateProfile(email, { email: newEmail, name, phone });
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: profile
      });
    },
  ];

  static updateAvatar = [
    authenticate,
    check('avatarUrl').isURL().withMessage('Invalid avatar URL format'),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }
      const email = (req as Request & { user?: { email: string } }).user?.email;
      if (!email) {
        throw new BadRequestError('User not authenticated');
      }
      const { avatarUrl } = req.body;
      const profile = await userService.updateAvatar(email, avatarUrl);
      res.json({
        success: true,
        message: 'Avatar updated successfully',
        data: profile
      });
    },
  ];

  static getAllUsers = [
    authenticate,
    authorize('USERS_VIEW_USERS'),
    async (req: Request & { user?: UserPayload }, res: Response) => {
      const adminEmail = req.user?.email;
      if (!adminEmail) {
        throw new BadRequestError('User not authenticated');
      }
      const users = await userService.getAllUsers(adminEmail);
      res.json({
        success: true,
        message: 'Users retrieved successfully',
        data: users
      });
    },
  ];

  static getUserById = [
    authenticate,
    authorize('USERS_VIEW_USERS'),
    check('userId').isUUID().withMessage('Invalid user ID'),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }
      const adminEmail = (req as Request & { user?: UserPayload }).user?.email;
      if (!adminEmail) {
        throw new BadRequestError('User not authenticated');
      }
      const user = await userService.getUserById(adminEmail, req.params.userId);
      res.json({
        success: true,
        message: 'User retrieved successfully',
        data: user
      });
    },
  ];

  static updateUser = [
    authenticate,
    authorize('USERS_MANAGE_USERS'),
    check('name').notEmpty().withMessage('Name is required'),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }
      const adminEmail = (req as Request & { user?: UserPayload }).user?.email;
      if (!adminEmail) {
        throw new BadRequestError('User not authenticated');
      }
      const { name, role, phone, department, title, permissions, isActive } = req.body;
      const user = await userService.updateUser(adminEmail, {
        id: req.params.userId,
        name,
        role,
        phone,
        department,
        title,
        permissions,
        isActive,
      });
      res.json({
        success: true,
        message: 'User updated successfully',
        data: user
      });
    },
  ];

  static deleteUser = [
    authenticate,
    authorize('USERS_MANAGE_USERS'),
    check('userId').isUUID().withMessage('Invalid user ID'),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }
      const adminEmail = (req as Request & { user?: UserPayload }).user?.email;
      if (!adminEmail) {
        throw new BadRequestError('User not authenticated');
      }
      await userService.deleteUser(adminEmail, req.params.userId);
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    },
  ];

  static createOfficer = [
    authenticate,
    authorize('USERS_CREATE_ADMIN'),
    check('email').isEmail().withMessage('Invalid email'),
    check('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    check('name').notEmpty().withMessage('Name is required'),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }
      const adminEmail = (req as Request & { user?: UserPayload }).user?.email;
      if (!adminEmail) {
        throw new BadRequestError('User not authenticated');
      }
      const { email, password, name, phone, department, title } = req.body;
      const officer = await userService.createOfficer(adminEmail, { email, password, name, phone, department, title });
      res.json({
        success: true,
        message: 'Officer created successfully',
        data: officer
      });
    },
  ];

  static updateOfficerPermissions = [
    authenticate,
    authorize('USERS_MANAGE_USERS'),
    check('officerId').isUUID().withMessage('Invalid officer ID'),
    check('permissions').isArray().withMessage('Permissions must be an array'),
    check('permissions.*').isString().withMessage('Each permission must be a string'),
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }
      const adminEmail = (req as Request & { user?: UserPayload }).user?.email;
      const adminRole = (req as Request & { user?: UserPayload }).user?.role;

      if (!adminEmail || !adminRole) {
        throw new BadRequestError('User not authenticated');
      }

      if (adminRole !== Role.ADMIN) {
        throw new ForbiddenError('Only admins can update officer permissions');
      }

      const { permissions } = req.body;
      const officer = await userService.updateOfficerPermissions(adminEmail, req.params.officerId, permissions);
      res.json({
        success: true,
        message: 'Officer permissions updated successfully',
        data: officer
      });
    },
  ];
}