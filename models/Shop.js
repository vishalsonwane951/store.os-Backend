import mongoose from 'mongoose';

// Shop = a tenant. Every store owner on the platform gets exactly one Shop.
// All products/categories/orders/users are scoped to a shop via shop._id.
const shopSchema = new mongoose.Schema({
  // Display name — this is what appears as the "software name" across that
  // shop's storefront, admin panel, receipts, browser tab title, etc.
  name: { type: String, required: true, trim: true },

  // URL-safe unique identifier used for routing: app.com/:slug/...
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },

  logo: { type: String, default: '' }, // /uploads/xxx.png
  tagline: { type: String, default: '' },
  description: { type: String, default: '' },

  contactEmail: { type: String, trim: true, lowercase: true },
  contactPhone: { type: String, trim: true },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },

  currency: { type: String, default: 'INR' },
  currencySymbol: { type: String, default: '₹' },
  gstNumber: { type: String, default: '' },
  invoicePrefix: { type: String, default: 'INV' },
  invoiceCounter: { type: Number, default: 1000 }, // used to generate sequential POS invoice numbers

  // Approval workflow — a shop owner requests access, a superadmin approves.
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  rejectionReason: { type: String, default: '' },
  approvedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Subscription linkage — kept lightweight on the Shop doc for fast checks,
  // full history lives in the Subscription collection.
  subscription: {
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    status: {
      type: String,
      enum: ['trialing', 'active', 'expired', 'cancelled', 'none'],
      default: 'none'
    },
    startedAt: { type: Date },
    expiresAt: { type: Date }
  },

  isActive: { type: Boolean, default: true } // superadmin kill-switch
}, { timestamps: true });

shopSchema.methods.isSubscriptionActive = function () {
  if (!this.subscription || !this.subscription.plan) return false;
  if (!['active', 'trialing'].includes(this.subscription.status)) return false;
  if (this.subscription.expiresAt && this.subscription.expiresAt < new Date()) return false;
  return true;
};

export default mongoose.model('Shop', shopSchema);
