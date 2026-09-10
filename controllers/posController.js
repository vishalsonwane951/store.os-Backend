import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Shop from '../models/Shop.js';

// GET /api/shop/pos/search?q= — fast lookup by barcode, SKU, or name for the POS screen
export const searchProducts = async (req, res) => {
  try {
    const q = req.query.q || '';
    const products = await Product.find({
      shop: req.shop._id,
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { barcode: q },
        { sku: { $regex: q, $options: 'i' } }
      ]
    }).limit(20).select('name price images stock barcode sku');
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/shop/pos/orders — ring up an in-store sale
export const createPOSOrder = async (req, res) => {
  try {
    const { items, customer, paymentMethod, discountTotal, taxPrice, amountTendered } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const orderItems = [];
    let itemsPrice = 0;

    for (const item of items) {
      const product = await Product.findOne({ _id: item.product, shop: req.shop._id });
      if (!product) return res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
      }
      const lineDiscount = item.discount || 0;
      orderItems.push({
        product: product._id, name: product.name, image: product.images?.[0] || '',
        price: product.price, quantity: item.quantity, discount: lineDiscount
      });
      itemsPrice += product.price * item.quantity - lineDiscount;
      product.stock -= item.quantity;
      await product.save();
    }

    const totalPrice = Math.max(0, itemsPrice - (discountTotal || 0) + (taxPrice || 0));

    // Sequential, shop-scoped invoice number
    const shop = await Shop.findByIdAndUpdate(req.shop._id, { $inc: { invoiceCounter: 1 } }, { new: true });
    const invoiceNumber = `${shop.invoicePrefix}-${shop.invoiceCounter}`;

    const order = await Order.create({
      shop: req.shop._id,
      channel: 'pos',
      invoiceNumber,
      customer: customer || { name: 'Walk-in Customer' },
      orderItems,
      paymentMethod: paymentMethod || 'Cash',
      itemsPrice,
      shippingPrice: 0,
      taxPrice: taxPrice || 0,
      discountTotal: discountTotal || 0,
      totalPrice,
      amountTendered,
      changeDue: amountTendered ? Math.max(0, amountTendered - totalPrice) : undefined,
      status: 'completed',
      isPaid: true,
      paidAt: new Date(),
      isDelivered: true,
      deliveredAt: new Date(),
      soldBy: req.user._id
    });

    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listPOSOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const query = { shop: req.shop._id, channel: 'pos' };
    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('soldBy', 'name')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit);
    res.json({ success: true, orders, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPOSOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, shop: req.shop._id }).populate('soldBy', 'name');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
