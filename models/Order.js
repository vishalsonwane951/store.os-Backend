import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  image: { type: String },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  discount: { type: Number, default: 0 } // per-line discount amount, used by POS
});

const orderSchema = new mongoose.Schema({
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },

  // Where the sale happened. This is what lets one shop run both
  // an online store and in-person billing off the same product/stock data.
  channel: { type: String, enum: ['online', 'pos'], default: 'online', index: true },

  invoiceNumber: { type: String }, // sequential, shop-scoped, generated for POS sales

  // Registered customer (optional for POS walk-ins)
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Free-text customer details — always used for POS, optional fallback for online
  customer: {
    name: { type: String, default: 'Walk-in Customer' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' }
  },

  orderItems: [orderItemSchema],

  shippingAddress: {
    fullName: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    phone: String
  },

  paymentMethod: { type: String, default: 'Cash on Delivery' }, // online: COD/Card/UPI; pos: Cash/Card/UPI
  itemsPrice: { type: Number, required: true },
  shippingPrice: { type: Number, required: true, default: 0 },
  taxPrice: { type: Number, required: true, default: 0 },
  discountTotal: { type: Number, default: 0 },
  totalPrice: { type: Number, required: true },
  amountTendered: { type: Number }, // POS cash-paid amount
  changeDue: { type: Number },

  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'completed'],
    default: 'pending'
  },
  isPaid: { type: Boolean, default: false },
  paidAt: { type: Date },
  isDelivered: { type: Boolean, default: false },
  deliveredAt: { type: Date },
  notes: { type: String },

  // Which staff/owner rang up a POS sale, for shift/cashier reporting
  soldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

orderSchema.index({ shop: 1, createdAt: -1 });
orderSchema.index({ shop: 1, invoiceNumber: 1 }, { unique: true, sparse: true });

export default mongoose.model('Order', orderSchema);
