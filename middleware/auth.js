import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Shop from '../models/Shop.js';

const secret = () => process.env.JWT_SECRET || 'secret';

export const generateToken = (id) => jwt.sign({ id }, secret(), { expiresIn: process.env.JWT_EXPIRE || '7d' });

// Verifies the JWT and attaches req.user. Does NOT check approval/shop status —
// use the guards below for that, so we can give precise error messages.
export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ success: false, message: 'Not authorized, no token' });

    const decoded = jwt.verify(token, secret());
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account has been deactivated' });

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized, invalid token' });
  }
};

// Restricts to specific roles, e.g. requireRole('owner', 'staff')
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
  }
  next();
};

// Blocks users whose account/shop is still awaiting approval
export const requireApproved = (req, res, next) => {
  if (req.user.status !== 'approved') {
    return res.status(403).json({
      success: false,
      code: 'PENDING_APPROVAL',
      message: req.user.status === 'rejected'
        ? 'Your access request was rejected. Contact support for details.'
        : 'Your account is awaiting approval.'
    });
  }
  next();
};

// For any authenticated route scoped to "my shop" (owner/staff/customer).
// Loads the shop, checks it's active, and attaches req.shop.
export const attachShop = async (req, res, next) => {
  try {
    if (!req.user.shop) return res.status(400).json({ success: false, message: 'No shop associated with this account' });
    const shop = await Shop.findById(req.user.shop);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });
    if (shop.status !== 'approved') {
      return res.status(403).json({ success: false, code: 'SHOP_NOT_APPROVED', message: 'This shop is not yet approved' });
    }
    if (!shop.isActive) {
      return res.status(403).json({ success: false, code: 'SHOP_SUSPENDED', message: 'This shop has been suspended' });
    }
    req.shop = shop;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// For admin-panel write actions (owner/staff) that should be blocked once a
// shop's subscription has lapsed. Read-only browsing still works via attachShop alone.
export const requireActiveSubscription = (req, res, next) => {
  if (!req.shop.isSubscriptionActive()) {
    return res.status(402).json({
      success: false,
      code: 'SUBSCRIPTION_INACTIVE',
      message: 'Your subscription is inactive or has expired. Please renew to continue.'
    });
  }
  next();
};

// Resolves a shop from the :shopSlug URL param — used for public, unauthenticated
// storefront routes where there is no logged-in user yet. Only 404s when the
// slug genuinely doesn't match any shop — status/isActive checks are separate
// (see requireLiveShop) so callers can distinguish "doesn't exist" from
// "exists but pending/rejected/suspended".
export const resolveShopBySlug = async (req, res, next) => {
  try {
    const shop = await Shop.findOne({ slug: req.params.shopSlug.toLowerCase() });
    if (!shop) return res.status(404).json({ success: false, message: 'Store not found' });
    req.shop = shop;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Gates shop-dependent public routes (products, categories, registration) so
// they still 404/403 for a non-live shop. Apply this AFTER resolveShopBySlug
// on any route that shouldn't be reachable for a pending/rejected/suspended
// shop. Do NOT apply this to the /:shopSlug/shop route — that one needs to
// return status/isActive so the frontend can show the right message.
export const requireLiveShop = (req, res, next) => {
  if (req.shop.status !== 'approved' || !req.shop.isActive) {
    return res.status(404).json({ success: false, message: 'Store not available' });
  }
  next();
};

export const superadminOnly = requireRole('superadmin');
export const ownerOnly = requireRole('owner');
export const ownerOrStaff = requireRole('owner', 'staff');