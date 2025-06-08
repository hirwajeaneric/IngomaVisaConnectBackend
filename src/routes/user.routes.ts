import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { RequestHandler } from 'express';

const router = Router();

router.get('/profile', ...(UserController.getProfile as RequestHandler[]));
router.put('/profile', ...(UserController.updateProfile as RequestHandler[]));
router.put('/avatar', ...(UserController.updateAvatar as RequestHandler[]));
router.get('/', ...(UserController.getAllUsers as RequestHandler[]));
router.get('/:userId', ...(UserController.getUserById as RequestHandler[]));
router.put('/:userId', ...(UserController.updateUser as RequestHandler[]));
router.delete('/:userId', ...(UserController.deleteUser as RequestHandler[]));
router.post('/officer', ...(UserController.createOfficer as RequestHandler[]));
router.put('/officer/:officerId/permissions', ...(UserController.updateOfficerPermissions as RequestHandler[]));

export default router;