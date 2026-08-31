'use strict';

const express = require('express');
const router = express.Router();
const requireAuth = require('../../core/middleware/auth.middleware');
const {
    anchorDocument,
    getAllDocuments,
    verifyDocument,
    getStats,
    getDocumentByIdentity,
    updateDocument,
    deleteDocument,
    blockchainVerify,
} = require('./document.controller');

// Public Citizen Document Anchoring & Verification endpoints (AUTH-006: intentionally public for citizen registration)
router.post('/', anchorDocument);
router.get('/', getAllDocuments);
router.post('/verify', verifyDocument);
router.get('/stats', getStats);
router.get('/:identity_no', getDocumentByIdentity);
router.get('/:identity_no/blockchain-verify', blockchainVerify);

// Protected Mutation Endpoints (AUTH-007, AUTH-008: require authorization)
router.put('/:identity_no', requireAuth, updateDocument);
router.delete('/:identity_no', requireAuth, deleteDocument);

module.exports = router;
