import express from 'express';
import { protect, attachShop, requireApproved, requireRole } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import { getMyShop, updateMyShop, getMySubscription } from '../controllers/shopController.js';

const router = express.Router();

router.use(protect, attachShop, requireApproved, requireRole('owner', 'staff'));

router.get('/', getMyShop);
router.put('/', requireRole('owner'), upload.single('logo'), updateMyShop);
router.get('/subscription', getMySubscription);

export default router;
