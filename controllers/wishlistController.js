import User from '../models/User.js';

export const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'wishlist',
      match: { shop: req.shop._id }
    });
    res.json({ success: true, wishlist: user.wishlist });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const toggleWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const productId = req.params.productId;
    const idx = user.wishlist.indexOf(productId);

    if (idx > -1) {
      user.wishlist.splice(idx, 1);
      await user.save();
      return res.json({ success: true, message: 'Removed from wishlist', wishlisted: false });
    }

    user.wishlist.push(productId);
    await user.save();
    res.json({ success: true, message: 'Added to wishlist', wishlisted: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
