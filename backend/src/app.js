const express = require('express');
const path = require('path');
const documentRoutes = require('./features/documents/document.routes');
const certificateRoutes = require('./features/certificates/certificate.routes');
const { getPublicVerifyPage } = require('./features/certificates/certificate.controller');
const { errorHandler, notFoundHandler } = require('./core/middleware/error.middleware');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public verify route  ← must be before express.static
app.get('/verify/:cert_id', getPublicVerifyPage);

// Redirect root → login
app.get('/', (req, res) => res.redirect('/login.html'));

// Static files
app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'DigiID Verify — Government ID Portal API is running',
        timestamp: new Date().toISOString(),
    });
});

// Gov ID Document API
app.use('/api/documents', documentRoutes);

// Certificate API
app.use('/api/certificates', certificateRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
