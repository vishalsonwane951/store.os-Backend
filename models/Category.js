import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, lowercase: true },
  description: { type: String },
  image: { type: String, default: '' },
  icon: { type: String, default: '🎁' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Name/slug only need to be unique within a shop
categorySchema.index({ shop: 1, slug: 1 }, { unique: true });
categorySchema.index({ shop: 1, name: 1 }, { unique: true });

export default mongoose.model('Category', categorySchema);
