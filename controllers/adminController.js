import User from '../models/User.js';

// Lists customers of the logged-in shop (used by the shop admin's Users page)
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({ shop: req.shop._id, role: 'customer' }).sort('-createdAt');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, shop: req.shop._id, role: 'customer' });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate({ _id: req.params.id, shop: req.shop._id }, { role: req.body.role }, { new: true });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
