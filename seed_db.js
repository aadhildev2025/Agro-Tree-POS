const fs = require('fs');
const path = require('path');

// This script can be used to seed the database with some initial products for testing
const { db, initDB } = require('./server/db');

function seedData() {
  try {
    initDB();
    
    // Clear existing data to avoid conflicts during customization
    console.log('Clearing old data...');
    db.transaction(() => {
      db.prepare('DELETE FROM products').run();
      db.prepare('DELETE FROM categories').run();
      try {
        db.prepare('DELETE FROM sqlite_sequence WHERE name IN ("products", "categories")').run();
      } catch (e) {
        console.log('Note: sqlite_sequence update skipped or failed (normal if no sequences yet)');
      }
    })();

    console.log('Inserting categories...');
    const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
    const categories = [
      'Granular Fertilizers', 
      'Liquid Formulas', 
      'Organic Compost', 
      'Pest & Disease Control', 
      'Root Growth Boosters', 
      'Gardening Tools'
    ];
    categories.forEach(c => insertCategory.run(c));
    
    console.log('Inserting products...');
    const insertProduct = db.prepare(`
      INSERT OR IGNORE INTO products (name, barcode, category_id, price, cost_price, stock, low_stock_threshold, expiry_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Granular Fertilizers (Category ID: 1)
    insertProduct.run('NPK 15-15-15 (50kg)', 'FER001', 1, 4500.00, 3800.00, 40, 5, null);
    insertProduct.run('Urea 46% Nitrogen (50kg)', 'FER002', 1, 3200.00, 2700.00, 60, 10, null);
    insertProduct.run('MOP - Muriate of Potash', 'FER003', 1, 3800.00, 3200.00, 25, 5, null);

    // Liquid Formulas (Category ID: 2)
    insertProduct.run('Fruit Master Liquid (1L)', 'LIQ001', 2, 1250.00, 950.00, 100, 15, '2027-12-31');
    insertProduct.run('Chelated Iron Booster (500ml)', 'LIQ002', 2, 850.00, 600.00, 45, 10, '2026-06-30');

    // Organic Compost (Category ID: 3)
    insertProduct.run('Premium Vermicompost (10kg)', 'ORG001', 3, 650.00, 450.00, 50, 10, null);
    insertProduct.run('Bone Meal Organic (1kg)', 'ORG002', 3, 350.00, 220.00, 120, 20, null);

    // Pest Control (Category ID: 4)
    insertProduct.run('Neem Oil Concentrate (250ml)', 'PST001', 4, 950.00, 700.00, 30, 5, '2027-01-01');
    insertProduct.run('Organic Copper Fungicide', 'PST002', 4, 1100.00, 850.00, 20, 5, '2026-11-15');

    // Tools (Category ID: 6)
    insertProduct.run('Battery Sprayer 16L', 'TOL001', 6, 8500.00, 6500.00, 10, 2, null);
    insertProduct.run('Tree Pruning Shear (Heavy Duty)', 'TOL002', 6, 2200.00, 1600.00, 15, 3, null);
    
    console.log('Tree Fertilizer Shop data seeded successfully.');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seedData();


