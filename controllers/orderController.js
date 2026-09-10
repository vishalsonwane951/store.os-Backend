import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Shop from '../models/Shop.js';

export const createOrder = async (req, res) => {
  try {
    const { orderItems, shippingAddress, paymentMethod, itemsPrice, shippingPrice, taxPrice, totalPrice } = req.body;
    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in order' });
    }
    for (const item of orderItems) {
      const product = await Product.findOne({ _id: item.product, shop: req.shop._id });
      if (!product) return res.status(404).json({ success: false, message: 'One or more products not found' });
      if (product.stock < item.quantity) return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
      product.stock -= item.quantity;
      await product.save();
    }
    const order = await Order.create({
      shop: req.shop._id, channel: 'online', user: req.user._id, orderItems, shippingAddress, paymentMethod,
      itemsPrice, shippingPrice, taxPrice, totalPrice,
      customer: { name: req.user.name, email: req.user.email, phone: req.user.phone || '' }
    });
    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ shop: req.shop._id, user: req.user._id }).sort('-createdAt');
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, shop: req.shop._id })
      .populate('user', 'name email')
      .populate('orderItems.product', 'name images');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const isOwnerOrStaff = ['owner', 'staff'].includes(req.user.role);
    if ((!order.user || order.user._id.toString() !== req.user._id.toString()) && !isOwnerOrStaff) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const query = { shop: req.shop._id };
    if (req.query.channel) query.channel = req.query.channel;
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query).populate('user', 'name email').sort('-createdAt').skip(skip).limit(limit);
    res.json({ success: true, orders, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const update = { status: req.body.status };
    if (req.body.status === 'delivered') { update.isDelivered = true; update.deliveredAt = new Date(); }
    const order = await Order.findOneAndUpdate({ _id: req.params.id, shop: req.shop._id }, update, { new: true });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const shopId = req.shop._id;
    const totalOrders = await Order.countDocuments({ shop: shopId });
    const totalRevenue = await Order.aggregate([{ $match: { shop: shopId } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]);
    const onlineRevenue = await Order.aggregate([{ $match: { shop: shopId, channel: 'online' } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]);
    const posRevenue = await Order.aggregate([{ $match: { shop: shopId, channel: 'pos' } }, { $group: { _id: null, total: { $sum: '$totalPrice' } } }]);
    const pendingOrders = await Order.countDocuments({ shop: shopId, status: 'pending' });
    const recentOrders = await Order.find({ shop: shopId }).populate('user', 'name').sort('-createdAt').limit(5);
    const totalProducts = await Product.countDocuments({ shop: shopId, isActive: true });
    const totalUsers = await User.countDocuments({ shop: shopId, role: 'customer' });
    const monthlySales = await Order.aggregate([
      { $match: { shop: shopId } },
      { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, revenue: { $sum: '$totalPrice' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 6 }
    ]);
    res.json({
      success: true,
      stats: {
        totalOrders, totalRevenue: totalRevenue[0]?.total || 0,
        onlineRevenue: onlineRevenue[0]?.total || 0, posRevenue: posRevenue[0]?.total || 0,
        pendingOrders, totalProducts, totalUsers, recentOrders, monthlySales
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
