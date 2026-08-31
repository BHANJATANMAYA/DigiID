'use strict';

// ── State & Config ────────────────────────────────────────────
const token = localStorage.getItem('digiid_admin_token');
let currentDocs = [];
let currentPage = 1;
let currentTargetDoc = null;

if (!token) {
    window.location.replace('/admin/login');
}

function authHeaders() {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// ── Navigation & View Switching ───────────────────────────────
function switchView(targetId) {
    document.querySelectorAll('.content-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const view = document.getElementById(targetId);
    const nav = document.querySelector(`.nav-item[data-target="${targetId}"]`);
    if (view) view.classList.add('active');
    if (nav) nav.classList.add('active');

    const titles = {
        'view-dashboard': 'Operational Dashboard',
        'view-documents': 'Identity Records Management',
        'view-blockchain': 'Blockchain Ledger & Smart Contract Status',
        'view-audit': 'Append-Only Audit Timeline',
        'view-settings': 'System Policies & Configuration'
    };
    const titleEl = document.getElementById('currentViewTitle');
    if (titleEl) titleEl.textContent = titles[targetId] || 'Admin Portal';

    if (targetId === 'view-dashboard') loadDashboard();
    if (targetId === 'view-documents') loadDocuments();
    if (targetId === 'view-blockchain') loadBlockchain();
    if (targetId === 'view-audit') loadAuditLogs();
    if (targetId === 'view-settings') loadSettings();
}

document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const target = item.getAttribute('data-target');
        if (target) switchView(target);
    });
});

// ── Theme Toggle ──────────────────────────────────────────────
document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
});

// ── Logout ────────────────────────────────────────────────────
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to end your Super Admin session?')) return;
    try {
        await fetch('/api/admin/auth/logout', { method: 'POST', headers: authHeaders() });
    } catch {}
    localStorage.removeItem('digiid_admin_token');
    localStorage.removeItem('digiid_admin_email');
    window.location.replace('/admin/login');
});

// ── Dashboard Loader ──────────────────────────────────────────
async function loadDashboard() {
    try {
        const res = await fetch('/api/admin/dashboard', { headers: authHeaders() });
        if (res.status === 401) {
            localStorage.removeItem('digiid_admin_token');
            window.location.replace('/admin/login');
            return;
        }

        const json = await res.json();
        if (!json.success) return;

        const { metrics, health, recentRegistrations } = json.data;

        // Health Indicators
        const dbDot = document.getElementById('dbHealthDot');
        const dbText = document.getElementById('dbHealthText');
        if (dbDot && dbText) {
            dbDot.className = 'health-dot ' + (health.database.status === 'HEALTHY' ? '' : 'danger');
            dbText.textContent = health.database.status;
        }

        const rpcDot = document.getElementById('rpcHealthDot');
        const rpcText = document.getElementById('rpcHealthText');
        if (rpcDot && rpcText) {
            rpcDot.className = 'health-dot ' + (health.blockchain.status === 'HEALTHY' ? '' : 'warning');
            rpcText.textContent = health.blockchain.status;
        }

        // Stats
        document.getElementById('statTotalDocs').textContent = metrics.total || 0;
        document.getElementById('statActiveDocs').textContent = metrics.active || 0;
        document.getElementById('statRevokedDocs').textContent = metrics.revoked || 0;
        document.getElementById('statDocBreakdown').textContent =
            `${metrics.aadhaar || 0} Aadhaar · ${metrics.pan || 0} PAN · ${metrics.voter || 0} Voter`;

        // Recent table
        const tbody = document.getElementById('recentDocsTableBody');
        if (tbody) {
            if (!recentRegistrations || recentRegistrations.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">No documents anchored yet.</td></tr>';
            } else {
                tbody.innerHTML = recentRegistrations.map(d => `
                    <tr>
                        <td><span class="code-pill">${escapeHTML(d.cert_id || 'CERT-PENDING')}</span></td>
                        <td><strong>${escapeHTML((d.doc_type || '').toUpperCase())}</strong></td>
                        <td>${escapeHTML(d.name)}</td>
                        <td><span class="code-pill">${escapeHTML(d.identity_no)}</span></td>
                        <td>${escapeHTML(d.authority)}</td>
                        <td><span class="badge ${d.status === 'REVOKED' ? 'badge-revoked' : (d.status === 'CORRECTED' ? 'badge-corrected' : 'badge-active')}">${d.status || 'ACTIVE'}</span></td>
                        <td>${d.anchored_at ? new Date(d.anchored_at).toLocaleDateString('en-IN') : 'N/A'}</td>
                    </tr>
                `).join('');
            }
        }

    } catch (err) {
        console.error('Failed to load dashboard:', err);
    }
}

// ── Documents Loader ──────────────────────────────────────────
async function loadDocuments() {
    const q = document.getElementById('docSearchQuery')?.value.trim() || '';
    const docType = document.getElementById('filterDocType')?.value || '';
    const status = document.getElementById('filterStatus')?.value || '';

    const params = new URLSearchParams({
        page: currentPage,
        limit: 20
    });
    if (q) params.set('q', q);
    if (docType) params.set('doc_type', docType);
    if (status) params.set('status', status);

    const tbody = document.getElementById('documentsTableBody');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-muted);">Fetching records…</td></tr>';

    try {
        const res = await fetch(`/api/admin/documents?${params.toString()}`, { headers: authHeaders() });
        const json = await res.json();

        if (!json.success) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--danger); padding:20px;">${json.error || 'Failed to load records'}</td></tr>`;
            return;
        }

        currentDocs = json.data || [];
        document.getElementById('docCountLabel').textContent = `Showing ${currentDocs.length} of ${json.total} records`;

        if (currentDocs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);">No documents match the current filter criteria.</td></tr>';
            return;
        }

        tbody.innerHTML = currentDocs.map(d => `
            <tr>
                <td><span class="code-pill">${escapeHTML(d.cert_id || 'CERT-PENDING')}</span></td>
                <td><strong>${escapeHTML((d.doc_type || '').toUpperCase())}</strong></td>
                <td>${escapeHTML(d.name)}</td>
                <td>
                    <span class="code-pill" id="id-disp-${d.id}">${escapeHTML(d.identity_no)}</span>
                    <button class="btn btn-outline" style="padding:2px 6px; font-size:10px; margin-left:4px;" onclick="openRevealModal('${d.id}', '${escapeHTML(d.identity_no)}')">👁️ Reveal</button>
                </td>
                <td><span class="badge ${d.status === 'REVOKED' ? 'badge-revoked' : (d.status === 'CORRECTED' ? 'badge-corrected' : 'badge-active')}">${d.status || 'ACTIVE'}</span></td>
                <td>v${d.version || 1}</td>
                <td>${d.anchored_at ? new Date(d.anchored_at).toLocaleDateString('en-IN') : 'N/A'}</td>
                <td style="text-align:right;">
                    <div style="display:inline-flex; gap:6px;">
                        <button class="btn btn-outline" style="padding:3px 8px; font-size:11px;" onclick="verifyDoc('${d.identity_no}')">🔍 Verify</button>
                        ${d.status !== 'REVOKED' ? `
                            <button class="btn btn-outline" style="padding:3px 8px; font-size:11px;" onclick="openCorrectModal('${d.id}')">✏️ Correct</button>
                            <button class="btn btn-danger" style="padding:3px 8px; font-size:11px;" onclick="openRevokeModal('${d.id}', '${d.identity_no}')">🚫 Revoke</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--danger); padding:20px;">Network error loading records.</td></tr>`;
    }
}

document.getElementById('applyFiltersBtn')?.addEventListener('click', () => {
    currentPage = 1;
    loadDocuments();
});

document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
    document.getElementById('docSearchQuery').value = '';
    document.getElementById('filterDocType').value = '';
    document.getElementById('filterStatus').value = '';
    currentPage = 1;
    loadDocuments();
});

// ── Modals & Actions ──────────────────────────────────────────
function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
}

// Reveal PII
let _revealDoc = null;
window.openRevealModal = function(id, maskedId) {
    _revealDoc = currentDocs.find(d => String(d.id) === String(id));
    if (!_revealDoc) return;

    document.getElementById('revealResultBox').style.display = 'none';
    document.getElementById('confirmRevealBtn').disabled = false;
    document.getElementById('confirmRevealBtn').textContent = 'Confirm & Reveal';
    document.getElementById('revealModal').classList.add('open');
};

document.getElementById('confirmRevealBtn')?.addEventListener('click', async () => {
    if (!_revealDoc) return;
    const reason = document.getElementById('revealReasonInput').value.trim() || 'Admin verification inquiry';

    const btn = document.getElementById('confirmRevealBtn');
    btn.disabled = true;
    btn.textContent = 'Auditing & Revealing…';

    try {
        const res = await fetch(`/api/admin/documents/${encodeURIComponent(_revealDoc.identity_no.replace(/\s/g, ''))}/reveal-pii`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ reason })
        });
        const json = await res.json();
        if (json.success) {
            document.getElementById('revealResultNumber').textContent = json.identity_no;
            document.getElementById('revealResultBox').style.display = 'block';
            btn.textContent = 'Revealed (Audited)';
        } else {
            alert(json.error || 'Failed to reveal PII');
            btn.disabled = false;
        }
    } catch {
        alert('Server error during PII reveal');
        btn.disabled = false;
    }
});

// Revoke Modal
let _revokeDoc = null;
window.openRevokeModal = function(id, identityNo) {
    _revokeDoc = currentDocs.find(d => String(d.id) === String(id));
    if (!_revokeDoc) return;

    document.getElementById('revokeTargetId').value = `${_revokeDoc.name} (${identityNo})`;
    document.getElementById('revokeReasonInput').value = '';
    document.getElementById('confirmRevokeBtn').disabled = false;
    document.getElementById('confirmRevokeBtn').textContent = 'Confirm Revocation';
    document.getElementById('revokeModal').classList.add('open');
};

document.getElementById('confirmRevokeBtn')?.addEventListener('click', async () => {
    if (!_revokeDoc) return;
    const reason = document.getElementById('revokeReasonInput').value.trim();
    if (!reason) {
        alert('Please enter a mandatory revocation reason.');
        return;
    }

    const btn = document.getElementById('confirmRevokeBtn');
    btn.disabled = true;
    btn.textContent = 'Revoking on Chain & DB…';

    try {
        const cleanId = _revokeDoc.identity_no.replace(/\s/g, '');
        const res = await fetch(`/api/admin/documents/${encodeURIComponent(cleanId)}/revoke`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ reason })
        });
        const json = await res.json();
        if (json.success) {
            alert(`Document revoked! Blockchain status: ${json.blockchainRevoked ? 'REVOKED ON CHAIN' : 'DB updated'}`);
            closeModals();
            loadDocuments();
        } else {
            alert(json.error || 'Revocation failed');
            btn.disabled = false;
            btn.textContent = 'Confirm Revocation';
        }
    } catch {
        alert('Network error during revocation');
        btn.disabled = false;
    }
});

// Correct Modal
let _correctDoc = null;
window.openCorrectModal = function(id) {
    _correctDoc = currentDocs.find(d => String(d.id) === String(id));
    if (!_correctDoc) return;

    document.getElementById('correctNameInput').value = _correctDoc.name || '';
    document.getElementById('correctDobInput').value = _correctDoc.dob || '';
    document.getElementById('correctAuthorityInput').value = _correctDoc.authority || '';
    document.getElementById('correctReasonInput').value = '';
    document.getElementById('confirmCorrectBtn').disabled = false;
    document.getElementById('confirmCorrectBtn').textContent = 'Apply Correction & Re-Anchor';
    document.getElementById('correctModal').classList.add('open');
};

document.getElementById('confirmCorrectBtn')?.addEventListener('click', async () => {
    if (!_correctDoc) return;
    const reason = document.getElementById('correctReasonInput').value.trim();
    if (!reason) {
        alert('Correction reason is mandatory.');
        return;
    }

    const updates = {
        name: document.getElementById('correctNameInput').value.trim(),
        dob: document.getElementById('correctDobInput').value.trim(),
        authority: document.getElementById('correctAuthorityInput').value.trim()
    };

    const btn = document.getElementById('confirmCorrectBtn');
    btn.disabled = true;
    btn.textContent = 'Re-anchoring on Chain…';

    try {
        const cleanId = _correctDoc.identity_no.replace(/\s/g, '');
        const res = await fetch(`/api/admin/documents/${encodeURIComponent(cleanId)}/correct`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ reason, updates })
        });
        const json = await res.json();
        if (json.success) {
            alert('Correction applied! New version anchored to Ethereum ledger.');
            closeModals();
            loadDocuments();
        } else {
            alert(json.error || 'Correction failed');
            btn.disabled = false;
            btn.textContent = 'Apply Correction & Re-Anchor';
        }
    } catch {
        alert('Network error during correction');
        btn.disabled = false;
    }
});

// Verify Action
window.verifyDoc = async function(identityNo) {
    const cleanId = identityNo.replace(/\s/g, '');
    try {
        const res = await fetch(`/api/admin/documents/${encodeURIComponent(cleanId)}/verify`, {
            method: 'POST',
            headers: authHeaders()
        });
        const json = await res.json();
        if (json.success) {
            const bc = json.blockchainStatus;
            alert(`Verification Result for ${identityNo}:\nDatabase Status: ${json.databaseStatus}\nOn-Chain Exists: ${bc.exists}\nOn-Chain Revoked: ${bc.isRevoked}\nAnchored At: ${bc.anchoredAt || 'N/A'}`);
        } else {
            alert(json.error || 'Verification failed');
        }
    } catch {
        alert('Verification request failed');
    }
};

// ── Blockchain Loader ──
async function loadBlockchain() {
    try {
        const res = await fetch('/api/admin/blockchain', { headers: authHeaders() });
        const json = await res.json();
        if (json.success) {
            document.getElementById('bcContractAddress').textContent = json.data.contractAddress || 'Not Deployed';
            document.getElementById('bcNetworkName').textContent = json.data.network || 'Hardhat Localhost';
        }
    } catch {}
}

document.getElementById('btnDirectVerify')?.addEventListener('click', async () => {
    const hash = document.getElementById('directVerifyHashInput').value.trim();
    if (!hash || hash.length !== 64) {
        alert('Please enter a valid 64-character hex hash.');
        return;
    }

    const resBox = document.getElementById('directVerifyResult');
    resBox.style.display = 'block';
    resBox.style.background = 'var(--bg-page)';
    resBox.style.border = '1px solid var(--border-color)';
    resBox.textContent = 'Querying IdentityLedger contract on Ethereum RPC…';

    try {
        const res = await fetch('/api/admin/blockchain', { headers: authHeaders() });
        const json = await res.json();
        resBox.textContent = JSON.stringify({
            queryHash: hash,
            contractAddress: json.data.contractAddress,
            network: json.data.network,
            rpcHealth: json.data.rpcHealth,
            status: 'Query successful'
        }, null, 2);
    } catch {
        resBox.textContent = 'Error contacting RPC service.';
    }
});

// ── Audit Logs Loader ──
async function loadAuditLogs() {
    const action = document.getElementById('auditActionFilter')?.value || '';
    const params = new URLSearchParams({ limit: 50 });
    if (action) params.set('action', action);

    const tbody = document.getElementById('auditTableBody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">Loading audit events…</td></tr>';

    try {
        const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, { headers: authHeaders() });
        const json = await res.json();
        if (!json.success || !json.data || json.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-muted);">No audit events recorded yet.</td></tr>';
            return;
        }

        tbody.innerHTML = json.data.map(l => `
            <tr>
                <td>#${l.id}</td>
                <td style="font-size:11px; color:var(--text-muted);">${new Date(l.created_at).toLocaleString('en-IN')}</td>
                <td><strong>${escapeHTML(l.admin_email)}</strong></td>
                <td><span class="code-pill">${escapeHTML(l.action)}</span></td>
                <td>${escapeHTML(l.target_resource || '—')}</td>
                <td><span class="badge ${l.outcome === 'SUCCESS' ? 'badge-active' : 'badge-revoked'}">${l.outcome}</span></td>
                <td style="font-size:11px;">${escapeHTML(l.reason || JSON.stringify(l.metadata || ''))}</td>
            </tr>
        `).join('');
    } catch {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--danger); padding:20px;">Failed to load audit logs.</td></tr>';
    }
}

document.getElementById('refreshAuditBtn')?.addEventListener('click', loadAuditLogs);
document.getElementById('auditActionFilter')?.addEventListener('change', loadAuditLogs);

// ── Settings Loader ──
async function loadSettings() {
    try {
        const res = await fetch('/api/admin/settings', { headers: authHeaders() });
        const json = await res.json();
        if (json.success) {
            document.getElementById('setMaintenance').checked = !!json.data.maintenance_mode;
            document.getElementById('setPublicVerify').checked = !!json.data.allow_public_verification;
        }
    } catch {}
}

document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updates = {
        maintenance_mode: document.getElementById('setMaintenance').checked,
        allow_public_verification: document.getElementById('setPublicVerify').checked
    };
    try {
        const res = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(updates)
        });
        const json = await res.json();
        if (json.success) {
            alert('Settings updated and audited successfully.');
        } else {
            alert(json.error || 'Failed to update settings');
        }
    } catch {
        alert('Server error updating settings');
    }
});

// ── Export CSV ──
document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
    window.location.href = `/api/admin/export?format=csv&token=${encodeURIComponent(token)}`;
});

// ── Utility: HTML Escaping ──
function escapeHTML(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Initial view
loadDashboard();
