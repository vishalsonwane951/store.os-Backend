import express from 'express';
import { resolveShopBySlug, requireLiveShop } from '../middleware/auth.js';
import { getPublicShop } from '../controllers/shopController.js';
import { getProducts, getFeaturedProducts, getProduct } from '../controllers/productController.js';
import { getCategories } from '../controllers/categoryController.js';
import { registerCustomer, registerStaff } from '../controllers/authController.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';

const router = express.Router({ mergeParams: true });

// Platform pricing page — plans aren't shop-scoped. Must be registered
// BEFORE the '/:shopSlug' catch-all below, or it would be mistaken for a
// shop slug lookup.
router.get('/plans', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort('sortOrder price');
    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Everything under /api/public/:shopSlug is resolved to that tenant first.
// This only checks the slug exists — it does NOT check status/isActive, so
// that a pending/rejected/suspended shop can still be told apart from a
// slug that doesn't exist at all (see requireLiveShop below).
router.use('/:shopSlug', resolveShopBySlug);

// No requireLiveShop here — this route must respond for pending/rejected/
// suspended shops too, so the frontend can show the correct status message.
router.get('/:shopSlug/shop', getPublicShop);

// These routes should stay unreachable unless the shop is actually live.
router.get('/:shopSlug/products', requireLiveShop, getProducts);
router.get('/:shopSlug/products/featured', requireLiveShop, getFeaturedProducts);
router.get('/:shopSlug/products/:id', requireLiveShop, getProduct);
router.get('/:shopSlug/categories', requireLiveShop, getCategories);

router.post('/:shopSlug/register', requireLiveShop, registerCustomer);
router.post('/:shopSlug/register-staff', requireLiveShop, registerStaff);

export default router;