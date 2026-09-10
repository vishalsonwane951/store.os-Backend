import User from '../models/User.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import Shop from '../models/Shop.js';

// GET /api/shop/staff — owner views all staff + pending requests for their shop
export const listStaff = async (req, res) => {
  try {
    const staff = await User.find({ shop: req.shop._id, role: 'staff' }).sort('-createdAt');
    res.json({ success: true, staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/shop/staff/:id/approve
export const approveStaff = async (req, res) => {
  try {
    const shop = await Shop.findById(req.shop._id).populate('subscription.plan');
    const maxStaff = shop.subscription?.plan?.limits?.maxStaffUsers;
    if (maxStaff !== undefined && maxStaff !== -1) {
      const currentCount = await User.countDocuments({ shop: req.shop._id, role: 'staff', status: 'approved' });
      if (currentCount >= maxStaff) {
        return res.status(402).json({ success: false, code: 'STAFF_LIMIT_REACHED', message: `Your plan allows up to ${maxStaff} staff accounts. Upgrade to add more.` });
      }
    }
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, shop: req.shop._id, role: 'staff' },
      { status: 'approved' },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'Staff request not found' });
    res.json({ success: true, message: 'Staff member approved', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectStaff = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, shop: req.shop._id, role: 'staff' },
      { status: 'rejected' },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'Staff request not found' });
    res.json({ success: true, message: 'Staff request rejected', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeStaff = async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, shop: req.shop._id, role: 'staff' });
    if (!user) return res.status(404).json({ success: false, message: 'Staff member not found' });
    res.json({ success: true, message: 'Staff member removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleStaffActive = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, shop: req.shop._id, role: 'staff' });
    if (!user) return res.status(404).json({ success: false, message: 'Staff member not found' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, message: user.isActive ? 'Staff reactivated' : 'Staff deactivated', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
