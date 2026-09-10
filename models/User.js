import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },

  // ── Roles ──
  // superadmin : platform owner, no shop, manages every shop + plans
  // owner      : store owner, created the shop, full access within their shop
  // staff      : employee of a shop, invited by the owner (POS + limited admin)
  // customer   : end buyer on a shop's storefront
  role: {
    type: String,
    enum: ['superadmin', 'owner', 'staff', 'customer'],
    default: 'customer'
  },

  // Every non-superadmin user belongs to exactly one shop.
  // This is the field every tenant-scoped query filters on.
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', default: null, index: true },

  // Owner accounts start 'pending' until a superadmin approves their shop.
  // Staff accounts start 'pending' until the shop owner approves them.
  // Customers are auto-approved.
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },

  phone: { type: String },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  avatar: { type: String, default: '' },

  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Email only needs to be unique *within* a shop (or globally for superadmin/no-shop),
// so two different shops can each have an owner/customer using the same email address.
userSchema.index({ email: 1, shop: 1 }, { unique: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('User', userSchema);
