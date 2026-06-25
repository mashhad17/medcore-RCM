/* ─────────────────────────────────────────────────
   MEDCORE HMS · REVENUE & REPORTS
   ───────────────────────────────────────────────── */

const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
let currentPeriod = 'monthly';
let currentTab = 'revenue';

function money(n) { return (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getPayments() {
    return JSON.parse(localStorage.getItem('medcore_payments')) || [];
}

/* Seed a few demo payments so reports aren't empty before the first live collection */
function seedPaymentsIfEmpty() {
    if (localStorage.getItem('medcore_payments')) return;

    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
    const at = (year, month, day, h = 11, min = 30) => new Date(year, month, day, h, min).toISOString();

    const seed = [
        { invoiceNo: 'INV-' + y + '-1042', patientName: 'Kavya Shanil', mrn: 'MRN-2026-0009', doctor: 'Dr. Mohammed', dept: 'General Practice', amount: 164.00, method: 'Cash', date: at(y, m, d, 9, 45), visitDate: '' },
        { invoiceNo: 'INV-' + y + '-1041', patientName: 'Zain Ahmed', mrn: 'MRN-2026-0007', doctor: 'Dr. Fatima', dept: 'Dental Surgery', amount: 357.00, method: 'Credit / Debit Card', date: at(y, m, d, 10, 20), visitDate: '' },
        { invoiceNo: 'INV-' + y + '-1040', patientName: 'Maria Joseph', mrn: 'MRN-2026-0017', doctor: 'Dr. Mohammed', dept: 'General Practice', amount: 420.00, method: 'Cash', date: at(y, m, d, 13, 5), visitDate: '' },
        { invoiceNo: 'INV-' + y + '-1038', patientName: 'Ameem Siddiqui', mrn: 'MRN-2026-0008', doctor: 'Dr. Roger', dept: 'Dermatology', amount: 318.00, method: 'Cash', date: at(y, m, Math.max(1, d - 2), 14, 10), visitDate: '' },
        { invoiceNo: 'INV-' + y + '-1031', patientName: 'Sara Khan', mrn: 'MRN-2026-0006', doctor: 'Dr. Fatima', dept: 'Dental Surgery', amount: 612.00, method: 'Bank Transfer', date: at(y, m, Math.max(1, d - 5), 12, 0), visitDate: '' },
        { invoiceNo: 'INV-' + y + '-1024', patientName: 'Mohammed Ali', mrn: 'MRN-2026-0014', doctor: 'Dr. Ali', dept: 'Orthopedics', amount: 880.00, method: 'Cash', date: at(y, m, Math.max(1, d - 9), 15, 30), visitDate: '' },
        { invoiceNo: 'INV-' + y + '-0992', patientName: 'Leena George', mrn: 'MRN-2026-0011', doctor: 'Dr. Sarah', dept: 'Pediatrics', amount: 200.00, method: 'Cash', date: at(y, m === 0 ? 11 : m - 1, 18, 11, 15), visitDate: '' },
        { invoiceNo: 'INV-' + y + '-0945', patientName: 'Hassan Raza', mrn: 'MRN-2026-0003', doctor: 'Dr. Mohammed', dept: 'General Practice', amount: 14464.00, method: 'Credit / Debit Card', date: at(y, m === 0 ? 11 : m - 1, 4, 16, 0), visitDate: '' },
        { invoiceNo: 'INV-' + y + '-0710', patientName: 'Fatima Noor', mrn: 'MRN-2026-0002', doctor: 'Dr. Roger', dept: 'Dermatology', amount: 1450.00, method: 'Online Payment', date: at(y, 1, 12, 10, 0), visitDate: '' }
    ];
    const collectors = ['System Admin', 'Reception Desk', 'Front Office'];
    seed.forEach((p, i) => { p.collectedBy = collectors[i % collectors.length]; });
    localStorage.setItem('medcore_payments', JSON.stringify(seed));
}

function inPeriod(dateStr, period) {
    const dt = new Date(dateStr);
    const now = new Date();
    if (period === 'daily') return dt.toDateString() === now.toDateString();
    if (period === 'monthly') return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
    return dt.getFullYear() === now.getFullYear(); // yearly
}

function periodLabel() {
    const now = new Date();
    if (currentPeriod === 'daily') return `Today (${shortMonths[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()})`;
    if (currentPeriod === 'monthly') return `${shortMonths[now.getMonth()]} ${now.getFullYear()}`;
    return `Year ${now.getFullYear()}`;
}

function periodPayments() {
    return getPayments().filter(p => inPeriod(p.date, currentPeriod));
}

/* ── TAB / PERIOD CONTROL ── */
function setReportTab(tab) {
    currentTab = tab;
    document.querySelectorAll('#report-tabs .report-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    render();
}

function setPeriod(period) {
    currentPeriod = period;
    document.querySelectorAll('#period-seg button').forEach(b => b.classList.toggle('active', b.dataset.period === period));
    render();
}

function onSearch() {
    if (currentTab === 'history') renderReportInto(renderHistoryReport());
}

function render() {
    let html = '';
    if (currentTab === 'revenue') html = renderRevenueReport();
    else if (currentTab === 'finance') html = renderFinanceReport();
    else if (currentTab === 'daily') html = renderDailyReport();
    else if (currentTab === 'statistical') html = renderStatisticalReport();
    else html = renderHistoryReport();
    renderReportInto(html);
}

function renderReportInto(html) {
    document.getElementById('report-content').innerHTML = html;
}

/* ── 1. REVENUE REPORTS (doctor-wise) ── */
function renderRevenueReport() {
    const payments = periodPayments();
    const byDoc = {};
    payments.forEach(p => {
        if (!byDoc[p.doctor]) byDoc[p.doctor] = { doctor: p.doctor, dept: p.dept, total: 0, count: 0 };
        byDoc[p.doctor].total += p.amount;
        byDoc[p.doctor].count += 1;
    });
    const docs = Object.values(byDoc).sort((a, b) => b.total - a.total);
    const grand = payments.reduce((s, p) => s + p.amount, 0);

    let cards = `<div class="rev-card rev-total">
            <div class="rev-doc">Total Revenue</div>
            <div class="rev-dept">${periodLabel()}</div>
            <div class="rev-amt">AED ${money(grand)}</div>
            <div class="rev-meta">${payments.length} invoice(s) collected</div>
        </div>`;
    if (docs.length === 0) {
        cards += `<div class="rev-card" style="grid-column: span 2; display:flex; align-items:center; color: var(--text-muted);">No revenue recorded for this period.</div>`;
    } else {
        cards += docs.map(d => `
            <div class="rev-card">
                <div class="rev-doc">${d.doctor}</div>
                <div class="rev-dept">${d.dept}</div>
                <div class="rev-amt">AED ${money(d.total)}</div>
                <div class="rev-meta">${d.count} invoice(s)</div>
            </div>`).join('');
    }
    return `<h2 style="font-size:1rem; font-weight:600; color:var(--text-dark); margin-bottom:12px;">Doctor-wise Revenue · ${periodLabel()}</h2>
            <div class="rev-grid">${cards}</div>`;
}

/* ── 2. FINANCE REPORTS (payment method breakdown) ── */
function renderFinanceReport() {
    const payments = periodPayments();
    const byMethod = {};
    payments.forEach(p => {
        if (!byMethod[p.method]) byMethod[p.method] = { method: p.method, total: 0, count: 0 };
        byMethod[p.method].total += p.amount;
        byMethod[p.method].count += 1;
    });
    const methods = Object.values(byMethod).sort((a, b) => b.total - a.total);
    const grand = payments.reduce((s, p) => s + p.amount, 0);
    const max = methods.reduce((mx, m) => Math.max(mx, m.total), 0) || 1;

    const cashTotal = (byMethod['Cash'] ? byMethod['Cash'].total : 0);

    let bars = methods.length === 0
        ? `<div style="color: var(--text-muted);">No collections for this period.</div>`
        : methods.map(m => `
            <div class="fin-row">
                <div class="fin-name">${m.method} <span style="color:var(--text-muted); font-weight:400;">(${m.count})</span></div>
                <div class="fin-bar-track"><div class="fin-bar-fill" style="width:${(m.total / max * 100).toFixed(1)}%;"></div></div>
                <div class="fin-amt">AED ${money(m.total)}</div>
            </div>`).join('');

    return `
        <div class="kpi-grid">
            <div class="kpi-card"><div class="kpi-label">Total Collected</div><div class="kpi-value">AED ${money(grand)}</div><div class="kpi-sub">${periodLabel()}</div></div>
            <div class="kpi-card"><div class="kpi-label">Cash Collections</div><div class="kpi-value">AED ${money(cashTotal)}</div><div class="kpi-sub">${grand ? (cashTotal / grand * 100).toFixed(0) : 0}% of total</div></div>
            <div class="kpi-card"><div class="kpi-label">Non-Cash Collections</div><div class="kpi-value">AED ${money(grand - cashTotal)}</div><div class="kpi-sub">Card · Transfer · Online</div></div>
            <div class="kpi-card"><div class="kpi-label">Invoices</div><div class="kpi-value">${payments.length}</div><div class="kpi-sub">Self-paid / cash claims</div></div>
        </div>
        <h2 style="font-size:1rem; font-weight:600; color:var(--text-dark); margin:1.5rem 0 1rem;">Collections by Payment Method · ${periodLabel()}</h2>
        ${bars}`;
}

/* ── 3. DAILY REPORTS · DAILY COLLECTION CONSOLIDATED (User-wise + Doctor-wise) ── */
const PAY_METHODS = ['Cash', 'Credit / Debit Card', 'Cheque', 'Bank Transfer', 'Online Payment'];

function consolidatedTable(payments, groupField, headerLabel, fallback) {
    const groups = {};
    payments.forEach(p => {
        const key = p[groupField] || fallback;
        if (!groups[key]) { groups[key] = { name: key, total: 0 }; PAY_METHODS.forEach(m => groups[key][m] = 0); }
        groups[key][p.method] = (groups[key][p.method] || 0) + p.amount;
        groups[key].total += p.amount;
    });
    const list = Object.values(groups).sort((a, b) => b.total - a.total);
    const colTotals = {}; PAY_METHODS.forEach(m => colTotals[m] = 0);
    let grand = 0;
    list.forEach(g => { PAY_METHODS.forEach(m => colTotals[m] += g[m]); grand += g.total; });

    const head = `<tr><th>${headerLabel}</th>${PAY_METHODS.map(m => `<th style="text-align:right;">${m}</th>`).join('')}<th style="text-align:right;">Total</th></tr>`;
    const body = list.length === 0
        ? `<tr><td colspan="${PAY_METHODS.length + 2}" style="padding:24px; text-align:center; color:var(--text-muted);">No collections for this period.</td></tr>`
        : list.map(g => `<tr>
                <td style="font-weight:600;">${g.name}</td>
                ${PAY_METHODS.map(m => `<td style="text-align:right;">${money(g[m])}</td>`).join('')}
                <td style="text-align:right; font-weight:700; color:var(--accent);">${money(g.total)}</td>
            </tr>`).join('');
    const foot = `<tr style="background:var(--bg-aesthetic); font-weight:700;">
            <td style="padding:12px 14px;">Total</td>
            ${PAY_METHODS.map(m => `<td style="padding:12px 14px; text-align:right;">${money(colTotals[m])}</td>`).join('')}
            <td style="padding:12px 14px; text-align:right; color:var(--accent);">${money(grand)}</td>
        </tr>`;

    return `<div style="overflow-x:auto; margin-bottom:1.75rem;">
            <table class="pay-table"><thead>${head}</thead><tbody>${body}</tbody><tfoot>${foot}</tfoot></table>
        </div>`;
}

function renderDailyReport() {
    const payments = periodPayments();
    return `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h2 style="font-size:1rem; font-weight:600; color:var(--text-dark);">Daily Collection Consolidated · ${periodLabel()}</h2>
            <button class="btn-secondary" onclick="printReportSection('Daily Collection Consolidated · ${periodLabel()}')">Print Report</button>
        </div>
        <h3 style="font-size:0.8125rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px;">Collected By (User)</h3>
        ${consolidatedTable(payments, 'collectedBy', 'User', 'System Admin')}
        <h3 style="font-size:0.8125rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px;">Doctor-wise Collection</h3>
        ${consolidatedTable(payments, 'doctor', 'Doctor', 'Unassigned')}`;
}

/* ── 4. STATISTICAL REPORTS (KPIs) ── */
function renderStatisticalReport() {
    const payments = periodPayments();
    const grand = payments.reduce((s, p) => s + p.amount, 0);
    const avg = payments.length ? grand / payments.length : 0;

    const byDoc = {}, byDept = {}, byMethod = {};
    payments.forEach(p => {
        byDoc[p.doctor] = (byDoc[p.doctor] || 0) + p.amount;
        byDept[p.dept] = (byDept[p.dept] || 0) + p.amount;
        byMethod[p.method] = (byMethod[p.method] || 0) + 1;
    });
    const top = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0];
    const topDoc = top(byDoc), topDept = top(byDept), topMethod = top(byMethod);

    return `
        <h2 style="font-size:1rem; font-weight:600; color:var(--text-dark); margin-bottom:12px;">Statistical Summary · ${periodLabel()}</h2>
        <div class="kpi-grid">
            <div class="kpi-card"><div class="kpi-label">Total Revenue</div><div class="kpi-value">AED ${money(grand)}</div><div class="kpi-sub">${payments.length} invoices</div></div>
            <div class="kpi-card"><div class="kpi-label">Average Invoice</div><div class="kpi-value">AED ${money(avg)}</div><div class="kpi-sub">per collection</div></div>
            <div class="kpi-card"><div class="kpi-label">Top Earning Doctor</div><div class="kpi-value" style="font-size:1.25rem;">${topDoc ? topDoc[0] : '—'}</div><div class="kpi-sub">${topDoc ? 'AED ' + money(topDoc[1]) : 'No data'}</div></div>
            <div class="kpi-card"><div class="kpi-label">Top Department</div><div class="kpi-value" style="font-size:1.25rem;">${topDept ? topDept[0] : '—'}</div><div class="kpi-sub">${topDept ? 'AED ' + money(topDept[1]) : 'No data'}</div></div>
            <div class="kpi-card"><div class="kpi-label">Most Used Method</div><div class="kpi-value" style="font-size:1.25rem;">${topMethod ? topMethod[0] : '—'}</div><div class="kpi-sub">${topMethod ? topMethod[1] + ' payment(s)' : 'No data'}</div></div>
            <div class="kpi-card"><div class="kpi-label">Active Doctors</div><div class="kpi-value">${Object.keys(byDoc).length}</div><div class="kpi-sub">with collections</div></div>
        </div>`;
}

/* ── 5. PAYMENT HISTORY (full ledger) ── */
function renderHistoryReport() {
    const searchEl = document.getElementById('paySearch');
    const search = (searchEl ? searchEl.value : '').toLowerCase().trim();

    let payments = getPayments();
    if (search) payments = payments.filter(p =>
        (p.patientName || '').toLowerCase().includes(search) ||
        (p.doctor || '').toLowerCase().includes(search) ||
        (p.invoiceNo || '').toLowerCase().includes(search)
    );

    const rows = payments.length === 0
        ? `<tr><td colspan="9" style="padding:24px; text-align:center; color:var(--text-muted);">No payments found.</td></tr>`
        : payments.map(p => {
            const dt = new Date(p.date);
            const dateStr = `${shortMonths[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()} · ${dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
            return `
            <tr>
                <td>${dateStr}</td>
                <td><button class="link-btn" onclick="openPatientStatement('${p.mrn || ''}', '${(p.patientName || '').replace(/'/g, "")}')">${p.invoiceNo}</button></td>
                <td><button class="link-btn" style="color:var(--text-dark);" onclick="openPatientStatement('${p.mrn || ''}', '${(p.patientName || '').replace(/'/g, "")}')">${p.patientName}</button><br><span style="font-size:0.6875rem; color:var(--text-muted);">${p.mrn || ''}</span></td>
                <td>${p.doctor}</td>
                <td>${p.dept}</td>
                <td>${p.method}</td>
                <td style="text-align:right; font-weight:600;">${money(p.amount)}</td>
                <td><span class="pay-pill">Paid</span></td>
                <td><button class="link-btn" onclick="printPaymentInvoice('${p.invoiceNo}')">Print</button></td>
            </tr>`;
        }).join('');

    return `
        <h2 style="font-size:1rem; font-weight:600; color:var(--text-dark); margin-bottom:12px;">Payment History <span style="color:var(--text-muted); font-weight:400; font-size:0.8125rem;">(all-time ledger · click an invoice for the patient statement)</span></h2>
        <table class="pay-table">
            <thead><tr><th>Date / Time</th><th>Invoice No</th><th>Patient</th><th>Doctor</th><th>Department</th><th>Method</th><th style="text-align:right;">Amount (AED)</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}

/* ── PATIENT STATEMENT (per-patient invoice record) ── */
function getAppointments() { return JSON.parse(localStorage.getItem('medcore_appointments')) || []; }

function findInvoiceApp(invoiceNo) {
    return getAppointments().find(a => a.invoice && a.invoice.no === invoiceNo) || null;
}

function patientInfoByMrn(mrn) {
    const apps = getAppointments().filter(a => a.mrn === mrn);
    const base = apps[0] || null;
    let plan = null;
    apps.forEach(a => {
        if (a.clinicalProfile && a.clinicalProfile.packages && a.clinicalProfile.packages.length) {
            plan = a.clinicalProfile.packages[a.clinicalProfile.packages.length - 1];
        }
    });
    return { base, plan };
}

function treatmentSummary(invoiceNo, dept) {
    const app = findInvoiceApp(invoiceNo);
    if (app && app.invoice && app.invoice.lines && app.invoice.lines.length) {
        return app.invoice.lines.map(l => l.desc).join(', ');
    }
    return `Consultation - ${dept}`;
}

function openPatientStatement(mrn, patientName) {
    const info = patientInfoByMrn(mrn);
    const pays = getPayments().filter(p => mrn ? p.mrn === mrn : p.patientName === patientName);
    const base = info.base;
    const name = (base && base.patientName) || patientName || (pays[0] && pays[0].patientName) || 'Patient';
    const plan = info.plan;
    const grand = pays.reduce((s, p) => s + p.amount, 0);

    const rows = pays.length === 0
        ? `<tr><td colspan="7" style="padding:18px; text-align:center; color:var(--text-muted);">No invoices on record.</td></tr>`
        : pays.map(p => {
            const dt = new Date(p.date);
            const payType = p.method === 'Cash' ? 'Cash' : (plan ? 'Insurance' : p.method);
            return `<tr>
                <td>${shortMonths[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}</td>
                <td style="font-weight:600; color:var(--accent);">${p.invoiceNo}</td>
                <td>${p.doctor}<br><span style="font-size:0.6875rem; color:var(--text-muted);">${p.dept}</span></td>
                <td>${treatmentSummary(p.invoiceNo, p.dept)}</td>
                <td style="text-align:right; font-weight:600;">${money(p.amount)}</td>
                <td>${payType}</td>
                <td>${(payType === 'Insurance' && plan) ? plan.name : '—'}</td>
            </tr>`;
        }).join('');

    document.getElementById('stmt-body').innerHTML = `
        <div style="height:6px; background:var(--accent);"></div>
        <div style="padding:20px 24px; display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid var(--border-light);">
            <div>
                <div style="font-size:1.05rem; font-weight:700; color:var(--text-dark);">Patient Statement</div>
                <div style="font-size:0.8125rem; color:var(--text-muted);">${name} · ${mrn || ''}</div>
            </div>
            <button onclick="closeStatement()" style="background:none; border:none; cursor:pointer; color:var(--text-muted);">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>

        <div id="stmt-print-area" style="padding:20px 24px;">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px 24px; font-size:0.8125rem; color:var(--text-mid); margin-bottom:18px;">
                <div><strong>Patient:</strong> ${name}</div>
                <div><strong>MRN:</strong> ${mrn || '—'}</div>
                <div><strong>Emirates ID:</strong> ${base && base.nid ? base.nid : 'N/A'}</div>
                <div><strong>DOB:</strong> ${base && base.dob ? new Date(base.dob).toLocaleDateString('en-GB') : 'N/A'}</div>
                <div><strong>Phone:</strong> ${base && base.phone ? base.phone : 'N/A'}</div>
                <div><strong>Registered:</strong> ${base && base.createdDate ? base.createdDate : '—'}</div>
                <div style="grid-column:1/-1;"><strong>Payment Profile:</strong> ${plan ? `Insurance — ${plan.name} (exp ${plan.expiryDate}, ${plan.status})` : 'Cash / Self-Paid (No active insurance)'}</div>
            </div>

            <table class="pay-table">
                <thead><tr><th>Treatment Date</th><th>Invoice No</th><th>Doctor / Dept</th><th>Treatment</th><th style="text-align:right;">Price (AED)</th><th>Payment</th><th>Insurance Plan</th></tr></thead>
                <tbody>${rows}</tbody>
                <tfoot><tr style="background:var(--bg-aesthetic); font-weight:700;"><td colspan="4" style="padding:12px 14px;">Total</td><td style="padding:12px 14px; text-align:right; color:var(--accent);">${money(grand)}</td><td colspan="2"></td></tr></tfoot>
            </table>
        </div>

        <div style="padding:16px 24px; border-top:1px solid var(--border-light); display:flex; justify-content:flex-end; gap:10px;">
            <button class="btn-ghost" onclick="closeStatement()">Close</button>
            <button class="btn-primary" onclick="printStatement('${mrn || ''}', '${name.replace(/'/g, "")}')">PRINT STATEMENT</button>
        </div>`;

    document.getElementById('stmtModal').classList.add('open');
    document.getElementById('stmtBackdrop').classList.add('open');
}

function closeStatement() {
    document.getElementById('stmtModal').classList.remove('open');
    document.getElementById('stmtBackdrop').classList.remove('open');
}

/* ── PRINTING ── */
function printHtml(title, bodyHtml) {
    const w = window.open('', '_blank', 'width=900,height=820');
    if (!w) { alert('Please allow pop-ups to print.'); return; }
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
        <style>
            body { font-family: Arial, sans-serif; color:#1F2937; padding:28px; }
            h2 { color:#4F7CAC; }
            table { width:100%; border-collapse:collapse; font-size:12px; margin-top:12px; }
            th { background:#4B5563; color:#fff; padding:8px; text-align:left; }
            td { padding:8px; border-bottom:1px solid #E5E7EB; }
            tfoot td { font-weight:700; }
            button { display:none !important; }
            .pay-pill { color:#059669; font-weight:700; }
        </style></head><body>
        <div style="display:flex; justify-content:space-between; border-bottom:3px solid #4F7CAC; padding-bottom:10px; margin-bottom:16px;">
            <h2 style="margin:0;">MedCore HMS</h2><div style="text-align:right; color:#6B7280;">${title}<br>${new Date().toLocaleString()}</div>
        </div>
        ${bodyHtml}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => w.print(), 250);
}

function printReportSection(title) {
    printHtml(title, document.getElementById('report-content').innerHTML);
}

function printStatement(mrn, name) {
    const area = document.getElementById('stmt-print-area');
    printHtml(`Patient Statement — ${name}`, area ? area.innerHTML : '');
}

function printPaymentInvoice(invoiceNo) {
    const p = getPayments().find(x => x.invoiceNo === invoiceNo);
    if (!p) return;
    const info = patientInfoByMrn(p.mrn);
    const base = info.base, plan = info.plan;
    const app = findInvoiceApp(invoiceNo);
    const dt = new Date(p.date);
    const payType = p.method === 'Cash' ? 'Cash' : (plan ? 'Insurance' : p.method);

    let lineRows, total = p.amount;
    if (app && app.invoice && app.invoice.lines && app.invoice.lines.length) {
        lineRows = app.invoice.lines.map((l, i) => `<tr><td>${String(i + 1).padStart(2, '0')}</td><td>${l.code}</td><td>${l.desc}</td><td style="text-align:center;">${l.qty}</td><td style="text-align:right;">${money(l.total)}</td></tr>`).join('');
    } else {
        lineRows = `<tr><td>01</td><td>CONS</td><td>Consultation - ${p.dept}</td><td style="text-align:center;">1</td><td style="text-align:right;">${money(p.amount)}</td></tr>`;
    }

    const body = `
        <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:14px;">
            <div><strong>Bill To:</strong><br>${p.patientName}<br>MRN: ${p.mrn || ''}<br>ID: ${base && base.nid ? base.nid : 'N/A'}</div>
            <div style="text-align:right;"><strong>Invoice:</strong> ${invoiceNo}<br><strong>Date:</strong> ${dt.toLocaleDateString('en-GB')}<br><strong>Doctor:</strong> ${p.doctor}</div>
        </div>
        <div style="font-size:13px; margin-bottom:10px;"><strong>Payment:</strong> ${payType} ${payType === 'Insurance' && plan ? '— ' + plan.name : ''} · <strong>Status:</strong> Paid</div>
        <table>
            <thead><tr><th>S#</th><th>Code</th><th>Treatment</th><th>Qty</th><th style="text-align:right;">Total (AED)</th></tr></thead>
            <tbody>${lineRows}</tbody>
            <tfoot><tr><td colspan="4" style="text-align:right;">Grand Total</td><td style="text-align:right;">AED ${money(total)}</td></tr></tfoot>
        </table>
        <div style="display:flex; justify-content:space-between; margin-top:40px; font-size:11px; color:#6B7280;">
            <div style="border-top:1px solid #1F2937; width:200px; padding-top:6px;">Patient Signature</div>
            <div style="border-top:1px solid #1F2937; width:200px; padding-top:6px;">Authorized Signatory</div>
        </div>`;
    printHtml(`Tax Invoice — ${invoiceNo}`, body);
}

document.addEventListener('DOMContentLoaded', () => {
    seedPaymentsIfEmpty();
    render();
});
