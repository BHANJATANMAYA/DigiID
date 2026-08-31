'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Frontend Tests (FE-001 to FE-020)', () => {
    const frontendDir = path.join(__dirname, '..', '..', 'frontend');

    test('FE-001: Login page syntax and elements', () => {
        const html = fs.readFileSync(path.join(frontendDir, 'login.html'), 'utf8');
        assert.ok(html.includes('mobileNumber'));
        assert.ok(html.includes('otpDigit'));
        assert.ok(html.includes('btnVerifyOtp'));
    });

    test('FE-002: Mobile number validation rule in frontend', () => {
        const html = fs.readFileSync(path.join(frontendDir, 'login.html'), 'utf8');
        assert.ok(html.includes('^\\d{10}$'));
    });

    test('FE-003 & FE-004: OTP Validation & Six-digit Demo OTP confirmation', () => {
        const html = fs.readFileSync(path.join(frontendDir, 'login.html'), 'utf8');
        assert.ok(html.includes('entered.length < 6'));
        assert.ok(html.includes('Demo: any 6-digit OTP is accepted'));
    });

    test('FE-005: Dashboard Session Guard Redirects Unauthenticated Access', () => {
        const script = fs.readFileSync(path.join(frontendDir, 'script.js'), 'utf8');
        assert.ok(script.includes("!sessionStorage.getItem('digiid_auth')"));
        assert.ok(script.includes("window.location.replace('/login.html')"));
    });

    test('FE-006: Document Type Selection metadata defined', () => {
        const script = fs.readFileSync(path.join(frontendDir, 'script.js'), 'utf8');
        assert.ok(script.includes('aadhaar'));
        assert.ok(script.includes('pan'));
        assert.ok(script.includes('voter'));
    });

    test('FE-016: Internationalization & Language Switch (English & Hindi)', () => {
        const translations = fs.readFileSync(path.join(frontendDir, 'translations.js'), 'utf8');
        assert.ok(translations.includes('en:'));
        assert.ok(translations.includes('hi:'));
    });

    test('FE-017: Dark Theme Toggle logic in frontend', () => {
        const script = fs.readFileSync(path.join(frontendDir, 'script.js'), 'utf8');
        assert.ok(script.includes('digiid-theme'));
        assert.ok(script.includes('data-theme'));
    });

    test('FE-018: Font size controls accessible', () => {
        const script = fs.readFileSync(path.join(frontendDir, 'script.js'), 'utf8');
        assert.ok(script.includes('btnFontInc'));
        assert.ok(script.includes('btnFontDec'));
    });

    test('FE-019: Mobile Responsive Viewport Meta Tag', () => {
        const indexHtml = fs.readFileSync(path.join(frontendDir, 'index.html'), 'utf8');
        assert.ok(indexHtml.includes('name="viewport"'));
        assert.ok(indexHtml.includes('width=device-width'));
    });
});
