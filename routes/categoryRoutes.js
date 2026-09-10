import express from 'express';
import { protect, attachShop, requireApproved, requireRole, requireActiveSubscription } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import * as categoryCtrl from '../controllers/categoryController.js';

const router = express.Router();

router.use(protect, attachShop, requireApproved);
router.use((req, res, next) => { req.admin = ['owner', 'staff'].includes(req.user.role); next(); });

const ownerOrStaff = requireRole('owner', 'staff');

router.get('/', categoryCtrl.getCategories);
router.post('/', ownerOrStaff, requireActiveSubscription, upload.single('image'), categoryCtrl.createCategory);
router.put('/:id', ownerOrStaff, requireActiveSubscription, upload.single('image'), categoryCtrl.updateCategory);
router.delete('/:id', ownerOrStaff, requireActiveSubscription, categoryCtrl.deleteCategory);

export default router;
