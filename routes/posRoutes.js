import express from 'express';
import { protect, attachShop, requireApproved, requireRole, requireActiveSubscription } from '../middleware/auth.js';
import * as posCtrl from '../controllers/posController.js';

const router = express.Router();

router.use(protect, attachShop, requireApproved, requireRole('owner', 'staff'));

router.get('/search', posCtrl.searchProducts);
router.post('/orders', requireActiveSubscription, posCtrl.createPOSOrder);
router.get('/orders', posCtrl.listPOSOrders);
router.get('/orders/:id', posCtrl.getPOSOrder);

export default router;
