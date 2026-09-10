import mongoose from 'mongoose';

// Historical record of every subscription assignment for a shop.
// Shop.subscription holds the *current* pointer; this collection is the audit trail
// and is what powers the superadmin's revenue / renewals views.
const subscriptionSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
  status: {
    type: String,
    enum: ['trialing', 'active', 'expired', 'cancelled'],
    default: 'active'
  },
  amountPaid: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  notes: { type: String, default: '' }, // e.g. "Manually activated by superadmin"
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Subscription', subscriptionSchema);
