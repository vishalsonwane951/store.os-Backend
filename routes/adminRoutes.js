import express from 'express';
import { protect, attachShop, requireApproved, requireRole } from '../middleware/auth.js';
import { getUsers, deleteUser, updateUserRole } from '../controllers/adminController.js';

const router = express.Router();

router.use(protect, attachShop, requireApproved, requireRole('owner', 'staff'));

router.get('/', getUsers);
router.delete('/:id', deleteUser);
router.put('/:id/role', requireRole('owner'), updateUserRole);

export default router;
