/* ─────────────────────────────────────────────────
   MEDCORE HMS · DASHBOARD LOGIC (DYNAMIC AUDIT TRAIL)
   ───────────────────────────────────────────────── */

function renderActivityLog() {
    const logContainer = document.getElementById('activityLogContainer');
    const logs = JSON.parse(localStorage.getItem('medcore_activity_log')) || [];

    if (logs.length === 0) {
        logContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem 0; color: var(--text-muted); font-size: 0.875rem;">
                <svg style="margin: 0 auto 8px auto; opacity: 0.5;" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                No recent activity.
            </div>
        `;
        return;
    }

    // Map through the global ledger and build the UI
    logContainer.innerHTML = logs.map(log => `
        <div class="activity-item">
            <span class="time-badge">${log.time}</span>
            <div class="activity-text">
                ${log.text} <span class="activity-author">${log.author}</span>
            </div>
        </div>
    `).join('');
}

function clearActivityLog() {
    // Clear the immutable ledger and refresh the UI
    localStorage.removeItem('medcore_activity_log');
    renderActivityLog();
}

/* ─────────────────────────────────────────────────
   CLICKABLE METRIC CARDS · LIVE STATUS BREAKDOWN
   ───────────────────────────────────────────────── */

function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTodayAppointments() {
    const all = JSON.parse(localStorage.getItem('medcore_appointments')) || [];
    const key = todayKey();
    const todays = all.filter(a => a.date === key);
    // Fall back to everything if no rows are keyed to today (keeps the cards useful
    // even when the demo data sits on another date).
    return todays.length ? todays : all;
}

// Which metric bucket an appointment belongs to.
function metricBucket(app) {
    const s = (app.status || 'scheduled').toLowerCase();
    if (s === 'arrived') return 'checkedin';
    if (s === 'cancelled') return 'cancelled';
    if (s === 'completed' || s === 'past') return 'completed';
    return 'pending'; // scheduled / warning / pending / anything else
}

function filterByMetric(apps, metric) {
    if (metric === 'total') return apps;
    return apps.filter(a => metricBucket(a) === metric);
}

const METRIC_TITLES = {
    total: 'All Appointments Today',
    checkedin: 'Checked-In Patients',
    pending: 'Pending Arrivals',
    cancelled: 'Cancelled Appointments'
};

const STATUS_STYLES = {
    arrived: { bg: 'var(--success-bg)', color: 'var(--success-text)', label: 'Checked-In' },
    scheduled: { bg: 'var(--info-bg)', color: 'var(--info-text)', label: 'Scheduled' },
    warning: { bg: 'var(--warning-bg)', color: 'var(--warning-text)', label: 'Attention' },
    pending: { bg: 'var(--warning-bg)', color: 'var(--warning-text)', label: 'Pending' },
    completed: { bg: 'var(--bg-aesthetic)', color: 'var(--text-muted)', label: 'Completed' },
    past: { bg: 'var(--bg-aesthetic)', color: 'var(--text-muted)', label: 'Completed' },
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

function updateMetricCounts() {
    const apps = getTodayAppointments();
    const counts = { total: apps.length, checkedin: 0, pending: 0, cancelled: 0 };
    apps.forEach(a => {
        const b = metricBucket(a);
        if (counts[b] !== undefined) counts[b]++;
    });
    ['total', 'checkedin', 'pending', 'cancelled'].forEach(k => {
        const el = document.getElementById('metric-' + k);
        if (el) el.textContent = counts[k];
    });
}

function openMetricDetail(metric) {
    const apps = filterByMetric(getTodayAppointments(), metric)
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
            const time = fmtTime(app);
            const doc = app.doctorName || '';
            const sub = [time, doc].filter(Boolean).join(' · ');
            return `
                <div class="metric-row" onclick="window.location.href='schedule.php'">
                    <div>
                        <div class="metric-row-name">${app.patientName || 'Unknown patient'}</div>
                        <div class="metric-row-sub">${sub || (app.mrn || '')}</div>
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

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMetricDetail();
});

window.onload = () => {
    renderActivityLog();
    updateMetricCounts();
    // Auto-refresh the dashboard logs every 5 seconds to capture actions from other tabs
    setInterval(renderActivityLog, 5000);
    setInterval(updateMetricCounts, 5000);
};