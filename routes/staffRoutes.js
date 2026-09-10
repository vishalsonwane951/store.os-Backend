import express from 'express';
import { protect, attachShop, requireApproved, requireRole } from '../middleware/auth.js';
import * as staffCtrl from '../controllers/staffController.js';

const router = express.Router();

router.use(protect, attachShop, requireApproved, requireRole('owner'));

router.get('/', staffCtrl.listStaff);
router.put('/:id/approve', staffCtrl.approveStaff);
router.put('/:id/reject', staffCtrl.rejectStaff);
router.put('/:id/toggle-active', staffCtrl.toggleStaffActive);
router.delete('/:id', staffCtrl.removeStaff);

export default router;
