const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'pos-database.db');
const db = new Database(dbPath);

const users = db.prepare('SELECT * FROM users').all();
console.log(users);
db.close();
