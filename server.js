// ============================================
// server.js - Main Server File
// Complaint Management System
// ============================================

const express = require('express');
const session = require('express-session');
const path = require('path');
const ticketRoutes = require('./routes/tickets');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(session({
    secret: 'cms_secret_key_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// All API routes
app.use('/api', ticketRoutes);

// Page routes
app.get('/',          (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/user',       (req, res) => res.sendFile(path.join(__dirname, 'public', 'user.html')));
app.get('/user/portal',(req, res) => res.sendFile(path.join(__dirname, 'public', 'portal.html')));
app.get('/admin',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 Complaint Management System is running!');
    console.log(`🌐 Open browser: http://localhost:${PORT}`);
    console.log(`🔑 Admin login:  http://localhost:${PORT}/admin`);
    console.log('');
});
