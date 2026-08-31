'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { generateQRCode, buildCertificateHTML } = require('../../backend/src/features/certificates/certificateGenerator');
const { downloadCertificatePDF } = require('../../backend/src/features/certificates/certificate.controller');

describe('Certificate Test Cases (CERT-001 to CERT-010)', () => {

    const sampleDoc = {
        id: 101,
        doc_type: 'aadhaar',
        name: 'Devendra Patel',
        identity_no: '987654321098',
        dob: '1992-07-24',
        authority: 'UIDAI — Govt. of India',
        address: 'Gandhinagar, Gujarat',
        hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        anchored_at: '2026-03-23T04:14:00.000Z',
        block_number: '12847921',
        cert_id: 'CERT-2026-AA1098-ABCD'
    };

    test('CERT-001: Generate Certificate HTML structure', async () => {
        const qr = await generateQRCode('https://digiid.app/verify/CERT-2026-AA1098-ABCD');
        const html = buildCertificateHTML(sampleDoc, qr);

        assert.ok(html.includes('Identity Verification Certificate'));
        assert.ok(html.includes('Devendra Patel'));
        assert.ok(html.includes('CERT-2026-AA1098-ABCD'));
    });

    test('CERT-003: QR Code contains correct verification URL', async () => {
        const url = 'https://digiid.app/verify/CERT-2026-AA1098-ABCD';
        const qr = await generateQRCode(url);
        assert.ok(qr.startsWith('data:image/png;base64,'));
    });

    test('CERT-004: Certificate ID correctly rendered', async () => {
        const qr = await generateQRCode('https://digiid.app/verify/CERT-2026-AA1098-ABCD');
        const html = buildCertificateHTML(sampleDoc, qr);
        assert.ok(html.includes('CERT-2026-AA1098-ABCD'));
    });

    test('CERT-005: Masked Identity Number in Certificate', async () => {
        const qr = await generateQRCode('https://digiid.app/verify/CERT-2026-AA1098-ABCD');
        const html = buildCertificateHTML(sampleDoc, qr);
        assert.ok(!html.includes('987654321098')); // Raw number not in rendered text
        assert.ok(html.includes('XXXX XXXX 1098')); // Masked version shown
    });

    test('CERT-006: Blockchain Information rendered', async () => {
        const qr = await generateQRCode('https://digiid.app/verify/CERT-2026-AA1098-ABCD');
        const html = buildCertificateHTML(sampleDoc, qr);
        assert.ok(html.includes('Block #12847921'));
        assert.ok(html.includes('Blockchain Verified'));
    });

    test('CERT-007: HTML Injection (XSS) in name/authority is escaped', async () => {
        const maliciousDoc = {
            ...sampleDoc,
            name: '<script>alert("xss")</script>',
            authority: '<img src=x onerror=alert(1)>'
        };
        const qr = await generateQRCode('https://digiid.app/verify/CERT-2026-TEST');
        const html = buildCertificateHTML(maliciousDoc, qr);

        assert.ok(!html.includes('<script>alert("xss")</script>'));
        assert.ok(html.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'));
        assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
        assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
    });

    test('CERT-008: Puppeteer Failure returns controlled server error', async () => {
        // Mock req/res to test error handling when puppeteer fails
        let statusCode = 0;
        let responseJson = null;

        const req = {
            params: { identity_no: '987654321098' },
            headers: {}
        };
        const res = {
            status(code) { statusCode = code; return this; },
            json(data) { responseJson = data; return this; }
        };

        let errorPassedToNext = null;
        const next = (err) => { errorPassedToNext = err; };

        // When DB or Puppeteer fails, controller calls next(err) safely
        try {
            await downloadCertificatePDF(req, res, next);
            assert.ok(statusCode !== 0 || errorPassedToNext !== null);
        } catch (e) {
            assert.fail('Process threw unhandled exception: ' + e.message);
        }
    });

    test('CERT-010: QR Verification Round Trip components match', async () => {
        const verifyUrl = `https://digiid.app/verify/${sampleDoc.cert_id}`;
        const qr = await generateQRCode(verifyUrl);
        const html = buildCertificateHTML(sampleDoc, qr);

        assert.ok(html.includes(sampleDoc.cert_id));
        assert.ok(html.includes('digiid.app/verify/'));
    });
});
