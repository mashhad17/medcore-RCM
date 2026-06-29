/* ─────────────────────────────────────────────────
   MEDCORE HMS · RECEPTION SHIFT CONTROL (backend-driven)
   Every widget reads live state from MySQL via
   api/dashboard/summary.php. No localStorage for app data.
   ───────────────────────────────────────────────── */

const DASH_POLL_MS = 10000;
let dashState = { summary: null, loaded: false };

/* ── helpers ── */
function escapeHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function shortDoc(name) { return (name || 'Unassigned').split(' (')[0]; }

/* ── metric buckets (mirror of the server logic, for the drill-down) ── */
function metricBucket(app) {
    const s = (app.status || 'scheduled').toLowerCase();
    if (s === 'cancelled') return 'cancelled';
    if (s === 'completed' || s === 'past') return 'completed';
    if (s === 'arrived' || app.inQueue) return 'checkedin';
    return 'pending';
}
function filterByMetric(apps, metric) {
    if (metric === 'total') return apps;
    return apps.filter(a => metricBucket(a) === metric);
}

const METRIC_TITLES = {
    total: 'All Appointments Today',
    checkedin: 'Checked-In Patients',
    pending: 'Pending Arrivals',
    cancelled: 'Cancelled Appointments',
    completed: 'Completed Appointments'
};
const STATUS_STYLES = {
    arrived: { bg: 'var(--success-bg)', color: 'var(--success-text)', label: 'Checked-In' },
    scheduled: { bg: 'var(--info-bg)', color: 'var(--info-text)', label: 'Scheduled' },
    warning: { bg: 'var(--warning-bg)', color: 'var(--warning-text)', label: 'Attention' },
    pending: { bg: 'var(--warning-bg)', color: 'var(--warning-text)', label: 'Pending' },
    completed: { bg: 'rgba(79,124,172,0.1)', color: 'var(--accent)', label: 'Completed' },
    past: { bg: 'rgba(79,124,172,0.1)', color: 'var(--accent)', label: 'Completed' },
    cancelled: { bg: 'var(--danger-bg)', color: 'var(--danger)', label: 'Cancelled' }
};
function fmtTime(app) {
    if (app.startHour == null) return '';
    const h = app.startHour;
    const m = String(app.startMinute || 0).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${m} ${ampm}`;
}

/* ── data fetch + render orchestration ── */
function fetchSummary() {
    const date = (typeof medcoreViewDate === 'function') ? medcoreViewDate() : null;
    const url = 'api/dashboard/summary.php' + (date ? ('?date=' + encodeURIComponent(date)) : '');
    return fetch(url, { headers: { 'Accept': 'application/json' } })
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(data => {
            if (data && data.error) throw new Error(data.error);
            dashState.summary = data;
            dashState.loaded = true;
            hideDashboardError();
            applyDateContext(data.isToday);
            renderMetrics(data.metrics);
            renderNextUp(data.nextUp, data.isToday);
            renderActivity(data.activity);
            renderProviders(data.providers);
        })
        .catch(err => {
            console.error('[dashboard] summary fetch failed:', err);
            showDashboardError();
            if (!dashState.loaded) {
                // First load failed: replace skeletons with empty/error states.
                renderNextUp(null);
                renderActivity(null);
                renderProviders(null);
            }
        });
}

function showDashboardError() {
    const el = document.getElementById('dashboardError');
    if (el) el.style.display = 'flex';
}
function hideDashboardError() {
    const el = document.getElementById('dashboardError');
    if (el) el.style.display = 'none';
}

/* ── metrics ── */
function renderMetrics(metrics) {
    const m = metrics || {};
    ['total', 'checkedin', 'pending', 'cancelled', 'completed'].forEach(k => {
        const el = document.getElementById('metric-' + k);
        if (el) el.textContent = (m[k] != null ? m[k] : 0);
    });
}

/* Adjust labels / controls for the current view date (live today vs history). */
function applyDateContext(isToday) {
    const title = document.getElementById('nextUpTitle');
    if (title) title.textContent = isToday ? 'Next Up (Waiting Room)' : 'Appointments on this day';
    const walk = document.getElementById('walkInPanel');
    if (walk) {
        walk.style.opacity = isToday ? '' : '0.5';
        walk.style.pointerEvents = isToday ? '' : 'none';
        walk.title = isToday ? '' : 'Walk-ins can only be added for today';
    }
}

/* ── Next Up (Waiting Room) / Appointments on a past day ── */
function renderNextUp(list, isToday) {
    const container = document.getElementById('miniQueueTracker');
    if (!container) return;

    if (list === null) {
        container.innerHTML = emptyRow('Could not load the waiting room.');
        return;
    }
    if (!Array.isArray(list) || list.length === 0) {
        container.innerHTML = emptyRow(isToday === false ? 'No appointments on this day' : 'Waiting room is empty');
        return;
    }

    // Past day: read-only list of that day's appointments with time + status.
    if (isToday === false) {
        container.innerHTML = list.map(a => {
            const st = (a.status || '').toLowerCase();
            let cls = 'time-green';
            if (st === 'cancelled') cls = 'time-red';
            else if (st === 'completed' || st === 'past') cls = 'time-yellow';
            return `
            <div class="queue-tracker-item">
                <div class="queue-tracker-info">
                    <div class="queue-tracker-name">${escapeHtml(a.patient_name)}</div>
                    <div class="queue-tracker-doc">${escapeHtml(a.time_label || '')} · ${escapeHtml(shortDoc(a.doctor_name))}</div>
                </div>
                <div class="queue-tracker-time ${cls}" style="text-transform:capitalize;">${escapeHtml(a.status || '')}</div>
            </div>`;
        }).join('');
        return;
    }

    container.innerHTML = list.map(q => {
        const mins = q.wait_time_minutes || 0;
        const doc = escapeHtml(shortDoc(q.doctor_name));

        // In Consultation: mirror the Live Clinic Queue instead of calling the
        // patient "Waiting". The blue badge matches that board's lane.
        if (q.stage === 'consultation') {
            return `
            <div class="queue-tracker-item">
                <div class="queue-tracker-info">
                    <div class="queue-tracker-name">${escapeHtml(q.patient_name)}</div>
                    <div class="queue-tracker-doc">In Consultation · ${doc}</div>
                </div>
                <div class="queue-tracker-time time-consult">${mins}m</div>
            </div>`;
        }

        // Billing: the doctor finished (synced from the portal) — patient is now
        // awaiting checkout/payment. Kept visible so it never silently vanishes.
        if (q.stage === 'billing') {
            return `
            <div class="queue-tracker-item">
                <div class="queue-tracker-info">
                    <div class="queue-tracker-name">${escapeHtml(q.patient_name)}</div>
                    <div class="queue-tracker-doc">Ready for Checkout · ${doc}</div>
                </div>
                <div class="queue-tracker-time time-billing">Billing</div>
            </div>`;
        }

        let timeClass = 'time-green';
        if (mins >= 15 && mins <= 29) timeClass = 'time-yellow';
        else if (mins >= 30) timeClass = 'time-red';
        return `
            <div class="queue-tracker-item">
                <div class="queue-tracker-info">
                    <div class="queue-tracker-name">${escapeHtml(q.patient_name)}</div>
                    <div class="queue-tracker-doc">Waiting for ${doc}</div>
                </div>
                <div class="queue-tracker-time ${timeClass}">${mins}m</div>
            </div>`;
    }).join('');
}

/* ── Live Shift Activity ── */
function renderActivity(list) {
    const container = document.getElementById('activityLogContainer');
    if (!container) return;

    if (list === null) {
        container.innerHTML = activityEmpty('Could not load activity.');
        return;
    }
    if (!Array.isArray(list) || list.length === 0) {
        container.innerHTML = activityEmpty('No recent activity.');
        return;
    }

    container.innerHTML = list.map(log => `
        <div class="activity-item">
            <span class="time-badge">${escapeHtml(log.time)}</span>
            <div class="activity-text">
                ${escapeHtml(log.text)} <span class="activity-author">${escapeHtml(log.author)}</span>
            </div>
        </div>
    `).join('');
}

function clearActivityLog() {
    fetch('api/activity/clear.php', { method: 'POST' })
        .then(res => res.json())
        .then(() => fetchSummary())
        .catch(err => {
            console.error('[dashboard] clear log failed:', err);
            showDashboardError();
        });
}

/* ── Provider Status Board ── */
function renderProviders(list) {
    const container = document.getElementById('providerStatusContainer');
    const summaryEl = document.getElementById('provider-status-summary');
    if (!container) return;

    if (list === null) {
        container.innerHTML = `<div style="padding:12px; color:var(--text-muted); font-size:13px;">Could not load providers.</div>`;
        if (summaryEl) summaryEl.innerHTML = '';
        return;
    }
    if (!Array.isArray(list) || list.length === 0) {
        container.innerHTML = `<div style="padding:12px; color:var(--text-muted); font-size:13px;">No active providers.</div>`;
        if (summaryEl) summaryEl.innerHTML = '';
        return;
    }

    const availableCount = list.filter(p => p.status === 'Available').length;
    if (summaryEl) {
        summaryEl.innerHTML = `<span class="pulse-dot"></span> ${availableCount} of ${list.length} Available`;
    }

    const getInitials = (name) => (name || '?').replace('Dr. ', '').trim().charAt(0).toUpperCase();

    container.innerHTML = list.map(p => {
        let dotHtml, statusClass = '', statusText = p.status;
        if (p.status === 'Available') {
            dotHtml = `<div class="pulse-dot"></div>`;
        } else {
            dotHtml = `<div class="solid-dot"></div>`;
            statusClass = 'status-neutral';
            if (p.status === 'In Consultation') statusText = 'Busy';
            if (p.status === 'Off-Shift') statusText = 'Unavailable';
        }
        return `
            <div class="provider-row" onclick="window.location.href='schedule.php'">
                <div class="provider-row-avatar">${escapeHtml(getInitials(p.name))}</div>
                <div class="provider-row-info">
                    <div class="provider-row-name">${escapeHtml(shortDoc(p.name))}</div>
                    <div class="provider-row-spec">${escapeHtml(p.dept)}</div>
                </div>
                <div class="provider-row-status ${statusClass}">
                    ${dotHtml} ${escapeHtml(statusText)}
                </div>
            </div>`;
    }).join('');
}

/* ── metric drill-down modal (from already-fetched summary) ── */
function openMetricDetail(metric) {
    const all = (dashState.summary && dashState.summary.appointments) || [];
    const apps = filterByMetric(all, metric)
        .slice()
        .sort((a, b) => (a.startHour - b.startHour) || (a.startMinute - b.startMinute));

    document.getElementById('metricModalTitle').textContent =
        `${METRIC_TITLES[metric] || 'Appointments'} (${apps.length})`;

    const body = document.getElementById('metricModalBody');
    if (!apps.length) {
        body.innerHTML = `<div class="metric-empty">No appointments in this category.</div>`;
    } else {
        body.innerHTML = apps.map(app => {
            const st = STATUS_STYLES[(app.status || 'scheduled').toLowerCase()] || STATUS_STYLES.scheduled;
            const sub = [fmtTime(app), shortDoc(app.doctorName)].filter(Boolean).join(' · ');
            return `
                <div class="metric-row" onclick="window.location.href='schedule.php'">
                    <div>
                        <div class="metric-row-name">${escapeHtml(app.patientName || 'Unknown patient')}</div>
                        <div class="metric-row-sub">${escapeHtml(sub || app.mrn || '')}</div>
                    </div>
                    <span class="metric-row-status" style="background:${st.bg}; color:${st.color};">${st.label}</span>
                </div>`;
        }).join('');
    }
    document.getElementById('metricModalBackdrop').classList.add('open');
}
function closeMetricDetail() {
    document.getElementById('metricModalBackdrop').classList.remove('open');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMetricDetail(); });

/* ── empty-state markup helpers ── */
function emptyRow(text) {
    return `<div style="text-align:center; color:var(--text-muted); font-size:13px;">${escapeHtml(text)}</div>`;
}
function activityEmpty(text) {
    return `
        <div style="text-align:center; padding:2rem 0; color:var(--text-muted); font-size:0.875rem;">
            <svg style="margin:0 auto 8px auto; opacity:0.5;" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            ${escapeHtml(text)}
        </div>`;
}

/* ── Quick Walk-In → real record via api/walkin.php ── */
function setWalkInMessage(text, kind) {
    const el = document.getElementById('walkin-message');
    if (!el) return;
    if (!text) { el.style.display = 'none'; el.textContent = ''; return; }
    el.style.display = 'block';
    el.textContent = text;
    el.style.color = kind === 'error' ? 'var(--danger)' : 'var(--success-text)';
}

window.processWalkIn = function () {
    const nameEl = document.getElementById('walkin-name');
    const phoneEl = document.getElementById('walkin-phone');
    const doctorEl = document.getElementById('walkin-doctor');
    const btn = document.querySelector('.widget-btn');
    if (!nameEl || !phoneEl || !doctorEl) return;

    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();
    const doctor = doctorEl.value;

    // Client-side validation (server re-validates).
    setWalkInMessage('', null);
    if (!name) { setWalkInMessage('Please enter the patient name.', 'error'); nameEl.focus(); return; }
    const digits = (phone.match(/\d/g) || []).length;
    if (!phone || digits < 7 || !/^[0-9+\-\s]+$/.test(phone)) {
        setWalkInMessage('Please enter a valid phone number.', 'error'); phoneEl.focus(); return;
    }

    const originalText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    fetch('api/walkin.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, doctor })
    })
        .then(res => res.json().then(j => ({ ok: res.ok, body: j })))
        .then(({ ok, body }) => {
            if (!ok || !body.ok) throw new Error(body && body.error ? body.error : 'Walk-in failed.');
            nameEl.value = '';
            phoneEl.value = '';
            doctorEl.value = 'Dr. Mohammed (General Practice)';
            setWalkInMessage('Patient sent to the waiting room ✓', 'ok');
            if (btn) {
                btn.textContent = 'Sent ✓';
                btn.style.background = 'var(--success-text)';
            }
            return fetchSummary();
        })
        .catch(err => {
            console.error('[dashboard] walk-in failed:', err);
            setWalkInMessage(err.message || 'Walk-in failed. Please try again.', 'error');
        })
        .finally(() => {
            setTimeout(() => {
                if (btn) { btn.disabled = false; btn.textContent = originalText; btn.style.background = ''; }
            }, 1500);
        });
};

/* ── boot ── */
window.addEventListener('load', () => {
    fetchSummary();
    setInterval(fetchSummary, DASH_POLL_MS);
});
