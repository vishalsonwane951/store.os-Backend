import mongoose from 'mongoose';

// Managed entirely by the superadmin. Shops subscribe to one of these.
// Keeping this data-driven (rather than hard-coded) is what lets the
// platform owner change pricing/limits without a code deploy.
const subscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, // e.g. "Starter", "Growth", "Pro"
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, default: '' },

  price: { type: Number, required: true, default: 0 }, // per billing cycle
  billingCycle: { type: String, enum: ['monthly', 'yearly', 'lifetime'], default: 'monthly' },
  currency: { type: String, default: 'INR' },

  // Usage limits. -1 means unlimited.
  limits: {
    maxProducts: { type: Number, default: 100 },
    maxStaffUsers: { type: Number, default: 2 },
    maxOrdersPerMonth: { type: Number, default: 500 }
  },

  features: [{ type: String }], // human-readable bullet points shown on pricing page, e.g. "POS Billing", "Priority Support"

  trialDays: { type: Number, default: 0 },

  isActive: { type: Boolean, default: true }, // inactive plans are hidden from the pricing page but existing subscribers keep working
  isDefault: { type: Boolean, default: false }, // auto-assigned to new shops on approval
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
