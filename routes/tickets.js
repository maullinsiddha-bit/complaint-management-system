// ============================================
// routes/tickets.js
// All API routes for the Complaint Management System
// ============================================

const express = require('express');
const router = express.Router();
const db = require('../db');

// ============================================
// USER REGISTRATION
// POST /api/user/register
// ============================================
router.post('/user/register', (req, res) => {
    const { name, email, password, employee_id, department } = req.body;

    if (!name || !email || !password || !employee_id || !department) {
        return res.json({ success: false, message: 'All fields are required.' });
    }

    // Check if email already exists
    db.query('SELECT id FROM users WHERE email = ? OR employee_id = ?', [email, employee_id], (err, results) => {
        if (err) return res.json({ success: false, message: 'Database error.' });

        if (results.length > 0) {
            return res.json({ success: false, message: 'Email or Employee ID already registered.' });
        }

        // Insert new user
        const query = 'INSERT INTO users (name, email, password, employee_id, department) VALUES (?, ?, ?, ?, ?)';
        db.query(query, [name, email, password, employee_id, department], (err) => {
            if (err) return res.json({ success: false, message: 'Registration failed.' });
            res.json({ success: true, message: 'Account created successfully! Please login.' });
        });
    });
});

// ============================================
// USER LOGIN
// POST /api/user/login
// ============================================
router.post('/user/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.json({ success: false, message: 'Email and password are required.' });
    }

    db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, results) => {
        if (err) return res.json({ success: false, message: 'Database error.' });

        if (results.length === 0) {
            return res.json({ success: false, message: 'Invalid email or password.' });
        }

        // Save user in session
        req.session.user = {
            id: results[0].id,
            name: results[0].name,
            email: results[0].email,
            employee_id: results[0].employee_id,
            department: results[0].department
        };

        res.json({ success: true, message: 'Login successful!', user: req.session.user });
    });
});

// ============================================
// USER LOGOUT
// POST /api/user/logout
// ============================================
router.post('/user/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true, message: 'Logged out.' });
    });
});

// ============================================
// CHECK USER SESSION
// GET /api/user/check
// ============================================
router.get('/user/check', (req, res) => {
    if (req.session.user) {
        res.json({ success: true, loggedIn: true, user: req.session.user });
    } else {
        res.json({ success: true, loggedIn: false });
    }
});

// ============================================
// SUBMIT A TICKET (User must be logged in)
// POST /api/tickets
// ============================================
router.post('/tickets', (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, message: 'Please login first.' });
    }

    const { category, description } = req.body;
    const user = req.session.user;

    if (!category || !description) {
        return res.json({ success: false, message: 'All fields are required.' });
    }

    // Generate ticket ID
    db.query('SELECT COUNT(*) AS count FROM tickets', (err, results) => {
        if (err) return res.json({ success: false, message: 'Database error.' });

        const count = results[0].count + 1;
        const ticket_id = 'CMP-' + String(count).padStart(4, '0');

        const query = `INSERT INTO tickets 
            (ticket_id, user_id, employee_name, employee_id, department, category, description, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`;

        db.query(query, [ticket_id, user.id, user.name, user.employee_id, user.department, category, description], (err) => {
            if (err) return res.json({ success: false, message: 'Failed to submit complaint.' });
            res.json({ success: true, message: 'Complaint submitted!', ticket_id });
        });
    });
});

// ============================================
// GET USER'S OWN TICKETS
// GET /api/tickets/my
// ============================================
router.get('/tickets/my', (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, message: 'Please login first.' });
    }

    db.query(
        'SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC',
        [req.session.user.id],
        (err, results) => {
            if (err) return res.json({ success: false, message: 'Database error.' });
            res.json({ success: true, tickets: results });
        }
    );
});

// ============================================
// ADMIN - GET ALL TICKETS
// GET /api/admin/tickets
// ============================================
router.get('/admin/tickets', (req, res) => {
    if (!req.session.admin) {
        return res.json({ success: false, message: 'Unauthorized.' });
    }

    const search = req.query.search || '';
    const status = req.query.status || '';

    let query = 'SELECT * FROM tickets WHERE 1=1';
    const params = [];

    if (search) {
        query += ' AND (ticket_id LIKE ? OR employee_name LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    db.query(query, params, (err, results) => {
        if (err) return res.json({ success: false, message: 'Database error.' });
        res.json({ success: true, tickets: results });
    });
});

// ============================================
// ADMIN - UPDATE TICKET STATUS
// PUT /api/admin/tickets/:id/status
// ============================================
router.put('/admin/tickets/:id/status', (req, res) => {
    if (!req.session.admin) return res.json({ success: false, message: 'Unauthorized.' });

    const { status } = req.body;
    const validStatuses = ['Pending', 'In Progress', 'Resolved'];

    if (!validStatuses.includes(status)) {
        return res.json({ success: false, message: 'Invalid status.' });
    }

    db.query('UPDATE tickets SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
        if (err) return res.json({ success: false, message: 'Update failed.' });
        res.json({ success: true, message: 'Status updated.' });
    });
});

// ============================================
// ADMIN - SEND REPLY MESSAGE TO USER
// PUT /api/admin/tickets/:id/reply
// ============================================
router.put('/admin/tickets/:id/reply', (req, res) => {
    if (!req.session.admin) return res.json({ success: false, message: 'Unauthorized.' });

    const { reply } = req.body;

    if (!reply || reply.trim() === '') {
        return res.json({ success: false, message: 'Reply message cannot be empty.' });
    }

    db.query('UPDATE tickets SET admin_reply = ? WHERE id = ?', [reply, req.params.id], (err) => {
        if (err) return res.json({ success: false, message: 'Failed to send reply.' });
        res.json({ success: true, message: 'Reply sent successfully.' });
    });
});

// ============================================
// ADMIN - DELETE TICKET
// DELETE /api/admin/tickets/:id
// ============================================
router.delete('/admin/tickets/:id', (req, res) => {
    if (!req.session.admin) return res.json({ success: false, message: 'Unauthorized.' });

    db.query('DELETE FROM tickets WHERE id = ?', [req.params.id], (err, result) => {
        if (err) return res.json({ success: false, message: 'Delete failed.' });
        if (result.affectedRows === 0) return res.json({ success: false, message: 'Ticket not found.' });
        res.json({ success: true, message: 'Ticket deleted.' });
    });
});

// ============================================
// ADMIN - GET STATS
// GET /api/admin/stats
// ============================================
router.get('/admin/stats', (req, res) => {
    if (!req.session.admin) return res.json({ success: false, message: 'Unauthorized.' });

    const query = `
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS inProgress,
            SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) AS resolved
        FROM tickets
    `;

    db.query(query, (err, results) => {
        if (err) return res.json({ success: false, message: 'Database error.' });
        res.json({ success: true, stats: results[0] });
    });
});

// ============================================
// ADMIN LOGIN
// POST /api/admin/login
// ============================================
router.post('/admin/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({ success: false, message: 'Username and password required.' });
    }

    db.query('SELECT * FROM admins WHERE username = ? AND password = ?', [username, password], (err, results) => {
        if (err) return res.json({ success: false, message: 'Database error.' });

        if (results.length === 0) {
            return res.json({ success: false, message: 'Invalid username or password.' });
        }

        req.session.admin = { id: results[0].id, username: results[0].username };
        res.json({ success: true, message: 'Admin login successful!' });
    });
});

// ============================================
// ADMIN LOGOUT
// POST /api/admin/logout
// ============================================
router.post('/admin/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

// ============================================
// CHECK ADMIN SESSION
// GET /api/admin/check
// ============================================
router.get('/admin/check', (req, res) => {
    if (req.session.admin) {
        res.json({ success: true, loggedIn: true, username: req.session.admin.username });
    } else {
        res.json({ success: true, loggedIn: false });
    }
});

module.exports = router;
