import express from 'express';
import { protect, attachShop, requireApproved } from '../middleware/auth.js';
import { getWishlist, toggleWishlist } from '../controllers/wishlistController.js';

const router = express.Router();

router.use(protect, attachShop, requireApproved);

router.get('/', getWishlist);
router.put('/:productId', toggleWishlist);

export default router;
