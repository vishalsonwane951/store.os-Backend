import express from 'express';
import { registerShop, login, superadminLogin, getMe, updateProfile, addToWishlist } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register-shop', registerShop); // new store owner sign-up (goes to pending approval)
router.post('/login', login);                // owner / staff / customer login (requires shopSlug)
router.post('/superadmin-login', superadminLogin);

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/wishlist/:productId', protect, addToWishlist);

export default router;
