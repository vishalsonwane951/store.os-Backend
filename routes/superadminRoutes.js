import express from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import * as sa from '../controllers/superadminController.js';

const router = express.Router();

router.use(protect, requireRole('superadmin'));

router.get('/dashboard', sa.getDashboardStats);

router.get('/shops', sa.listShops);
router.get('/shops/:id', sa.getShop);
router.put('/shops/:id/approve', sa.approveShop);
router.put('/shops/:id/reject', sa.rejectShop);
router.put('/shops/:id/toggle-active', sa.toggleShopActive);
router.get('/shops/:id/subscription-history', sa.getSubscriptionHistory);
router.post('/shops/:id/subscription', sa.assignSubscription);

router.get('/plans', sa.listPlans);
router.post('/plans', sa.createPlan);
router.put('/plans/:id', sa.updatePlan);
router.delete('/plans/:id', sa.deletePlan);

export default router;
