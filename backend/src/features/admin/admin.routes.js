'use strict';

const express = require('express');
const router = express.Router();
const {
    login,
    logout,
    getMe,
    getDashboard,
    getDocuments,
    getDocumentById,
    revealPII,
    verifyDocumentHandler,
    revokeDocumentHandler,
    correctDocumentHandler,
    getBlockchainInfo,
    getAuditLogsHandler,
    exportDocumentsHandler,
    getSettingsHandler,
    updateSettingsHandler,
    getAlertsHandler
} = require('./admin.controller');
const {
    requireAdminAuth,
    loginRateLimiter
} = require('../../core/middleware/admin.middleware');

// Public admin auth routes
router.post('/auth/login', loginRateLimiter, login);

// Protected admin routes
router.use(requireAdminAuth);

router.post('/auth/logout', logout);
router.get('/auth/me', getMe);

router.get('/dashboard', getDashboard);
router.get('/documents', getDocuments);
router.get('/documents/:identity_no', getDocumentById);
router.post('/documents/:identity_no/reveal-pii', revealPII);
router.post('/documents/:identity_no/verify', verifyDocumentHandler);
router.post('/documents/:identity_no/revoke', revokeDocumentHandler);
router.post('/documents/:identity_no/correct', correctDocumentHandler);

router.get('/blockchain', getBlockchainInfo);
router.get('/audit-logs', getAuditLogsHandler);
router.get('/export', exportDocumentsHandler);
router.get('/settings', getSettingsHandler);
router.put('/settings', updateSettingsHandler);
router.get('/alerts', getAlertsHandler);

module.exports = router;
