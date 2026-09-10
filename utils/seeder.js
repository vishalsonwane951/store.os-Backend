import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Shop from "../models/Shop.js";
import SubscriptionPlan from "../models/SubscriptionPlan.js";
import Subscription from "../models/Subscription.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";

dotenv.config();
const MONGO_URI = process.env.MONGODB_URI;

const categories = [
  { name: 'Toy Cars', slug: 'toy-cars', icon: '🚗', description: 'Die-cast and plastic toy cars for all ages' },
  { name: 'Remote Control Cars', slug: 'remote-control-cars', icon: '🎮', description: 'RC cars and trucks' },
  { name: 'Toy Bikes', slug: 'toy-bikes', icon: '🏍️', description: 'Toy motorcycles and bicycles' },
  { name: 'Small Electronics', slug: 'small-electronics', icon: '📱', description: 'Gadgets and electronic devices' },
  { name: 'Gadgets', slug: 'gadgets', icon: '⚡', description: 'Cool tech gadgets' },
  { name: 'Batteries & Accessories', slug: 'batteries-accessories', icon: '🔋', description: 'Batteries and toy accessories' }
];

const seed = async () => {
  await mongoose.connect(MONGO_URI);
  await User.deleteMany();
  await Shop.deleteMany();
  await SubscriptionPlan.deleteMany();
  await Subscription.deleteMany();
  await Category.deleteMany();
  await Product.deleteMany();
  console.log('🗑️  Cleared existing data');

  // ── Platform superadmin ──
  await User.create({
    name: 'Vishal Sonwane (Admin)',
    email: 'vishalsonwane951@gmail.com',
    password: 'Vishal@123',
    role: 'superadmin'
  });
  console.log('🔐 Superadmin seeded: vishalsonwane951@gmail.com / Vishal@123');

  // ── Subscription plans ──
  const [starter, growth, pro] = await SubscriptionPlan.create([
    {
      name: 'Starter', slug: 'starter', description: 'For new shops getting started',
      price: 0, billingCycle: 'monthly', trialDays: 14,
      limits: { maxProducts: 50, maxStaffUsers: 1, maxOrdersPerMonth: 100 },
      features: ['Online store', 'POS billing', 'Up to 50 products', '1 staff account'],
      isDefault: true, sortOrder: 1
    },
    {
      name: 'Growth', slug: 'growth', description: 'For growing shops with more staff and inventory',
      price: 999, billingCycle: 'monthly', trialDays: 0,
      limits: { maxProducts: 500, maxStaffUsers: 5, maxOrdersPerMonth: 2000 },
      features: ['Online store', 'POS billing', 'Up to 500 products', '5 staff accounts', 'Priority support'],
      sortOrder: 2
    },
    {
      name: 'Pro', slug: 'pro', description: 'For established shops with high volume',
      price: 2499, billingCycle: 'monthly', trialDays: 0,
      limits: { maxProducts: -1, maxStaffUsers: -1, maxOrdersPerMonth: -1 },
      features: ['Online store', 'POS billing', 'Unlimited products', 'Unlimited staff', 'Priority support', 'Advanced reports'],
      sortOrder: 3
    }
  ]);
  console.log('💳 Subscription plans seeded');

  // ── Demo shop (pre-approved, active Growth subscription) ──
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const shop = await Shop.create({
    name: 'Shakti Toys',
    slug: 'shakti-toys',
    tagline: 'Toys, RC Cars & Gadgets',
    contactEmail: 'owner@shaktitoys.com',
    contactPhone: '9999999999',
    status: 'approved',
    approvedAt: new Date(),
    subscription: { plan: growth._id, status: 'active', startedAt: new Date(), expiresAt }
  });

  await Subscription.create({
    shop: shop._id, plan: growth._id, status: 'active',
    amountPaid: growth.price, startedAt: new Date(), expiresAt, notes: 'Seeded demo subscription'
  });

  await User.create([
    { name: 'Shop Owner', email: 'owner@shaktitoys.com', password: 'owner123', role: 'owner', shop: shop._id, status: 'approved' },
    { name: 'Store Staff', email: 'staff@shaktitoys.com', password: 'staff123', role: 'staff', shop: shop._id, status: 'approved' },
    { name: 'John Doe', email: 'john@example.com', password: 'user123', role: 'customer', shop: shop._id, status: 'approved' }
  ]);
  console.log('👤 Demo shop + users seeded (owner@shaktitoys.com / owner123)');

  // ── A second shop still pending approval, to demo the approval workflow ──
  const pendingShop = await Shop.create({
    name: 'Toy Bazaar',
    slug: 'toy-bazaar',
    contactEmail: 'owner@toybazaar.com',
    status: 'pending'
  });
  await User.create({
    name: 'Pending Owner', email: 'owner@toybazaar.com', password: 'owner123',
    role: 'owner', shop: pendingShop._id, status: 'pending'
  });
  console.log('⏳ Pending demo shop seeded (Toy Bazaar) — try approving it from the superadmin panel');

  // ── Sample catalog for the demo shop ──
  const catDocs = categories.map(c => ({ ...c, shop: shop._id }));
  const createdCategories = await Category.insertMany(catDocs);
  const catMap = {};
  createdCategories.forEach(c => { catMap[c.slug] = c._id; });

  const products = [
    { name: 'Ferrari F40 Die-Cast Model', description: 'Premium die-cast Ferrari F40 model car in 1:18 scale. Perfect collector item with detailed interior and opening doors.', price: 29.99, originalPrice: 39.99, category: catMap['toy-cars'], brand: 'Bburago', stock: 50, isFeatured: true, rating: 4.5, numReviews: 28, discount: 25, tags: ['ferrari', 'diecast', 'collector'], images: ['https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?w=600&q=80'], specifications: [{ key: 'Scale', value: '1:18' }, { key: 'Material', value: 'Die-cast metal' }, { key: 'Age', value: '8+' }], barcode: '8901000001', sku: 'STC-001' },
    { name: 'Lamborghini Huracán RC Car', description: 'High-speed remote control Lamborghini Huracán with 2.4GHz technology. Up to 30km/h speed, 4WD, and rechargeable battery included.', price: 79.99, originalPrice: 99.99, category: catMap['remote-control-cars'], brand: 'Rastar', stock: 30, isFeatured: true, rating: 4.7, numReviews: 42, discount: 20, tags: ['lamborghini', 'rc', 'fast'], images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80'], specifications: [{ key: 'Speed', value: '30 km/h' }, { key: 'Range', value: '50m' }], barcode: '8901000002', sku: 'STC-002' },
    { name: 'Kawasaki Ninja Toy Bike', description: 'Detailed 1:12 scale Kawasaki Ninja motorcycle with realistic paintwork.', price: 24.99, category: catMap['toy-bikes'], brand: 'Maisto', stock: 45, isFeatured: true, rating: 4.3, numReviews: 15, tags: ['kawasaki', 'motorcycle'], images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80'], barcode: '8901000003', sku: 'STC-003' },
    { name: 'Mini Bluetooth Speaker', description: 'Compact waterproof Bluetooth 5.0 speaker with 12-hour battery life.', price: 34.99, originalPrice: 49.99, category: catMap['small-electronics'], brand: 'JBL', stock: 80, isFeatured: true, rating: 4.6, numReviews: 67, discount: 30, tags: ['bluetooth', 'speaker'], images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80'], barcode: '8901000004', sku: 'STC-004' },
    { name: 'Smart LED Desk Lamp', description: 'USB-C powered LED desk lamp with touch control and wireless charging pad.', price: 45.99, category: catMap['gadgets'], brand: 'Baseus', stock: 60, isFeatured: true, rating: 4.4, numReviews: 33, tags: ['led', 'desk'], images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80'], barcode: '8901000005', sku: 'STC-005' },
    { name: 'AA Alkaline Batteries 24-Pack', description: 'Long-lasting Duracell AA alkaline batteries. 10-year shelf life.', price: 14.99, category: catMap['batteries-accessories'], brand: 'Duracell', stock: 200, rating: 4.8, numReviews: 120, tags: ['batteries'], images: ['https://images.unsplash.com/photo-1619866975816-70c9e1ac8bdd?w=600&q=80'], barcode: '8901000006', sku: 'STC-006' },
    { name: 'Porsche 911 GT3 Pull-Back Car', description: 'Friction-powered Porsche 911 GT3 toy car. Perfect for ages 3+.', price: 12.99, category: catMap['toy-cars'], brand: 'Hot Wheels', stock: 120, rating: 4.2, numReviews: 45, tags: ['porsche'], images: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80'], barcode: '8901000007', sku: 'STC-007' },
    { name: '4WD Monster Truck RC', description: 'Off-road 4WD monster truck with LED lights and turbo boost.', price: 89.99, originalPrice: 119.99, category: catMap['remote-control-cars'], brand: 'BEZGAR', stock: 25, rating: 4.5, numReviews: 38, discount: 25, tags: ['monster'], images: ['https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=600&q=80'], barcode: '8901000008', sku: 'STC-008' },
    { name: 'Digital Multimeter Pro', description: 'Professional digital multimeter with auto-ranging, 6000 counts.', price: 39.99, category: catMap['gadgets'], brand: 'Fluke', stock: 40, rating: 4.7, numReviews: 22, tags: ['multimeter'], images: ['https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=600&q=80'], barcode: '8901000009', sku: 'STC-009' },
    { name: 'USB-C Power Bank 20000mAh', description: 'High-capacity power bank with 65W USB-C PD fast charging.', price: 59.99, originalPrice: 79.99, category: catMap['small-electronics'], brand: 'Anker', stock: 55, isFeatured: true, rating: 4.8, numReviews: 89, discount: 25, tags: ['powerbank'], images: ['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80'], barcode: '8901000010', sku: 'STC-010' }
  ];

  await Product.insertMany(products.map(p => ({ ...p, shop: shop._id })));
  console.log('📦 Sample products seeded');

  console.log('\n✅ Seeding complete!\n');
  console.log('── Login credentials ──');
  console.log('Superadmin:   admin@platform.com / admin123');
  console.log('Shop Owner:   owner@shaktitoys.com / owner123   (store: shakti-toys)');
  console.log('Shop Staff:   staff@shaktitoys.com / staff123   (store: shakti-toys)');
  console.log('Customer:     john@example.com / user123        (store: shakti-toys)');
  console.log('Pending Shop: owner@toybazaar.com / owner123     (store: toy-bazaar, awaiting approval)');
  process.exit(0);
};

seed().catch(e => { console.error(e); process.exit(1); });
