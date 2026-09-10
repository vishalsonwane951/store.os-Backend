import Category from '../models/Category.js';

export const getCategories = async (req, res) => {
  try {
    const query = { shop: req.shop._id };
    if (!req.admin) query.isActive = true;
    const categories = await Category.find(query);
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const image = req.file ? `/uploads/${req.file.filename}` : '';
    const slug = req.body.name.toLowerCase().replace(/\s+/g, '-');
    const category = await Category.create({ ...req.body, shop: req.shop._id, slug, image });
    res.status(201).json({ success: true, category });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'A category with this name already exists' });
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData.shop;
    if (req.file) updateData.image = `/uploads/${req.file.filename}`;
    if (req.body.name) updateData.slug = req.body.name.toLowerCase().replace(/\s+/g, '-');
    const category = await Category.findOneAndUpdate({ _id: req.params.id, shop: req.shop._id }, updateData, { new: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOneAndUpdate({ _id: req.params.id, shop: req.shop._id }, { isActive: false });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
