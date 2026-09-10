import Shop from '../models/Shop.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';

// GET /api/public/:shopSlug/shop — public branding info for the storefront
// (name/logo/etc). This is what lets the frontend render "the shop's name IS
// the app's name" without needing to be logged in. Also exposes status/isActive
// so the frontend can distinguish pending/rejected/suspended from a live shop.
export const getPublicShop = async (req, res) => {
  const shop = req.shop;
  res.json({
    success: true,
    shop: {
      _id: shop._id,
      name: shop.name,
      slug: shop.slug,
      logo: shop.logo,
      tagline: shop.tagline,
      description: shop.description,
      contactEmail: shop.contactEmail,
      contactPhone: shop.contactPhone,
      address: shop.address,
      currency: shop.currency,
      currencySymbol: shop.currencySymbol,
      status: shop.status,
      isActive: shop.isActive
    }
  });
};

// GET /api/shop/settings — full settings for the owner/staff admin panel
export const getMyShop = async (req, res) => {
  const shop = await Shop.findById(req.shop._id).populate('subscription.plan');
  res.json({ success: true, shop });
};

// PUT /api/shop/settings — owner edits branding/profile.
// Changing `name` here immediately becomes the new "software name" everywhere
// for this shop (navbar, tab title, receipts) since every screen reads it live.
export const updateMyShop = async (req, res) => {
  try {
    const allowed = ['name', 'tagline', 'description', 'contactEmail', 'contactPhone', 'address', 'currency', 'currencySymbol', 'gstNumber', 'invoicePrefix'];
    const updateData = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }
    if (req.file) updateData.logo = `/uploads/${req.file.filename}`;

    const shop = await Shop.findByIdAndUpdate(req.shop._id, updateData, { new: true, runValidators: true });
    res.json({ success: true, shop });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/shop/subscription — current plan + basic usage info for the owner
export const getMySubscription = async (req, res) => {
  const shop = await Shop.findById(req.shop._id).populate('subscription.plan');
  const plans = await SubscriptionPlan.find({ isActive: true }).sort('sortOrder price');
  res.json({ success: true, subscription: shop.subscription, plans });
};