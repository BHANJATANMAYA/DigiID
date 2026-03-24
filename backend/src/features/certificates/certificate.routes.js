'use strict';

const express = require('express');
const router = express.Router();
const requireAuth = require('../../core/middleware/auth.middleware');
const {
    getCertificate,
    downloadCertificatePDF,
} = require('./certificate.controller');

// GET /api/certificates/:identity_no        → JSON (certificateHTML + metadata)
router.get('/:identity_no', requireAuth, getCertificate);

// GET /api/certificates/:identity_no/pdf    → PDF download
router.get('/:identity_no/pdf', requireAuth, downloadCertificatePDF);

module.exports = router;
