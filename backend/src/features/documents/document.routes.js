const express = require('express');
const router = express.Router();
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

router.post('/', anchorDocument);
router.get('/', getAllDocuments);
router.post('/verify', verifyDocument);
router.get('/stats', getStats);
router.get('/:identity_no', getDocumentByIdentity);
router.get('/:identity_no/blockchain-verify', blockchainVerify);
router.put('/:identity_no', updateDocument);
router.delete('/:identity_no', deleteDocument);

module.exports = router;
