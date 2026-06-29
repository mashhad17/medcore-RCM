/* ─────────────────────────────────────────────────
   MEDCORE HMS · PATIENT RECORD (dedicated chart page)
   Reads the same localStorage data as the directory and
   the scheduler, and presents one patient's full record:
   Overview · Visit History · Billing & Pricing.
   ───────────────────────────────────────────────── */

/* ── pricing model (mirrors scheduler.js so figures match invoices) ── */
const VAT_RATE = 0;
const TREATMENT_CATALOG = [
    { code: 'CONS-GP-001', match: 'general practice', name: 'Consultation - General Practice', price: 164.00 },
    { code: 'CONS-DRM-002', match: 'dermatology', name: 'Consultation - Dermatology', price: 250.00 },
    { code: 'CONS-DEN-003', match: 'dental surgery', name: 'Consultation - Dental Surgery', price: 300.00 },
    { code: 'CONS-PED-004', match: 'pediatrics', name: 'Consultation - Pediatrics', price: 200.00 },
    { code: 'CONS-ORT-005', match: 'orthopedics', name: 'Consultation - Orthopedics', price: 280.00 },
    { code: 'PKG-FAM-010', match: 'family consultation', name: 'Family Consultation Package', price: 14300.00 },
    { code: 'FUP-007', match: 'follow-up', name: 'Free Follow-up Consultation', price: 0.00 },
    { code: 'LIDO-2', match: 'lidocaine', name: 'Lidocaine Injection 2% (Anesthesia)', price: 45.00 },
    { code: 'GAUZE-44', match: 'gauze', name: 'Sterile Gauze Pad 4x4', price: 12.00 },
    { code: 'HYDRO-1', match: 'hydrocortisone', name: 'Topical Hydrocortisone Cream 1%', price: 60.00 },
    { code: 'GLOVE-EXM', match: 'gloves', name: 'Disposable Examination Gloves', price: 8.00 },
    { code: 'BOTOX-U', match: 'botox', name: 'Botox (per Unit)', price: 40.00 },
    { code: 'FILLER-ML', match: 'filler', name: 'Dermal Filler (per mL)', price: 1200.00 }
];

function money(n) { return (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function catalogFor(desc) { const d = (desc || '').toLowerCase(); return TREATMENT_CATALOG.find(c => d.includes(c.match)) || null; }
function shortDoc(name) { return name ? name.split(' (')[0] : 'Unassigned'; }
function deptOf(name) { return (name && name.match(/\((.*?)\)/) || [, 'General Practice'])[1]; }

function pdAge(dob) {
    if (!dob) return '—';
    const d = new Date(dob);
    if (isNaN(d)) return '—';
    let a = new Date().getFullYear() - d.getFullYear();
    const m = new Date().getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && new Date().getDate() < d.getDate())) a--;
    return a + ' yrs';
}
function pdInitials(name) { return (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(''); }

/* ── data ── */
function getAppointments() { return JSON.parse(localStorage.getItem('medcore_appointments')) || []; }
function getQueue() { return JSON.parse(localStorage.getItem('medcore_live_queue')) || []; }
function getNotes() { return JSON.parse(localStorage.getItem('medcore_patient_notes')) || {}; }
function getParam(name) { return new URLSearchParams(window.location.search).get(name); }

/* Compute the billing lines + totals for one appointment, preferring any
   invoice already saved on it so the figures match what reception issued. */
function visitBilling(app) {
    let lines, invNo = null, paid = 0, isPaid = false, paymentMethod = null, date = app.date;
    if (app.invoice && Array.isArray(app.invoice.lines)) {
        lines = app.invoice.lines.map(l => ({ code: l.code, desc: l.desc, qty: l.qty, unit: l.unit, total: l.total != null ? l.total : (l.unit * l.qty) }));
        invNo = app.invoice.no;
        paid = app.invoice.amountPaid || 0;
        isPaid = !!app.invoice.paid;
        paymentMethod = app.invoice.paymentMethod || null;
        date = app.invoice.date || app.date;
    } else {
        const dept = deptOf(app.doctorName);
        const consCat = catalogFor(dept) || { code: 'CONS-GP-001', price: 164.00 };
        lines = [{ code: consCat.code, desc: `Consultation - ${dept}`, qty: 1, unit: consCat.price, total: consCat.price }];
        if (app.clinicalProfile && app.clinicalProfile.items && app.clinicalProfile.items.length) {
            app.clinicalProfile.items.forEach(it => {
                const cat = catalogFor(it.description);
                const qty = parseInt(it.qty) || 1;
                const unit = cat ? cat.price : 50.00;
                lines.push({ code: cat ? cat.code : 'ITM-GEN', desc: it.description, qty, unit, total: +(unit * qty).toFixed(2) });
            });
        }
    }
    const total = +lines.reduce((s, l) => s + (l.total || 0), 0).toFixed(2);
    if (isPaid && paid === 0) paid = total; // a flagged-paid invoice with no recorded amount = settled in full
    return { lines, total, paid: +paid.toFixed(2), due: +(total - paid).toFixed(2), isPaid, invNo, paymentMethod, date };
}

/* ── build one patient from the appointment stream ── */
function buildPatient(mrn) {
    const apps = getAppointments().filter(a => a.mrn === mrn);
    if (!apps.length) return null;
    const queuedMrns = new Set(getQueue().map(q => q.mrn));
    const p = { mrn, name: '', dob: '', phone: '', nid: '', doctor: '', lastDate: '', clinicalProfile: null, active: false, appts: apps };
    apps.forEach(a => {
        if (a.patientName) p.name = a.patientName;
        if (a.dob) p.dob = a.dob;
        if (a.phone) p.phone = a.phone;
        if (a.nid) p.nid = a.nid;
        if (a.clinicalProfile) p.clinicalProfile = a.clinicalProfile;
        if ((a.date || '') >= (p.lastDate || '')) { p.lastDate = a.date || p.lastDate; p.doctor = a.doctorName; }
        if (['scheduled', 'arrived', 'warning'].includes(a.status)) p.active = true;
    });
    if (queuedMrns.has(mrn)) p.active = true;
    return p;
}

/* ── render ── */
let RECORD = null;

function renderRecord() {
    const mrn = getParam('mrn');
    const root = document.getElementById('record-root');
    const p = buildPatient(mrn);

    if (!p) {
        root.innerHTML = `<div class="rec-card"><div class="empty">No patient found for ${mrn || 'this record'}.<br><br>
            <button class="btn-primary" onclick="window.location.href='patients.php'">Back to Directory</button></div></div>`;
        return;
    }
    RECORD = p;

    // wire the header "Book Visit" button
    const bookBtn = document.getElementById('recBookBtn');
    if (bookBtn) bookBtn.onclick = () => bookVisit(p);

    const cp = p.clinicalProfile || {};
    const pkg = (cp.packages && cp.packages.length) ? cp.packages[cp.packages.length - 1] : null;

    // billing roll-up across every visit
    const visits = [...p.appts].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    let totalBilled = 0, totalPaid = 0, totalDue = 0;
    visits.forEach(v => { const b = visitBilling(v); totalBilled += b.total; totalPaid += b.paid; totalDue += b.due; });
    totalBilled = +totalBilled.toFixed(2); totalPaid = +totalPaid.toFixed(2); totalDue = +totalDue.toFixed(2);

    root.innerHTML = `
        <div class="rec-head">
            <div class="rec-head-accent"></div>
            <div class="rec-head-body">
                <div class="rec-avatar">${pdInitials(p.name)}</div>
                <div class="rec-id">
                    <h1 class="lora">${p.name || 'Unknown Patient'}</h1>
                    <div class="sub">${p.mrn} · ${pdAge(p.dob)} · ${p.active ? '<span style="color:var(--success-text); font-weight:600;">Active</span>' : 'Inactive'} · ${shortDoc(p.doctor)}</div>
                </div>
                <div class="rec-metrics">
                    <div class="rec-metric"><div class="m-label">Visits</div><div class="m-val">${p.appts.length}</div></div>
                    <div class="rec-metric"><div class="m-label">Total Billed</div><div class="m-val">${money(totalBilled)}</div></div>
                    <div class="rec-metric"><div class="m-label">Outstanding</div><div class="m-val ${totalDue > 0 ? 'due' : 'ok'}">${money(totalDue)}</div></div>
                </div>
            </div>
        </div>

        <div class="rec-tabs">
            <button class="rec-tab active" onclick="recTab('overview', this)">Overview</button>
            <button class="rec-tab" onclick="recTab('history', this)">Visit History</button>
            <button class="rec-tab" onclick="recTab('billing', this)">Billing &amp; Pricing</button>
        </div>

        <div class="rec-panel active" id="panel-overview">${renderOverview(p, cp, pkg, visits)}</div>
        <div class="rec-panel" id="panel-history">${renderHistory(visits)}</div>
        <div class="rec-panel" id="panel-billing">${renderBilling(p, visits, { totalBilled, totalPaid, totalDue })}</div>
    `;
}

function renderOverview(p, cp, pkg, visits) {
    const allergies = (cp.allergies && cp.allergies.length) ? cp.allergies.map(a => `<span class="mini-tag alg">${a}</span>`).join('') : '<span class="empty" style="padding:0;">None on file</span>';
    const conditions = (cp.conditions && cp.conditions.length) ? cp.conditions.map(c => `<span class="mini-tag">${c}</span>`).join('') : '<span class="empty" style="padding:0;">None reported</span>';

    // doctor history: group visits by attending doctor with counts + amount
    const byDoc = {};
    visits.forEach(v => {
        const d = shortDoc(v.doctorName);
        if (!byDoc[d]) byDoc[d] = { dept: deptOf(v.doctorName), count: 0, amount: 0, last: '' };
        const b = visitBilling(v);
        byDoc[d].count++;
        byDoc[d].amount += b.total;
        if ((v.date || '') > byDoc[d].last) byDoc[d].last = v.date || '';
    });
    const docCards = Object.keys(byDoc).map(d => `
        <div class="by-doc-card">
            <div><div class="nm">${d}</div><div class="mt">${byDoc[d].dept} · last seen ${byDoc[d].last || '—'}</div></div>
            <div style="text-align:right;"><div class="nm">${byDoc[d].count} visit${byDoc[d].count === 1 ? '' : 's'}</div><div class="mt">AED ${money(byDoc[d].amount)}</div></div>
        </div>`).join('') || '<div class="empty">No attending doctors recorded.</div>';

    const notes = getNotes()[p.mrn] || [];
    const noteCards = notes.length ? notes.map(n => `
        <div class="rec-card" style="margin:0 0 10px; padding:0.9rem 1.1rem; box-shadow:none;">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                <span class="mini-tag">${n.tag || 'CLINICAL'}</span>
                <span class="mt" style="font-size:0.75rem; color:var(--text-muted);">${n.date} · ${n.author}</span>
            </div>
            <div style="font-size:0.875rem; color:var(--text-dark); line-height:1.5;">${n.text}</div>
        </div>`).join('') : '<div class="empty">No notes recorded yet.</div>';

    return `
        <div class="rec-card">
            <h3>Demographics</h3>
            <div class="rec-grid2">
                <div class="rec-kv"><b>Emirates ID:</b> ${p.nid || 'N/A'}</div>
                <div class="rec-kv"><b>Date of Birth:</b> ${p.dob || 'N/A'}</div>
                <div class="rec-kv"><b>Phone:</b> ${p.phone || 'N/A'}</div>
                <div class="rec-kv"><b>Assigned Doctor:</b> ${shortDoc(p.doctor)}</div>
                <div class="rec-kv"><b>Blood Group:</b> ${cp.bloodGroup || '—'}</div>
                <div class="rec-kv"><b>Insurance:</b> ${pkg ? pkg.name + (pkg.expiryDate ? ` (exp ${pkg.expiryDate})` : '') : 'Cash / Self-Paid'}</div>
            </div>
        </div>

        <div class="rec-card">
            <h3>Clinical Flags</h3>
            <div style="margin-bottom:14px;"><div class="mt" style="font-size:0.6875rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px;">Allergies</div><div class="tagline">${allergies}</div></div>
            <div><div class="mt" style="font-size:0.6875rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px;">Conditions</div><div class="tagline">${conditions}</div></div>
        </div>

        <div class="rec-card">
            <h3>Doctor History</h3>
            ${docCards}
        </div>

        <div class="rec-card">
            <h3>Clinical Notes (${notes.length})</h3>
            ${noteCards}
        </div>
    `;
}

function renderHistory(visits) {
    if (!visits.length) return '<div class="rec-card"><div class="empty">No visits recorded.</div></div>';
    const rows = visits.map(v => {
        const b = visitBilling(v);
        return `
        <tr>
            <td>${v.date || '—'}</td>
            <td><span class="doc-badge">${shortDoc(v.doctorName)}</span></td>
            <td>${deptOf(v.doctorName)}</td>
            <td>${v.reason || 'Consultation'}</td>
            <td style="text-transform:capitalize;">${v.status || '—'}</td>
            <td class="num">${money(b.total)}</td>
            <td>${b.due > 0 ? '<span class="status-chip pay-due">Due ' + money(b.due) + '</span>' : '<span class="status-chip pay-paid">Paid</span>'}</td>
        </tr>`;
    }).join('');
    return `
        <div class="rec-card" style="padding:0;">
            <table class="rec-table">
                <thead><tr>
                    <th>Date</th><th>Doctor</th><th>Department</th><th>Reason</th><th>Status</th><th class="num">Amount (AED)</th><th>Payment</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

function renderBilling(p, visits, totals) {
    const blocks = visits.map(v => {
        const b = visitBilling(v);
        const lineRows = b.lines.map(l => `
            <tr>
                <td style="color:var(--text-muted); font-size:0.75rem;">${l.code}</td>
                <td>${l.desc}</td>
                <td class="num">${l.qty}</td>
                <td class="num">${money(l.unit)}</td>
                <td class="num">${money(l.total)}</td>
            </tr>`).join('');
        return `
        <div class="bill-visit">
            <div class="bill-visit-head">
                <div><div class="t">${v.date || '—'} · ${shortDoc(v.doctorName)}</div><div class="s">${deptOf(v.doctorName)} · ${b.invNo ? b.invNo : 'No invoice issued'}${b.paymentMethod ? ' · ' + b.paymentMethod : ''}</div></div>
                <div>${b.due > 0 ? '<span class="status-chip pay-due">Due ' + money(b.due) + '</span>' : '<span class="status-chip pay-paid">Settled</span>'}</div>
            </div>
            <table class="rec-table">
                <thead><tr><th>Code</th><th>Item / Service</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th></tr></thead>
                <tbody>${lineRows}</tbody>
            </table>
            <div class="bill-summary-row"><span class="k">Billed</span><span class="v">${money(b.total)}</span><span class="k">Paid</span><span class="v">${money(b.paid)}</span><span class="k">Balance</span><span class="v" style="color:${b.due > 0 ? 'var(--danger)' : 'var(--success-text)'};">${money(b.due)}</span></div>
        </div>`;
    }).join('') || '<div class="empty">No billable visits on record.</div>';

    const priceList = TREATMENT_CATALOG.map(c => `
        <tr><td style="color:var(--text-muted); font-size:0.75rem;">${c.code}</td><td>${c.name}</td><td class="num">${money(c.price)}</td></tr>`).join('');

    return `
        <div class="rec-card">
            <h3>Account Summary</h3>
            <div class="bill-summary-row" style="justify-content:flex-start; gap:40px; border:none; padding:0;">
                <div><div class="mt" style="font-size:0.625rem; text-transform:uppercase; font-weight:700; color:var(--text-muted);">Total Billed</div><div style="font-size:1.25rem; font-weight:700; color:var(--text-dark);">AED ${money(totals.totalBilled)}</div></div>
                <div><div class="mt" style="font-size:0.625rem; text-transform:uppercase; font-weight:700; color:var(--text-muted);">Total Paid</div><div style="font-size:1.25rem; font-weight:700; color:var(--success-text);">AED ${money(totals.totalPaid)}</div></div>
                <div><div class="mt" style="font-size:0.625rem; text-transform:uppercase; font-weight:700; color:var(--text-muted);">Outstanding</div><div style="font-size:1.25rem; font-weight:700; color:${totals.totalDue > 0 ? 'var(--danger)' : 'var(--success-text)'};">AED ${money(totals.totalDue)}</div></div>
            </div>
        </div>

        <h3 style="font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted); margin:0 0 12px 2px;">Invoices by Visit</h3>
        ${blocks}

        <div class="rec-card">
            <h3>Clinic Price List (Reference)</h3>
            <table class="rec-table">
                <thead><tr><th>Code</th><th>Service</th><th class="num">Price (AED)</th></tr></thead>
                <tbody>${priceList}</tbody>
            </table>
        </div>
    `;
}

function recTab(name, btn) {
    document.querySelectorAll('.rec-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.rec-panel').forEach(pl => pl.classList.remove('active'));
    document.getElementById('panel-' + name).classList.add('active');
}

function bookVisit(p) {
    localStorage.setItem('medcore_prefill_patient', JSON.stringify({
        patientName: p.name, nid: p.nid || '', phone: p.phone || '', dob: p.dob || ''
    }));
    window.location.href = 'schedule.php';
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof medcoreSeedAppointmentsIfEmpty === 'function') medcoreSeedAppointmentsIfEmpty();
    renderRecord();
});
