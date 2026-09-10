import Shop from '../models/Shop.js';
import User from '../models/User.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import Subscription from '../models/Subscription.js';
import Order from '../models/Order.js';

// ── Shops ─────────────────────────────────────────────────────────

export const listShops = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;
    const shops = await Shop.find(query).populate('subscription.plan', 'name price billingCycle').sort('-createdAt');
    res.json({ success: true, shops });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).populate('subscription.plan');
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });
    const owner = await User.findOne({ shop: shop._id, role: 'owner' });
    const stats = {
      totalOrders: await Order.countDocuments({ shop: shop._id }),
      totalStaff: await User.countDocuments({ shop: shop._id, role: 'staff' }),
      totalCustomers: await User.countDocuments({ shop: shop._id, role: 'customer' })
    };
    res.json({ success: true, shop, owner, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve a pending shop — activates the owner account and, if a default
// plan exists, starts their subscription (trial if the plan has trial days).
export const approveShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).populate('subscription.plan');
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });

    shop.status = 'approved';
    shop.approvedAt = new Date();
    shop.approvedBy = req.user._id;

    const plan = shop.subscription?.plan || await SubscriptionPlan.findOne({ isDefault: true, isActive: true });
    if (plan) {
      const isTrial = plan.trialDays > 0;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (isTrial ? plan.trialDays : 30));
      shop.subscription = {
        plan: plan._id,
        status: isTrial ? 'trialing' : 'active',
        startedAt: new Date(),
        expiresAt
      };
      await Subscription.create({
        shop: shop._id, plan: plan._id, status: isTrial ? 'trialing' : 'active',
        startedAt: new Date(), expiresAt, assignedBy: req.user._id,
        notes: 'Auto-assigned on shop approval'
      });
    }
    await shop.save();

    await User.findOneAndUpdate({ shop: shop._id, role: 'owner' }, { status: 'approved' });

    res.json({ success: true, message: 'Shop approved', shop });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectShop = async (req, res) => {
  try {
    const shop = await Shop.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: req.body.reason || '' },
      { new: true }
    );
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });
    await User.findOneAndUpdate({ shop: shop._id, role: 'owner' }, { status: 'rejected' });
    res.json({ success: true, message: 'Shop rejected', shop });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleShopActive = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });
    shop.isActive = !shop.isActive;
    await shop.save();
    res.json({ success: true, message: shop.isActive ? 'Shop reactivated' : 'Shop suspended', shop });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Subscription plans ────────────────────────────────────────────

export const listPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort('sortOrder price');
    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPlan = async (req, res) => {
  try {
    const slug = req.body.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    if (req.body.isDefault) await SubscriptionPlan.updateMany({}, { isDefault: false });
    const plan = await SubscriptionPlan.create({ ...req.body, slug });
    res.status(201).json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePlan = async (req, res) => {
  try {
    if (req.body.isDefault) await SubscriptionPlan.updateMany({ _id: { $ne: req.params.id } }, { isDefault: false });
    const updateData = { ...req.body };
    if (req.body.name) updateData.slug = req.body.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const plan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deletePlan = async (req, res) => {
  try {
    await SubscriptionPlan.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Plan deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Manually assign/renew a shop's subscription — since payments are handled
// outside the platform for now, this is how the superadmin activates billing.
export const assignSubscription = async (req, res) => {
  try {
    const { planId, durationDays, amountPaid, notes } = req.body;
    const shop = await Shop.findById(req.params.id);
    const plan = await SubscriptionPlan.findById(planId);
    if (!shop || !plan) return res.status(404).json({ success: false, message: 'Shop or plan not found' });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (Number(durationDays) || 30));

    shop.subscription = { plan: plan._id, status: 'active', startedAt: new Date(), expiresAt };
    await shop.save();

    const sub = await Subscription.create({
      shop: shop._id, plan: plan._id, status: 'active', amountPaid: amountPaid || plan.price,
      startedAt: new Date(), expiresAt, assignedBy: req.user._id, notes: notes || 'Manually assigned by superadmin'
    });

    res.json({ success: true, message: 'Subscription assigned', shop, subscription: sub });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSubscriptionHistory = async (req, res) => {
  try {
    const history = await Subscription.find({ shop: req.params.id }).populate('plan', 'name price').sort('-createdAt');
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Dashboard ──────────────────────────────────────────────────────

export const getDashboardStats = async (req, res) => {
  try {
    const totalShops = await Shop.countDocuments();
    const pendingShops = await Shop.countDocuments({ status: 'pending' });
    const approvedShops = await Shop.countDocuments({ status: 'approved' });
    const activeSubs = await Shop.countDocuments({ 'subscription.status': { $in: ['active', 'trialing'] } });
    const totalOrders = await Order.countDocuments();

    const revenueAgg = await Subscription.aggregate([{ $group: { _id: null, total: { $sum: '$amountPaid' } } }]);
    const recentShops = await Shop.find().sort('-createdAt').limit(5).select('name slug status createdAt');

    res.json({
      success: true,
      stats: {
        totalShops, pendingShops, approvedShops, activeSubs, totalOrders,
        totalRevenue: revenueAgg[0]?.total || 0, recentShops
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
