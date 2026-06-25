/* ─────────────────────────────────────────────────
   MEDCORE HMS · PATIENT DIRECTORY (data-driven)
   Builds the directory from the appointment records and
   makes every action functional.
   ───────────────────────────────────────────────── */

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

let currentTabFilter = 'all';
let PATIENTS = [];

/* ── data helpers ── */
function pdGetAppointments() { return JSON.parse(localStorage.getItem('medcore_appointments')) || []; }
function pdGetQueue() { return JSON.parse(localStorage.getItem('medcore_live_queue')) || []; }
function pdGetNotes() { return JSON.parse(localStorage.getItem('medcore_patient_notes')) || {}; }
function pdSaveNotes(n) { localStorage.setItem('medcore_patient_notes', JSON.stringify(n)); }
function pdGetRecent() { return JSON.parse(localStorage.getItem('medcore_recent_patients')) || []; }
function pdPushRecent(mrn) {
    let r = pdGetRecent().filter(x => x !== mrn);
    r.unshift(mrn);
    localStorage.setItem('medcore_recent_patients', JSON.stringify(r.slice(0, 12)));
}

function pdAge(dob) {
    if (!dob) return '—';
    const d = new Date(dob);
    if (isNaN(d)) return '—';
    let a = new Date().getFullYear() - d.getFullYear();
    const m = new Date().getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && new Date().getDate() < d.getDate())) a--;
    return a + ' yrs';
}

function pdInitials(name) {
    return (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function pdShortDoc(doctorName) { return doctorName ? doctorName.split(' (')[0] : 'Unassigned'; }

/* ── build patient list from appointments (deduped by MRN) ── */
function buildPatients() {
    const apps = pdGetAppointments();
    const queuedMrns = new Set(pdGetQueue().map(q => q.mrn));
    const map = {};

    apps.forEach(a => {
        if (!a.mrn) return;
        if (!map[a.mrn]) {
            map[a.mrn] = { mrn: a.mrn, name: a.patientName, dob: a.dob, phone: a.phone, nid: a.nid, doctor: a.doctorName, lastDate: a.date || '', clinicalProfile: a.clinicalProfile || null, active: false, appts: [] };
        }
        const p = map[a.mrn];
        p.appts.push(a);
        if (a.patientName) p.name = a.patientName;
        if (a.dob) p.dob = a.dob;
        if (a.phone) p.phone = a.phone;
        if (a.nid) p.nid = a.nid;
        if (a.clinicalProfile) p.clinicalProfile = a.clinicalProfile;
        if ((a.date || '') >= (p.lastDate || '')) { p.lastDate = a.date || p.lastDate; p.doctor = a.doctorName; }
        if (['scheduled', 'arrived', 'warning'].includes(a.status)) p.active = true;
        if (queuedMrns.has(a.mrn)) p.active = true;
    });

    return Object.values(map).sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''));
}

/* ── render ── */
function renderDirectory() {
    PATIENTS = buildPatients();

    // physician filter options from live data
    const physSel = document.getElementById('physicianFilter');
    const docs = [...new Set(PATIENTS.map(p => pdShortDoc(p.doctor)))].sort();
    physSel.innerHTML = '<option value="all">All Physicians</option>' + docs.map(d => `<option value="${d}">${d}</option>`).join('');

    const activeCount = PATIENTS.filter(p => p.active).length;
    document.getElementById('activeCountText').innerText = `${activeCount} Active Patient${activeCount === 1 ? '' : 's'}`;

    const notes = pdGetNotes();
    const recent = pdGetRecent();

    const tbody = document.getElementById('patientTbody');
    tbody.innerHTML = PATIENTS.map((p, i) => {
        const shortDoc = pdShortDoc(p.doctor);
        const cls = 'avatar-g' + (i % 5);
        const noteCount = (notes[p.mrn] || []).length;
        const chip = p.active
            ? '<span class="status-chip chip-active"><span class="dot"></span>Active</span>'
            : '<span class="status-chip chip-inactive"><span class="dot"></span>Inactive</span>';
        const isRecent = recent.includes(p.mrn) ? 'true' : 'false';
        const lastVisit = p.lastDate ? p.lastDate : '—';

        return `
        <tr class="main-patient-row" data-physician="${shortDoc}" data-active="${p.active}" data-recent="${isRecent}" onclick="openProfile('${p.mrn}')">
            <td class="mrn-text">${p.mrn}</td>
            <td onclick="event.stopPropagation()">
                <div class="pt-name-wrap" onclick="openProfile('${p.mrn}')" style="cursor:pointer;">
                    <div class="pt-avatar-sm ${cls}">${pdInitials(p.name)}</div>
                    <div>
                        <div class="pt-name-text">${p.name || 'Unknown'}</div>
                        <div class="pt-sub">${p.nid ? 'ID: ' + p.nid : 'No ID on file'}</div>
                    </div>
                </div>
            </td>
            <td><span style="font-weight:500;">${pdAge(p.dob)}</span> <span style="color:var(--text-muted);">${p.dob ? '(' + p.dob + ')' : ''}</span></td>
            <td>
                <div style="font-weight:500;">${p.phone || '—'}</div>
                <div class="pt-sub">${p.appts.length} visit${p.appts.length === 1 ? '' : 's'} on record</div>
            </td>
            <td>${lastVisit}</td>
            <td><span class="doc-badge">${shortDoc}</span></td>
            <td>${chip}</td>
            <td onclick="event.stopPropagation()">
                <div class="actions-cell">
                    <button class="btn-outline" onclick="bookVisit('${p.mrn}')">Book Visit</button>
                    <button class="btn-light-accent" onclick="toggleNotes('${p.mrn}')">Note${noteCount ? ' (' + noteCount + ')' : ''}</button>
                    <button class="icon-btn" onclick="openKebab(event,'${p.mrn}')" title="More">&#8942;</button>
                </div>
            </td>
        </tr>
        <tr id="note-${p.mrn}" class="expanded-row">
            <td colspan="8">
                <div class="detail-wrapper" style="padding:1.25rem 2rem 1.25rem 5rem;">
                    <div class="detail-container">
                        <span class="detail-label">Clinical Notes · ${p.name}</span>
                        <div id="note-list-${p.mrn}">${renderNoteCards(p.mrn)}</div>
                        <div style="margin-top:12px; display:flex; gap:10px; align-items:flex-start;">
                            <textarea class="note-input" id="note-input-${p.mrn}" placeholder="Add a clinical / billing note for ${p.name}..."></textarea>
                            <button class="btn-primary" style="white-space:nowrap;" onclick="addNote('${p.mrn}')">Save Note</button>
                        </div>
                    </div>
                </div>
            </td>
        </tr>`;
    }).join('');

    applyFilters();
}

function renderNoteCards(mrn) {
    const list = (pdGetNotes()[mrn] || []);
    if (list.length === 0) return '<div class="pt-sub">No notes recorded yet.</div>';
    return list.map(n => `
        <div class="note-card" style="margin-bottom:10px;">
            <div class="note-header">
                <span class="note-tag">${n.tag || 'CLINICAL'}</span>
                <span class="note-meta">${n.date} • ${n.author}</span>
            </div>
            <p class="note-body">${n.text}</p>
        </div>`).join('');
}

/* ── actions ── */
function toggleNotes(mrn) {
    const row = document.getElementById('note-' + mrn);
    const isOpen = row.classList.contains('show');
    document.querySelectorAll('.expanded-row.show').forEach(r => r.classList.remove('show'));
    if (!isOpen) row.classList.add('show');
}

function addNote(mrn) {
    const ta = document.getElementById('note-input-' + mrn);
    const text = (ta.value || '').trim();
    if (!text) { ta.focus(); return; }
    const notes = pdGetNotes();
    if (!notes[mrn]) notes[mrn] = [];
    const now = new Date();
    notes[mrn].unshift({
        text: text,
        tag: 'CLINICAL',
        date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
        author: 'System Admin'
    });
    pdSaveNotes(notes);
    document.getElementById('note-list-' + mrn).innerHTML = renderNoteCards(mrn);
    ta.value = '';
    // refresh the Note (count) label without collapsing the panel
    renderDirectory();
    document.getElementById('note-' + mrn).classList.add('show');
}

function bookVisit(mrn) {
    const p = PATIENTS.find(x => x.mrn === mrn);
    if (p) {
        localStorage.setItem('medcore_prefill_patient', JSON.stringify({
            patientName: p.name, nid: p.nid || '', phone: p.phone || '', dob: p.dob || ''
        }));
        pdPushRecent(mrn);
    }
    window.location.href = 'schedule.php';
}

/* ── kebab menu ── */
function openKebab(event, mrn) {
    event.stopPropagation();
    const p = PATIENTS.find(x => x.mrn === mrn);
    const menu = document.getElementById('kebabMenu');
    menu.innerHTML = `
        <button class="kebab-item" onclick="openProfile('${mrn}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>View Full Profile</button>
        <button class="kebab-item" onclick="bookVisit('${mrn}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>Book a Visit</button>
        <button class="kebab-item" onclick="closeKebab(); toggleNotes('${mrn}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>Add Clinical Note</button>
        <button class="kebab-item" onclick="copyPhone('${mrn}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.34a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.74-1.27a2 2 0 0 1 2.11-.45c.74.34 1.53.57 2.34.7A2 2 0 0 1 22 16.92z"></path></svg>Copy Phone Number</button>`;
    menu.style.display = 'block';
    const r = event.currentTarget.getBoundingClientRect();
    let left = r.right - menu.offsetWidth;
    let top = r.bottom + 4;
    if (left < 8) left = 8;
    if (top + menu.offsetHeight > window.innerHeight - 8) top = r.top - menu.offsetHeight - 4;
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
}
function closeKebab() { document.getElementById('kebabMenu').style.display = 'none'; }

function copyPhone(mrn) {
    const p = PATIENTS.find(x => x.mrn === mrn);
    closeKebab();
    if (p && p.phone) {
        navigator.clipboard && navigator.clipboard.writeText(p.phone);
        alert('Copied: ' + p.phone);
    }
}

/* ── profile modal ── */
function openProfile(mrn) {
    closeKebab();
    const p = PATIENTS.find(x => x.mrn === mrn);
    if (!p) return;
    pdPushRecent(mrn);
    const cp = p.clinicalProfile || {};
    const shortDoc = pdShortDoc(p.doctor);
    const notes = pdGetNotes()[mrn] || [];

    const allergies = (cp.allergies && cp.allergies.length) ? cp.allergies.map(a => `<span class="mini-tag alg">${a}</span>`).join('') : '<span class="pt-sub">None on file</span>';
    const conditions = (cp.conditions && cp.conditions.length) ? cp.conditions.map(c => `<span class="mini-tag">${c}</span>`).join('') : '<span class="pt-sub">None reported</span>';
    const pkg = (cp.packages && cp.packages.length) ? cp.packages[cp.packages.length - 1] : null;

    const visits = [...p.appts].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5).map(a => `
        <tr>
            <td style="padding:8px 10px; border-bottom:1px solid var(--border-light);">${a.date || '—'}</td>
            <td style="padding:8px 10px; border-bottom:1px solid var(--border-light);">${pdShortDoc(a.doctorName)}</td>
            <td style="padding:8px 10px; border-bottom:1px solid var(--border-light);">${a.reason || 'Consultation'}</td>
            <td style="padding:8px 10px; border-bottom:1px solid var(--border-light); text-transform:capitalize;">${a.status || ''}</td>
        </tr>`).join('') || '<tr><td colspan="4" style="padding:10px; color:var(--text-muted);">No visits recorded.</td></tr>';

    document.getElementById('profile-body').innerHTML = `
        <div style="height:6px; background:linear-gradient(90deg,var(--accent),#8B5CF6);"></div>
        <div style="padding:20px 24px; display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid var(--border-light);">
            <div style="display:flex; gap:14px; align-items:center;">
                <div class="pt-avatar-sm avatar-g0" style="width:52px; height:52px; font-size:1.05rem;">${pdInitials(p.name)}</div>
                <div>
                    <div style="font-size:1.1rem; font-weight:700; color:var(--text-dark);">${p.name}</div>
                    <div class="pt-sub">${p.mrn} · ${pdAge(p.dob)} · ${p.active ? '<span style="color:var(--success-text); font-weight:600;">Active</span>' : 'Inactive'}</div>
                </div>
            </div>
            <button onclick="closeProfile()" style="background:none; border:none; cursor:pointer; color:var(--text-muted);">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
        <div style="padding:20px 24px;">
            <div class="profile-grid" style="margin-bottom:18px;">
                <div><b>Emirates ID:</b> ${p.nid || 'N/A'}</div>
                <div><b>DOB:</b> ${p.dob || 'N/A'}</div>
                <div><b>Phone:</b> ${p.phone || 'N/A'}</div>
                <div><b>Assigned Doctor:</b> ${shortDoc}</div>
                <div><b>Blood Group:</b> ${cp.bloodGroup || '—'}</div>
                <div><b>Insurance:</b> ${pkg ? pkg.name : 'Cash / Self-Paid'}</div>
            </div>
            <div style="margin-bottom:14px;"><span class="detail-label">Allergies</span><div class="tagline">${allergies}</div></div>
            <div style="margin-bottom:18px;"><span class="detail-label">Conditions</span><div class="tagline">${conditions}</div></div>

            <span class="detail-label">Recent Visits</span>
            <table style="width:100%; border-collapse:collapse; font-size:0.8125rem; margin-bottom:18px;">
                <thead><tr style="text-align:left; color:var(--text-muted);">
                    <th style="padding:6px 10px;">Date</th><th style="padding:6px 10px;">Doctor</th><th style="padding:6px 10px;">Reason</th><th style="padding:6px 10px;">Status</th>
                </tr></thead>
                <tbody>${visits}</tbody>
            </table>

            <span class="detail-label">Notes (${notes.length})</span>
            ${renderNoteCards(mrn)}
        </div>
        <div style="padding:16px 24px; border-top:1px solid var(--border-light); display:flex; justify-content:flex-end; gap:10px;">
            <button class="btn-ghost" onclick="closeProfile()">Close</button>
            <button class="btn-secondary" onclick="closeProfile(); toggleNotes('${mrn}')">Add Note</button>
            <button class="btn-primary" onclick="bookVisit('${mrn}')">Book Visit</button>
        </div>`;

    document.getElementById('profileModal').classList.add('open');
    document.getElementById('profileBackdrop').classList.add('open');
    renderDirectory(); // refresh recent flag
}

function closeProfile() {
    document.getElementById('profileModal').classList.remove('open');
    document.getElementById('profileBackdrop').classList.remove('open');
}

/* ── filters ── */
function setTabFilter(tabName, btnElement) {
    document.querySelectorAll('#statusFilterControl .seg-btn').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    currentTabFilter = tabName;
    applyFilters();
}

function cycleTabFilter() {
    const order = ['all', 'active', 'recent'];
    const next = order[(order.indexOf(currentTabFilter) + 1) % order.length];
    const btns = document.querySelectorAll('#statusFilterControl .seg-btn');
    const map = { all: btns[0], recent: btns[1], active: btns[2] };
    setTabFilter(next, map[next]);
}

function applyFilters() {
    const search = (document.getElementById('searchInput').value || '').toLowerCase();
    const phys = document.getElementById('physicianFilter').value;
    const rows = document.querySelectorAll('#patientTbody .main-patient-row');
    let visible = 0;

    rows.forEach(row => {
        const noteRow = row.nextElementSibling;
        const textMatch = row.textContent.toLowerCase().includes(search);
        const physMatch = (phys === 'all') || (row.getAttribute('data-physician') === phys);
        let tabMatch = true;
        if (currentTabFilter === 'recent') tabMatch = row.getAttribute('data-recent') === 'true';
        else if (currentTabFilter === 'active') tabMatch = row.getAttribute('data-active') === 'true';

        if (textMatch && physMatch && tabMatch) { row.style.display = ''; visible++; }
        else {
            row.style.display = 'none';
            if (noteRow && noteRow.classList.contains('expanded-row')) noteRow.classList.remove('show');
        }
    });

    document.getElementById('visibleCountText').innerText = visible === 0 ? 'No patients found' : `Showing ${visible} patient${visible === 1 ? '' : 's'}`;
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('kebabMenu');
    if (menu && !menu.contains(e.target)) closeKebab();
});

document.addEventListener('DOMContentLoaded', () => {
    if (typeof medcoreSeedAppointmentsIfEmpty === 'function') medcoreSeedAppointmentsIfEmpty();
    renderDirectory();
});
