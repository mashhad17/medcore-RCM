/* ─────────────────────────────────────────────────
   MEDCORE HMS · LIVE QUEUE LOGIC (state-driven flow)
   ------------------------------------------------
   The board is driven entirely by data so the patient
   journey is automatic and consistent across pages:

     Add to Queue   → Waiting Room       (stage: waiting)
     Send to Doctor → In Consultation    (stage: consultation)  ← set by the scheduler
     Send to Billing→ Billing & Checkout (stage: billing)
     Mark as Paid   → Completed          (moved to medcore_completed_patients)
   ───────────────────────────────────────────────── */

const STAGE_WAITING = 'waiting';
const STAGE_CONSULTATION = 'consultation';
const STAGE_BILLING = 'billing';

/* ── storage helpers ── */
function qLoadQueue() { return JSON.parse(localStorage.getItem('medcore_live_queue')) || []; }
function qSaveQueue(q) { localStorage.setItem('medcore_live_queue', JSON.stringify(q)); }
function qLoadCompleted() { return JSON.parse(localStorage.getItem('medcore_completed_patients')) || []; }
function qSaveCompleted(c) { localStorage.setItem('medcore_completed_patients', JSON.stringify(c)); }
function qLoadAppointments() { return JSON.parse(localStorage.getItem('medcore_appointments')) || []; }

// GLOBAL LEDGER HELPER
function logActivity(text, author) {
    let logs = JSON.parse(localStorage.getItem('medcore_activity_log')) || [];
    const now = new Date();
    let hours = now.getHours();
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    let mins = now.getMinutes().toString().padStart(2, '0');

    logs.unshift({ time: `${hours}:${mins} ${ampm}`, text: text, author: author });
    if (logs.length > 50) logs.pop();

    localStorage.setItem('medcore_activity_log', JSON.stringify(logs));
}

function sigInitials(name) {
    return (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}
function shortDoc(name) { return (name || 'Unassigned').split(' (')[0]; }

/* ── pricing estimate for the billing step (mirrors the scheduler catalog) ── */
const QUEUE_CATALOG = [
    { match: 'general practice', price: 164 }, { match: 'dental surgery', price: 300 },
    { match: 'dermatology', price: 250 }, { match: 'pediatrics', price: 200 },
    { match: 'orthopedics', price: 280 }
];
function estimateAmount(item) {
    const apps = qLoadAppointments();
    const app = apps.find(a => (item.id && a.id === item.id) || a.mrn === item.mrn);
    if (app && app.invoice && Array.isArray(app.invoice.lines)) {
        return +app.invoice.lines.reduce((s, l) => s + (l.total != null ? l.total : (l.unit * l.qty)), 0).toFixed(2);
    }
    const dept = (item.doctor && item.doctor.match(/\((.*?)\)/) || [, 'general practice'])[1].toLowerCase();
    const cat = QUEUE_CATALOG.find(c => dept.includes(c.match));
    return cat ? cat.price : 164;
}
function money(n) { return (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

/* ── minutes since a timestamp, as a timer badge class ── */
function timerClass(mins) {
    if (mins >= 30) return 'timer-danger';
    if (mins >= 15) return 'timer-warning';
    return 'timer-safe';
}

/* ── card builders ── */
function activeCard(item, idx) {
    const id = 'card-live-' + (item.mrn || idx);
    const docShort = shortDoc(item.doctor);
    const since = item.stage === STAGE_CONSULTATION && item.consultStartedAt ? item.consultStartedAt : item.checkedInAt;
    const mins = since ? Math.max(0, Math.floor((Date.now() - new Date(since)) / 60000)) : 0;
    const avatarClass = ['avatar-orange', 'avatar-blue', 'avatar-green'][idx % 3];

    let middle, button;
    if (item.stage === STAGE_WAITING) {
        middle = `
            <div class="detail-row"><span class="detail-label">Assigned:</span> <span class="detail-value doc-text">${docShort}</span></div>
            <div class="detail-row"><span class="detail-label">Reason:</span> <span class="detail-value">${item.reason || 'Consultation'}</span></div>`;
        button = `<button class="btn-card-action" onclick="setStage('${item.mrn}', '${STAGE_CONSULTATION}')">Send to Consultation &rarr;</button>`;
    } else if (item.stage === STAGE_CONSULTATION) {
        middle = `
            <div class="detail-row"><span class="detail-label">Doctor:</span> <span class="detail-value doc-text">${docShort}</span></div>
            <div class="detail-row"><span class="detail-label">Reason:</span> <span class="detail-value">${item.reason || 'Consultation'}</span></div>`;
        button = `<button class="btn-card-action" onclick="setStage('${item.mrn}', '${STAGE_BILLING}')">Consultation Done &rarr; Billing</button>`;
    } else { // billing
        const est = estimateAmount(item);
        middle = `
            <div class="detail-row"><span class="detail-label">Doctor:</span> <span class="detail-value doc-text">${docShort}</span></div>
            <div class="detail-row"><span class="detail-label">Amount Due:</span> <span class="detail-value">AED ${money(est)}</span></div>`;
        button = `<button class="btn-card-action btn-card-checkout" onclick="collectPayment('${item.mrn}')">Mark as Paid &amp; Complete</button>`;
    }

    const card = document.createElement('div');
    card.className = 'queue-card';
    card.id = id;
    card.setAttribute('data-physician', docShort);
    card.style.display = 'flex';
    card.innerHTML = `
        <div class="card-top">
            <div class="pt-name-wrap">
                <div class="pt-avatar-sm ${avatarClass}">${sigInitials(item.patientName)}</div>
                <div>
                    <span class="pt-name-text">${item.patientName}</span>
                    <span class="pt-mrn">${item.mrn || ''}</span>
                </div>
            </div>
            <div class="timer-badge ${timerClass(mins)}" data-minutes="${mins}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span class="time-text">${mins} m</span>
            </div>
        </div>
        <div class="card-middle">${middle}</div>
        ${button}`;
    return card;
}

function completedCard(item, idx) {
    const docShort = shortDoc(item.doctor);
    const t = item.completedAt ? new Date(item.completedAt) : null;
    const timeStr = t ? t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
    const avatarClass = ['avatar-orange', 'avatar-blue', 'avatar-green'][idx % 3];

    const card = document.createElement('div');
    card.className = 'queue-card completed-card';
    card.setAttribute('data-physician', docShort);
    card.style.display = 'flex';
    card.innerHTML = `
        <div class="card-top">
            <div class="pt-name-wrap">
                <div class="pt-avatar-sm ${avatarClass}">${sigInitials(item.patientName)}</div>
                <div>
                    <span class="pt-name-text">${item.patientName}</span>
                    <span class="pt-mrn">${item.mrn || ''}</span>
                </div>
            </div>
            <span class="paid-badge">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Paid
            </span>
        </div>
        <div class="card-middle">
            <div class="detail-row"><span class="detail-label">Doctor:</span> <span class="detail-value doc-text">${docShort}</span></div>
            <div class="detail-row"><span class="detail-label">Collected:</span> <span class="detail-value">AED ${money(item.amountPaid)}</span></div>
            <div class="detail-row"><span class="detail-label">Discharged:</span> <span class="detail-value">${timeStr}</span></div>
        </div>`;
    return card;
}

/* ── stage transitions ── */
function setStage(mrn, stage) {
    const q = qLoadQueue();
    const item = q.find(x => x.mrn === mrn);
    if (!item) return;

    // One patient per doctor at a time: block moving into Consultation if that
    // doctor is already consulting someone else.
    if (stage === STAGE_CONSULTATION) {
        const docName = shortDoc(item.doctor);
        const busy = q.find(x => x.mrn !== mrn && x.stage === STAGE_CONSULTATION && shortDoc(x.doctor) === docName);
        if (busy) {
            alert(`${docName} is already in consultation with ${busy.patientName}.\n\nSend that patient to billing before starting another consultation.`);
            return;
        }
    }

    item.stage = stage;
    if (stage === STAGE_CONSULTATION && !item.consultStartedAt) item.consultStartedAt = new Date().toISOString();
    qSaveQueue(q);

    if (stage === STAGE_CONSULTATION) logActivity(`${item.patientName} sent to Consultation`, 'by Reception');
    if (stage === STAGE_BILLING) logActivity(`${item.patientName} consultation completed → Billing`, 'by Reception');

    renderQueue();
}

function collectPayment(mrn) {
    const q = qLoadQueue();
    const idx = q.findIndex(x => x.mrn === mrn);
    if (idx === -1) return;
    const item = q[idx];

    const est = estimateAmount(item);
    const entered = prompt(`Collect payment for ${item.patientName}\n\nAmount due (AED):`, money(est));
    if (entered === null) return; // cancelled
    const amount = parseFloat(String(entered).replace(/[^0-9.]/g, '')) || 0;

    // 1) remove from the live queue
    q.splice(idx, 1);
    qSaveQueue(q);

    // 2) store in completed patients
    const completed = qLoadCompleted();
    completed.unshift({
        mrn: item.mrn,
        patientName: item.patientName,
        doctor: item.doctor,
        reason: item.reason || 'Consultation',
        amountPaid: amount,
        completedAt: new Date().toISOString()
    });
    qSaveCompleted(completed);

    // 3) reflect on the appointment: mark completed + invoice paid (keeps the
    //    Patient Record / billing figures in sync)
    const apps = qLoadAppointments();
    const app = apps.find(a => (item.id && a.id === item.id) || a.mrn === item.mrn);
    if (app) {
        app.status = 'completed';
        if (app.invoice) { app.invoice.paid = true; app.invoice.amountPaid = amount; }
        localStorage.setItem('medcore_appointments', JSON.stringify(apps));
    }

    logActivity(`${item.patientName} billed AED ${money(amount)} & discharged`, 'by Accounts');
    renderQueue();
}

/* A queue entry belongs to "today" (or has no timestamp yet). Keeps the live
   board scoped to the current day; previous days' carry-overs are pruned. */
function isTodayEntry(item) {
    if (!item.checkedInAt) return true;
    const d = new Date(item.checkedInAt);
    if (isNaN(d)) return true;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

/* ── render ── */
function renderQueue() {
    // Viewing a past day → read-only history from that day's appointments.
    if (typeof medcoreIsToday === 'function' && !medcoreIsToday()) {
        renderHistoryBoard(medcoreViewDate());
        return;
    }

    const queue = qLoadQueue().filter(isTodayEntry);
    queue.forEach(it => { if (!it.stage) it.stage = STAGE_WAITING; }); // back-compat for older items

    const lanes = {
        [STAGE_WAITING]: document.getElementById('body-waiting'),
        [STAGE_CONSULTATION]: document.getElementById('body-consultation'),
        [STAGE_BILLING]: document.getElementById('body-billing')
    };
    Object.values(lanes).forEach(el => { if (el) el.innerHTML = ''; });

    const tally = { [STAGE_WAITING]: 0, [STAGE_CONSULTATION]: 0, [STAGE_BILLING]: 0 };
    queue.forEach((item, i) => {
        const lane = lanes[item.stage] || lanes[STAGE_WAITING];
        lane.appendChild(activeCard(item, i));
        tally[item.stage] = (tally[item.stage] || 0) + 1;
    });

    // empty states
    if (tally[STAGE_WAITING] === 0) lanes[STAGE_WAITING].innerHTML = '<div class="col-empty">Waiting room is empty.</div>';
    if (tally[STAGE_CONSULTATION] === 0) lanes[STAGE_CONSULTATION].innerHTML = '<div class="col-empty">No active consultations.</div>';
    if (tally[STAGE_BILLING] === 0) lanes[STAGE_BILLING].innerHTML = '<div class="col-empty">No patients in checkout.</div>';

    // completed lane (today only)
    const completedBody = document.getElementById('body-completed');
    const completed = qLoadCompleted();
    const todayStr = new Date().toDateString();
    const todays = completed.filter(c => c.completedAt && new Date(c.completedAt).toDateString() === todayStr);
    completedBody.innerHTML = '';
    if (todays.length === 0) {
        completedBody.innerHTML = '<div class="col-empty">No completed patients yet.</div>';
    } else {
        todays.forEach((c, i) => completedBody.appendChild(completedCard(c, i)));
    }

    document.getElementById('count-waiting').innerText = tally[STAGE_WAITING];
    document.getElementById('count-consultation').innerText = tally[STAGE_CONSULTATION];
    document.getElementById('count-billing').innerText = tally[STAGE_BILLING];
    document.getElementById('count-completed').innerText = todays.length;

    filterQueue();
}

/* ── read-only history board for a past day (from that day's appointments) ── */
function historyCard(a, idx, st) {
    const docShort = shortDoc(a.doctorName);
    const avatarClass = ['avatar-orange', 'avatar-blue', 'avatar-green'][idx % 3];
    let badge;
    if (st === 'completed' || st === 'past') badge = '<span class="paid-badge">Completed</span>';
    else if (st === 'cancelled') badge = '<span class="paid-badge" style="background:var(--danger-bg); color:var(--danger);">Cancelled</span>';
    else badge = `<span class="stage-pill">${st || 'scheduled'}</span>`;

    const card = document.createElement('div');
    card.className = 'queue-card completed-card';
    card.setAttribute('data-physician', docShort);
    card.style.display = 'flex';
    card.innerHTML = `
        <div class="card-top">
            <div class="pt-name-wrap">
                <div class="pt-avatar-sm ${avatarClass}">${sigInitials(a.patientName)}</div>
                <div>
                    <span class="pt-name-text">${a.patientName}</span>
                    <span class="pt-mrn">${a.mrn || ''}</span>
                </div>
            </div>
            ${badge}
        </div>
        <div class="card-middle">
            <div class="detail-row"><span class="detail-label">Doctor:</span> <span class="detail-value doc-text">${docShort}</span></div>
            <div class="detail-row"><span class="detail-label">Reason:</span> <span class="detail-value">${a.reason || 'Consultation'}</span></div>
        </div>`;
    return card;
}

function renderHistoryBoard(date) {
    const apps = qLoadAppointments().filter(a => a.date === date);
    const lanes = {
        waiting: document.getElementById('body-waiting'),
        consultation: document.getElementById('body-consultation'),
        billing: document.getElementById('body-billing'),
        completed: document.getElementById('body-completed')
    };
    Object.values(lanes).forEach(el => { if (el) el.innerHTML = ''; });

    let scheduled = 0, completed = 0;
    apps.forEach((a, i) => {
        const st = (a.status || '').toLowerCase();
        const done = (st === 'completed' || st === 'past' || st === 'cancelled');
        lanes[done ? 'completed' : 'waiting'].appendChild(historyCard(a, i, st));
        if (done) completed++; else scheduled++;
    });

    if (!scheduled) lanes.waiting.innerHTML = '<div class="col-empty">No scheduled patients.</div>';
    // Live lanes aren't retained historically — make that explicit.
    lanes.consultation.innerHTML = '<div class="col-empty">Not recorded for past days.</div>';
    lanes.billing.innerHTML = '<div class="col-empty">Not recorded for past days.</div>';
    if (!completed) lanes.completed.innerHTML = '<div class="col-empty">No completed patients.</div>';

    document.getElementById('count-waiting').innerText = scheduled;
    document.getElementById('count-consultation').innerText = 0;
    document.getElementById('count-billing').innerText = 0;
    document.getElementById('count-completed').innerText = completed;

    filterQueue();
}

/* ── search / physician filter ──
   Filters every lane by patient name / MRN / doctor, keeps the column counts
   in sync with what's visible, and scrolls the first match into view (so a
   hit in an off-screen lane like "Completed" is actually revealed). */
function filterQueue() {
    const filterEl = document.getElementById('queuePhysicianFilter');
    const searchEl = document.getElementById('queueSearchInput');
    const filterValue = filterEl ? filterEl.value : 'all';
    const searchValue = searchEl ? searchEl.value.trim().toLowerCase() : '';
    const isSearching = searchValue !== '' || filterValue !== 'all';

    const lanes = ['waiting', 'consultation', 'billing', 'completed'];
    let firstMatch = null;

    lanes.forEach(lane => {
        const body = document.getElementById('body-' + lane);
        if (!body) return;
        const cards = body.querySelectorAll('.queue-card');
        let visible = 0;

        cards.forEach(card => {
            const doc = card.getAttribute('data-physician');
            const text = card.innerText.toLowerCase();
            const docMatch = (filterValue === 'all' || doc === filterValue);
            const searchMatch = text.includes(searchValue);
            const show = docMatch && searchMatch;
            card.style.display = show ? 'flex' : 'none';
            if (show) { visible++; if (!firstMatch) firstMatch = card; }
        });

        // Show a "no match" note in lanes that have cards but none matching.
        let note = body.querySelector('.search-empty');
        if (isSearching && cards.length > 0 && visible === 0) {
            if (!note) {
                note = document.createElement('div');
                note.className = 'col-empty search-empty';
                note.innerText = 'No match in this lane.';
                body.appendChild(note);
            }
        } else if (note) {
            note.remove();
        }

        // Reflect the filtered view in the column count.
        const countEl = document.getElementById('count-' + lane);
        if (countEl) countEl.innerText = visible;
    });

    // Reveal the first match — important when it lives in an off-screen column.
    if (searchValue && firstMatch) {
        firstMatch.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
}

/* ── adopt server-driven stage advances (e.g. the Doctor Portal completing a
   consult → Billing) ──
   The server (api.php?resource=queue) pulls portal completions and returns the
   advanced stage. We merge those FORWARD only (waiting → consultation →
   billing), so a doctor finishing a consult moves the patient into Billing here
   live, while never undoing a local reception action. */
function qPollServerStages() {
    // Only the live "today" board tracks stages; past days are read-only history.
    if (typeof medcoreIsToday === 'function' && !medcoreIsToday()) return;

    fetch('api.php?resource=queue', { headers: { 'Accept': 'application/json' } })
        .then(r => (r.ok ? r.json() : null))
        .then(server => {
            if (!Array.isArray(server)) return;
            const rank = { waiting: 0, consultation: 1, billing: 2 };
            const local = qLoadQueue();
            let changed = false;
            server.forEach(s => {
                const l = local.find(x => (s.id && x.id === s.id) || (x.mrn && x.mrn === s.mrn));
                if (!l) return;
                const ls = rank[l.stage || 'waiting'] || 0;
                const ss = rank[s.stage || 'waiting'] || 0;
                if (ss > ls) {
                    l.stage = s.stage;
                    if (s.consultStartedAt && !l.consultStartedAt) l.consultStartedAt = s.consultStartedAt;
                    changed = true;
                }
            });
            if (changed) { qSaveQueue(local); renderQueue(); }
        })
        .catch(() => { /* offline / DB down: keep the local board */ });
}

document.addEventListener('DOMContentLoaded', function () {
    renderQueue();
    qPollServerStages();
});

// Re-render every 60s so wait timers stay current and new arrivals/sends appear.
setInterval(renderQueue, 60000);

// Poll the server every 15s for portal-driven stage advances (consult → billing).
setInterval(qPollServerStages, 15000);

// Keep the board live if another tab (scheduler) changes the queue.
window.addEventListener('storage', (e) => {
    if (e.key === 'medcore_live_queue' || e.key === 'medcore_completed_patients') renderQueue();
});
