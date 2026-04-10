const mongoose = require('mongoose');
require('dotenv').config();

let cached = null;

const connectDB = async () => {
  if (cached && mongoose.connection.readyState === 1) {
    return cached;
  }
  try {
    cached = await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');
    await seedDefaults();
    return cached;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
};

// --- Schemas ---

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
  full_name: String,
  created_at: { type: Date, default: Date.now }
});

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  barcode: { type: String, unique: true, sparse: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  price: { type: Number, default: 0 },
  cost_price: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  low_stock_threshold: { type: Number, default: 10 },
  expiry_date: Date,
  created_at: { type: Date, default: Date.now }
});

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String,
  email: String,
  total_debt: { type: Number, default: 0 },
  promise_date: Date,
  created_at: { type: Date, default: Date.now }
});

const saleSchema = new mongoose.Schema({
  total_amount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  payment_method: { type: String, enum: ['cash', 'credit', 'other', 'repayment'] },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String, // Denormalized name for history
    quantity: { type: Number, default: 1 },
    unit_price: Number,
    subtotal: Number
  }],
  created_at: { type: Date, default: Date.now }
});

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true }
});

// --- Models ---
const User = mongoose.model('User', userSchema);
const Category = mongoose.model('Category', categorySchema);
const Product = mongoose.model('Product', productSchema);
const Customer = mongoose.model('Customer', customerSchema);
const Sale = mongoose.model('Sale', saleSchema);
const Settings = mongoose.model('Settings', settingsSchema);

// --- Seeding ---
async function seedDefaults() {
  // Admin
  const admin = await User.findOne({ username: 'admin' });
  if (!admin) {
    await User.create({
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      full_name: 'Administrator'
    });
    console.log('Seeded default admin');
  }

  // Employee
  const employee = await User.findOne({ username: 'employee' });
  if (!employee) {
    await User.create({
      username: 'employee',
      password: 'employee123',
      role: 'staff',
      full_name: 'Employee'
    });
    console.log('Seeded default employee');
  }

  // Default Category
  const generalCategory = await Category.findOne({ name: 'General' });
  if (!generalCategory) {
    await Category.create({ name: 'General' });
    console.log('Seeded default General category');
  }
}

module.exports = {
  connectDB,
  User,
  Category,
  Product,
  Customer,
  Sale,
  Settings
};
