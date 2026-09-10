import Product from '../models/Product.js';
import Shop from '../models/Shop.js';

// Used by both the public storefront (req.shop from slug) and the admin
// panel (req.shop from the logged-in owner/staff's token) — the shop is
// always resolved by middleware before these run, so every query here is
// automatically isolated to the correct tenant.

export const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const query = { shop: req.shop._id };
    if (!req.admin) { query.isActive = true; query.sellOnline = true; }

    if (req.query.category) query.category = req.query.category;
    if (req.query.search) query.name = { $regex: req.query.search, $options: 'i' };
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
    }

    let sort = '-createdAt';
    if (req.query.sort === 'price_asc') sort = 'price';
    else if (req.query.sort === 'price_desc') sort = '-price';
    else if (req.query.sort === 'rating') sort = '-rating';

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.json({ success: true, products, page, pages: Math.ceil(total / limit), total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ shop: req.shop._id, isFeatured: true, isActive: true, sellOnline: true })
      .populate('category', 'name slug')
      .limit(8);
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, shop: req.shop._id })
      .populate('category', 'name slug')
      .populate('reviews.user', 'name avatar');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const shop = await Shop.findById(req.shop._id).populate('subscription.plan');
    const maxProducts = shop.subscription?.plan?.limits?.maxProducts;
    if (maxProducts !== undefined && maxProducts !== -1) {
      const count = await Product.countDocuments({ shop: req.shop._id });
      if (count >= maxProducts) {
        return res.status(402).json({ success: false, code: 'PRODUCT_LIMIT_REACHED', message: `Your plan allows up to ${maxProducts} products. Upgrade to add more.` });
      }
    }

    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    if (req.body.existingImages) {
      const existing = Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages];
      images.push(...existing);
    }
    const specs = req.body.specKeys
      ? (Array.isArray(req.body.specKeys) ? req.body.specKeys : [req.body.specKeys]).map((k, i) => ({
          key: k, value: (Array.isArray(req.body.specValues) ? req.body.specValues[i] : req.body.specValues) || ''
        }))
      : [];
    const product = await Product.create({ ...req.body, shop: req.shop._id, images, specifications: specs });
    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    let updateData = { ...req.body };
    delete updateData.shop; // never allow moving a product to another tenant
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => `/uploads/${f.filename}`);
      const existing = req.body.existingImages
        ? (Array.isArray(req.body.existingImages) ? req.body.existingImages : [req.body.existingImages])
        : [];
      updateData.images = [...existing, ...newImages];
    }
    const product = await Product.findOneAndUpdate({ _id: req.params.id, shop: req.shop._id }, updateData, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate({ _id: req.params.id, shop: req.shop._id }, { isActive: false });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addReview = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, shop: req.shop._id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    const alreadyReviewed = product.reviews.find(r => r.user.toString() === req.user._id.toString());
    if (alreadyReviewed) return res.status(400).json({ success: false, message: 'Already reviewed' });
    product.reviews.push({ user: req.user._id, name: req.user.name, ...req.body });
    product.calculateRating();
    await product.save();
    res.status(201).json({ success: true, message: 'Review added' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
