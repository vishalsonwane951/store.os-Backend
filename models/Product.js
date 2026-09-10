import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true }
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },

  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number },
  costPrice: { type: Number, default: 0 }, // for POS margin/reporting, not shown on storefront
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  images: [{ type: String }],
  stock: { type: Number, required: true, default: 0 },
  sku: { type: String },
  barcode: { type: String }, // used for fast POS lookup
  brand: { type: String },
  specifications: [{ key: String, value: String }],
  reviews: [reviewSchema],
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  // Some products are POS-only (e.g. loose items sold only in-store) and shouldn't show on the storefront
  sellOnline: { type: Boolean, default: true },
  tags: [{ type: String }],
  discount: { type: Number, default: 0 }
}, { timestamps: true });

// SKU / barcode only need to be unique per shop, not globally
productSchema.index({ shop: 1, sku: 1 }, { unique: true, sparse: true });
productSchema.index({ shop: 1, barcode: 1 }, { sparse: true });
productSchema.index({ shop: 1, name: 'text' });

productSchema.methods.calculateRating = function () {
  if (this.reviews.length === 0) {
    this.rating = 0;
    this.numReviews = 0;
  } else {
    const total = this.reviews.reduce((sum, r) => sum + r.rating, 0);
    this.rating = (total / this.reviews.length).toFixed(1);
    this.numReviews = this.reviews.length;
  }
};

export default mongoose.model('Product', productSchema);
