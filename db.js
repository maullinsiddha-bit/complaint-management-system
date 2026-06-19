// ============================================
// db.js - Database Connection
// Connects Node.js to MySQL
// ============================================

const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',           // If you have a MySQL password, put it here
    database: 'complaint_db'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        console.log('👉 Make sure XAMPP MySQL is running.');
    } else {
        console.log('✅ Connected to MySQL database: complaint_db');
    }
});

module.exports = db;
