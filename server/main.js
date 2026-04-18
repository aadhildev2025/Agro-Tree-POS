const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const { connectDB, User, Category, Product, Customer, Sale, Settings } = require('./db');
const { printReceipt } = require('./receipt');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());



// Middleware: ensure DB is connected before every request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    return res.status(503).json({ 
      success: false, 
      message: 'Database is offline. Please check your internet connection or IP whitelist.' 
    });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Agro-Tree POS API is running ✅' });
});

// --- Auth ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password }).select('-password');
    if (user) {
      return res.json({ success: true, user });
    }
    res.json({ success: false, message: 'Invalid credentials' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.put('/api/auth/password', async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    const user = await User.findOne({ _id: userId, password: currentPassword });
    
    if (!user) {
      return res.json({ success: false, message: 'Invalid current password' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// --- Products ---
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find().populate('category').sort({ name: 1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/products/barcode/:barcode', async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.barcode }).populate('category');
    res.json(product || null);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { id, _id, name, barcode, category, category_id, price, cost_price, stock, low_stock_threshold, expiry_date } = req.body;
  const productId = id || _id;
  
  // Ensure we use the ID string for the category field
  let catId = category_id;
  if (!catId && category) {
    catId = typeof category === 'object' ? (category._id || category.id) : category;
  }

  try {
    if (productId) {
      await Product.findByIdAndUpdate(productId, {
        name, barcode, category: catId, price, cost_price, stock, low_stock_threshold, expiry_date
      });
    } else {
      await Product.create({
        name, barcode, category: catId, price, cost_price, stock, low_stock_threshold, expiry_date
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// --- Categories ---
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const category = await Category.create({ name: req.body.name });
    res.json({ success: true, id: category._id });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    const categoryToDelete = await Category.findById(req.params.id);
    if (!categoryToDelete) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    
    if (categoryToDelete.name.toLowerCase() === 'general') {
      return res.status(400).json({ success: false, message: 'Cannot delete the default General category' });
    }

    const generalCat = await Category.findOne({ name: 'General' });
    if (generalCat) {
      await Product.updateMany({ category: req.params.id }, { category: generalCat._id });
    }
    
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// --- Customers ---
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await Customer.find().sort({ name: 1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { name, phone, email, total_debt, promise_date } = req.body;
    const customer = await Customer.create({ name, phone, email, total_debt: total_debt || 0, promise_date });
    res.json({ success: true, id: customer._id });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { name, phone, email, total_debt, promise_date } = req.body;
    await Customer.findByIdAndUpdate(req.params.id, { name, phone, email, total_debt, promise_date });
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.post('/api/customers/:id/payments', async (req, res) => {
  try {
    const { amount, cashierId } = req.body;
    const customer = await Customer.findByIdAndUpdate(req.params.id, {
      $inc: { total_debt: -amount }
    }, { new: true });
    
    // Safety check: ensure debt doesn't drop below 0 due to logic errors
    if (customer.total_debt < 0) {
      customer.total_debt = 0;
      await customer.save();
    }
    // Create a transaction record for the history
    await Sale.create({
      total_amount: amount,
      payment_method: 'repayment',
      customer: req.params.id,
      cashier: cashierId,
      items: [{
        name: 'Debt Repayment',
        quantity: 1,
        unit_price: amount,
        subtotal: amount
      }]
    });

    res.json({ success: true, newBalance: customer.total_debt });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await Customer.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// --- Sales ---
app.post('/api/sales', async (req, res) => {
  const { items, total_amount, discount, tax, payment_method, cashier_id, customer_id } = req.body;
  
  try {
    // 1. Create Sale
    const sale = await Sale.create({
      total_amount,
      discount,
      tax,
      payment_method,
      cashier: cashier_id,
      customer: customer_id,
      items: items.map(item => ({
        product: item._id || item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity
      }))
    });

    // 2. Update Stocks
    for (const item of items) {
      await Product.findByIdAndUpdate(item._id || item.id, {
        $inc: { stock: -item.quantity }
      });
    }

    // 3. Update Customer Debt if Credit
    if (payment_method === 'credit' && customer_id) {
      await Customer.findByIdAndUpdate(customer_id, {
        $inc: { total_debt: total_amount }
      });
    }

    res.json({ success: true, saleId: sale._id });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// --- Reports ---
app.get('/api/reports/sales', async (req, res) => {
  const { period } = req.query;
  try {
    let aggregate = [];
    const filter = { payment_method: { $ne: 'repayment' } };
    
    if (period === 'daily') {
      aggregate = await Sale.aggregate([
        { $match: { ...filter, created_at: { $gte: new Date(new Date().setDate(new Date().getDate() - 30)) } } },
        { 
          $group: { 
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
            value: { $sum: "$total_amount" }
          } 
        },
        { $project: { label: "$_id", value: 1, _id: 0 } },
        { $sort: { label: 1 } }
      ]);
    } else if (period === 'weekly') {
      aggregate = await Sale.aggregate([
        { $match: { ...filter, created_at: { $gte: new Date(new Date().setDate(new Date().getDate() - 84)) } } }, // ~3 months
        { 
          $group: { 
            _id: { $dateToString: { format: "%Y-W%V", date: "$created_at" } },
            value: { $sum: "$total_amount" }
          } 
        },
        { $project: { label: "$_id", value: 1, _id: 0 } },
        { $sort: { label: 1 } }
      ]);
    } else if (period === 'monthly') {
      aggregate = await Sale.aggregate([
        { $match: filter },
        { 
          $group: { 
            _id: { $dateToString: { format: "%Y-%m", date: "$created_at" } },
            value: { $sum: "$total_amount" }
          } 
        },
        { $project: { label: "$_id", value: 1, _id: 0 } },
        { $sort: { label: 1 } }
      ]);
    }
    res.json(aggregate);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/reports/history', async (req, res) => {
  try {
    const { month, year, startDate, endDate, period } = req.query;
    let filter = { payment_method: { $ne: 'repayment' } };

    if (startDate && endDate) {
      filter.created_at = { 
        $gte: new Date(new Date(startDate).setHours(0,0,0,0)), 
        $lte: new Date(new Date(endDate).setHours(23,59,59,999)) 
      };
    } else if (period === 'today') {
      const today = new Date();
      filter.created_at = { 
        $gte: new Date(today.setHours(0,0,0,0)), 
        $lte: new Date(today.setHours(23,59,59,999)) 
      };
    } else if (period === 'weekly') {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      filter.created_at = { $gte: start };
    } else if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      filter.created_at = { $gte: start, $lte: end };
    }

    const history = await Sale.find(filter)
      .populate('cashier', 'full_name')
      .populate('customer', 'name')
      .sort({ created_at: -1 })
      .limit((month && year) || period || (startDate && endDate) ? 0 : 100);
    
    // Format to match old SQL structure for frontend
    const formatted = history.map(s => {
      const obj = s.toObject();
      return {
        ...obj,
        id: obj._id.toString().slice(-6).toUpperCase(), // Generate short ID from MongoID
        cashier_name: s.cashier?.full_name || 'Staff',
        customer_name: s.customer?.name || 'Walk-in'
      };
    });
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/reports/analytics/summary', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));
    const sixtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 60));

    // Current Period Stats
    const currentStats = await Sale.aggregate([
      { $match: { created_at: { $gte: thirtyDaysAgo }, payment_method: { $ne: 'repayment' } } },
      { 
        $group: { 
          _id: null, 
          total_revenue: { $sum: "$total_amount" },
          total_orders: { $count: {} }
        } 
      }
    ]);

    // Previous Period Stats (for Growth calculation)
    const prevStats = await Sale.aggregate([
      { $match: { 
        created_at: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
        payment_method: { $ne: 'repayment' }
      } },
      { $group: { _id: null, total_revenue: { $sum: "$total_amount" } } }
    ]);

    const current = currentStats[0] || { total_revenue: 0, total_orders: 0 };
    const prevRevenue = prevStats[0]?.total_revenue || 0;
    
    const growthRate = prevRevenue === 0 ? 100 : ((current.total_revenue - prevRevenue) / prevRevenue) * 100;

    res.json({
      avgTransaction: current.total_orders === 0 ? 0 : current.total_revenue / current.total_orders,
      totalOrders: current.total_orders,
      growthRate: growthRate.toFixed(1),
      totalRevenue: current.total_revenue
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/reports/best-sellers', async (req, res) => {
  try {
    const bestSellers = await Sale.aggregate([
      { $unwind: "$items" },
      { 
        $group: { 
          _id: "$items.product",
          name: { $first: "$items.name" },
          total_qty: { $sum: "$items.quantity" },
          total_revenue: { $sum: "$items.subtotal" }
        } 
      },
      { $sort: { total_qty: -1 } },
      { $limit: 10 }
    ]);
    res.json(bestSellers);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Receipts ---
app.post('/api/receipts/print', async (req, res) => {
  try {
    const settingsList = await Settings.find();
    const settings = settingsList.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    const result = await printReceipt(req.body, settings);
    res.json(result);
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// --- Settings ---
app.get('/api/settings', async (req, res) => {
  try {
    const rows = await Settings.find();
    const settings = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    res.json(settings);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await Settings.findOneAndUpdate(
        { key },
        { value: value.toString() },
        { upsert: true }
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
});

// --- Alerts ---
app.get('/api/alerts/low-stock', async (req, res) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ["$stock", "$low_stock_threshold"] }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/alerts/overdue-debts', async (req, res) => {
  try {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + 3);
    threshold.setHours(23, 59, 59, 999);
    
    // Find all customers with debt and a promise date within 3 days
    const overdue = await Customer.find({
      total_debt: { $gt: 0 },
      promise_date: { $lte: threshold }
    });

    res.json(overdue);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/alerts/expiring', async (req, res) => {
  try {
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    
    const products = await Product.find({
      expiry_date: { $lte: thirtyDaysLater, $gte: new Date() }
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- Dashboard Stats ---
app.get('/api/stats/summary', async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todaySales = await Sale.aggregate([
      { $match: { created_at: { $gte: startOfToday } } },
      { $group: { _id: null, total: { $sum: "$total_amount" } } }
    ]);

    const totalProducts = await Product.countDocuments();
    const lowStockItems = await Product.countDocuments({
      $expr: { $lte: ["$stock", "$low_stock_threshold"] }
    });
    
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const nearingExpiry = await Product.countDocuments({
      expiry_date: { $lte: thirtyDaysLater, $gte: new Date() }
    });

    res.json({
      totalSalesToday: todaySales[0]?.total || 0,
      totalProducts,
      lowStockItems,
      nearingExpiry
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start server if not running in a serverless environment like Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✅ POS Server running on http://localhost:${PORT}`);
  });
}

// Export for Vercel Serverless
module.exports = app;
