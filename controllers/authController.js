import User from '../models/User.js';
import Shop from '../models/Shop.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import { generateToken } from '../middleware/auth.js';

const slugify = (str) => str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const shapeUser = (user, shop) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  phone: user.phone,
  wishlist: user.wishlist,
  shop: shop ? { _id: shop._id, name: shop.name, slug: shop.slug, logo: shop.logo, status: shop.status } : null
});

// ── Shop owner sign-up ──────────────────────────────────────────────
// Anyone can request a new store. This creates a Shop (status: pending) and
// an owner User (status: pending). Nothing is usable until a superadmin approves.
export const registerShop = async (req, res) => {
  try {
    const { shopName, ownerName, email, password, phone } = req.body;
    if (!shopName || !ownerName || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    let baseSlug = slugify(shopName);
    if (!baseSlug) baseSlug = 'store';
    let slug = baseSlug;
    let counter = 1;
    while (await Shop.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const defaultPlan = await SubscriptionPlan.findOne({ isDefault: true, isActive: true });

    const shop = await Shop.create({
      name: shopName,
      slug,
      contactEmail: email,
      contactPhone: phone || '',
      status: 'pending',
      subscription: defaultPlan ? { plan: defaultPlan._id, status: 'none' } : undefined
    });

    const user = await User.create({
      name: ownerName,
      email,
      password,
      phone,
      role: 'owner',
      shop: shop._id,
      status: 'pending'
    });

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Your store request has been submitted and is awaiting admin approval.',
      token,
      user: shapeUser(user, shop)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists for this store.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Customer sign-up on a specific shop's storefront ────────────────
export const registerCustomer = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const shop = req.shop; // set by resolveShopBySlug
    const user = await User.create({ name, email, password, phone, role: 'customer', shop: shop._id, status: 'approved' });
    const token = generateToken(user._id);
    res.status(201).json({ success: true, token, user: shapeUser(user, shop) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists for this store.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Staff sign-up request for a specific shop (needs owner approval) ─
export const registerStaff = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const shop = req.shop;
    const user = await User.create({ name, email, password, phone, role: 'staff', shop: shop._id, status: 'pending' });
    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Your request has been sent to the store owner for approval.',
      token,
      user: shapeUser(user, shop)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists for this store.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Login (owner / staff / customer) — scoped to one shop by slug ───
export const login = async (req, res) => {
  try {
    const { email, password, shopSlug } = req.body;
    if (!shopSlug) return res.status(400).json({ success: false, message: 'Store is required' });

    const shop = await Shop.findOne({ slug: shopSlug.toLowerCase() });
    if (!shop) return res.status(404).json({ success: false, message: 'Store not found' });

    const user = await User.findOne({ email: email.toLowerCase(), shop: shop._id }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account has been deactivated' });

    const token = generateToken(user._id);
    res.json({ success: true, token, user: shapeUser(user, shop) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Superadmin login — no shop involved ──────────────────────────────
export const superadminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase(), role: 'superadmin' }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const token = generateToken(user._id);
    res.json({ success: true, token, user: shapeUser(user, null) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const shop = req.user.shop ? await Shop.findById(req.user.shop) : null;
    res.json({ success: true, user: shapeUser(req.user, shop) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, phone, address, avatar, password } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (avatar) updateData.avatar = avatar;

    const user = await User.findById(req.user._id);
    Object.assign(user, updateData);
    if (password) user.password = password;
    await user.save();

    const shop = user.shop ? await Shop.findById(user.shop) : null;
    res.json({ success: true, user: shapeUser(user, shop) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addToWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const idx = user.wishlist.indexOf(req.params.productId);
    if (idx > -1) user.wishlist.splice(idx, 1);
    else user.wishlist.push(req.params.productId);
    await user.save();
    res.json({ success: true, wishlist: user.wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
