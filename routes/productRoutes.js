import express from 'express';
import { protect, attachShop, requireApproved, requireRole, requireActiveSubscription } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import * as productCtrl from '../controllers/productController.js';

const router = express.Router();

router.use(protect, attachShop, requireApproved);
router.use((req, res, next) => { req.admin = ['owner', 'staff'].includes(req.user.role); next(); });

const ownerOrStaff = requireRole('owner', 'staff');

router.get('/', productCtrl.getProducts);
router.get('/featured', productCtrl.getFeaturedProducts);
router.get('/:id', productCtrl.getProduct);
router.post('/', ownerOrStaff, requireActiveSubscription, upload.array('images', 5), productCtrl.createProduct);
router.put('/:id', ownerOrStaff, requireActiveSubscription, upload.array('images', 5), productCtrl.updateProduct);
router.delete('/:id', ownerOrStaff, requireActiveSubscription, productCtrl.deleteProduct);
router.post('/:id/reviews', productCtrl.addReview);

export default router;
