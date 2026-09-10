import express from 'express';
import { protect, attachShop, requireApproved, requireRole } from '../middleware/auth.js';
import * as orderCtrl from '../controllers/orderController.js';

const router = express.Router();

router.use(protect, attachShop, requireApproved);
const ownerOrStaff = requireRole('owner', 'staff');

router.post('/', orderCtrl.createOrder);
router.get('/my', orderCtrl.getMyOrders);
router.get('/stats', ownerOrStaff, orderCtrl.getStats);
router.get('/all', ownerOrStaff, orderCtrl.getAllOrders);
router.get('/:id', orderCtrl.getOrder);
router.put('/:id/status', ownerOrStaff, orderCtrl.updateOrderStatus);

export default router;
