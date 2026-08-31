'use strict';

const express = require('express');
const path = require('path');
const documentRoutes = require('./features/documents/document.routes');
const certificateRoutes = require('./features/certificates/certificate.routes');
const adminRoutes = require('./features/admin/admin.routes');
const { getPublicVerifyPage } = require('./features/certificates/certificate.controller');
const { errorHandler, notFoundHandler } = require('./core/middleware/error.middleware');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public verify route ← must be before express.static
app.get('/verify/:cert_id', getPublicVerifyPage);

// Admin Web Routes
app.get('/admin', (req, res) => res.redirect('/admin/login'));
app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'admin', 'login.html'));
});
app.get([
    '/admin/dashboard',
    '/admin/documents',
    '/admin/verification',
    '/admin/revocations',
    '/admin/blockchain',
    '/admin/certificates',
    '/admin/audit-logs',
    '/admin/settings'
], (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'admin', 'index.html'));
});
app.use('/admin', express.static(path.join(__dirname, '..', '..', 'frontend', 'admin')));

// Redirect root → login
app.get('/', (req, res) => res.redirect('/login.html'));

// Static files for citizen portal
app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'DigiID Verify — Government ID Portal API is running',
        timestamp: new Date().toISOString(),
    });
});

// Admin API
app.use('/api/admin', adminRoutes);

// Gov ID Document API
app.use('/api/documents', documentRoutes);

// Certificate API
app.use('/api/certificates', certificateRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
