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
    if (metric === 'checkedin') {
        const queue = JSON.parse(localStorage.getItem('medcore_live_queue')) || [];
        const queuedMrns = new Set(queue.map(q => q.mrn).filter(Boolean));
        return apps.filter(a => metricBucket(a) === 'checkedin' || (a.mrn && queuedMrns.has(a.mrn)));
    }
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

function updateMetricCounts() {
    const apps = getTodayAppointments();
    const queue = JSON.parse(localStorage.getItem('medcore_live_queue')) || [];
    const queuedMrns = new Set(queue.map(q => q.mrn).filter(Boolean));

    const appMrns = new Set();
    const counts = { total: apps.length, checkedin: 0, pending: 0, cancelled: 0, completed: 0 };

    apps.forEach(a => {
        if (a.mrn) appMrns.add(a.mrn);
        let b = metricBucket(a);
        // Patient physically in the waiting room → always count as checked-in,
        // even if the appointment status hasn't synced to DB yet.
        if (b === 'pending' && a.mrn && queuedMrns.has(a.mrn)) b = 'checkedin';
        if (counts[b] !== undefined) counts[b]++;
    });

    // Walk-in queue entries that have no matching appointment (edge case)
    queue.forEach(q => {
        if (q.mrn && !appMrns.has(q.mrn)) {
            counts.total++;
            counts.checkedin++;
        }
    });

    ['total', 'checkedin', 'pending', 'cancelled', 'completed'].forEach(k => {
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

function renderProviderStatus() {
    const container = document.getElementById('providerStatusContainer');
    if (!container) return;

    if (typeof window.getRealTimeProviderStatus === 'function') {
        const providers = window.getRealTimeProviderStatus();
        
        const availableCount = providers.filter(p => p.status === 'Available').length;
        const totalCount = providers.length;
        const summaryEl = document.getElementById('provider-status-summary');
        if (summaryEl) {
            summaryEl.innerHTML = `<span class="pulse-dot"></span> ${availableCount} of ${totalCount} Available`;
        }

        const getInitials = (name) => {
            const clean = name.replace('Dr. ', '').trim();
            return clean.charAt(0).toUpperCase();
        };

        container.innerHTML = providers.map(p => {
            let dotHtml = '';
            let statusClass = '';
            let statusText = p.status;
            
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
                    <div class="provider-row-avatar">${getInitials(p.name)}</div>
                    <div class="provider-row-info">
                        <div class="provider-row-name">${p.name.split(' (')[0]}</div>
                        <div class="provider-row-spec">${p.dept}</div>
                    </div>
                    <div class="provider-row-status ${statusClass}">
                        ${dotHtml} ${statusText}
                    </div>
                </div>
            `;
        }).join('');
    }
}

function pollMiniQueueTracker() {
    fetch('api/queue/top-waiting.php')
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('miniQueueTracker');
            if (!container) return;
            
            if (!Array.isArray(data) || data.length === 0) {
                container.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 13px;">Waiting room is empty</div>';
                return;
            }

            container.innerHTML = data.map(q => {
                let timeClass = 'time-green';
                if (q.wait_time_minutes >= 15 && q.wait_time_minutes <= 29) timeClass = 'time-yellow';
                else if (q.wait_time_minutes >= 30) timeClass = 'time-red';

                return `
                    <div class="queue-tracker-item">
                        <div class="queue-tracker-info">
                            <div class="queue-tracker-name">${q.patient_name}</div>
                            <div class="queue-tracker-doc">Waiting for ${q.doctor_name.split(' (')[0]}</div>
                        </div>
                        <div class="queue-tracker-time ${timeClass}">${q.wait_time_minutes}m</div>
                    </div>
                `;
            }).join('');
        })
        .catch(err => {
            console.error('Failed to poll mini queue tracker', err);
            const container = document.getElementById('miniQueueTracker');
            if (container && container.innerHTML.includes('Loading')) {
                container.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 13px;">Waiting room is empty</div>';
            }
        });
}

window.onload = () => {
    renderActivityLog();
    updateMetricCounts();
    renderProviderStatus();
    pollMiniQueueTracker();
    // Auto-refresh the dashboard logs every 5 seconds to capture actions from other tabs
    setInterval(renderActivityLog, 5000);
    setInterval(updateMetricCounts, 5000);
    setInterval(renderProviderStatus, 5000);
    setInterval(pollMiniQueueTracker, 60000);
};

window.processWalkIn = function() {
    const nameEl = document.getElementById('walkin-name');
    const phoneEl = document.getElementById('walkin-phone');
    const doctorEl = document.getElementById('walkin-doctor');
    
    if (!nameEl || !phoneEl || !doctorEl) return;
    
    const name = nameEl.value.trim();
    const phone = phoneEl.value.trim();
    const doctor = doctorEl.value;

    if (!name || !phone) {
        alert("Please enter patient name and phone number.");
        return;
    }

    const apps = JSON.parse(localStorage.getItem('medcore_appointments') || '[]');
    const queue = JSON.parse(localStorage.getItem('medcore_live_queue') || '[]');
    const logs = JSON.parse(localStorage.getItem('medcore_activity_log') || '[]');

    const mrn = 'MRN-' + Math.floor(100000 + Math.random() * 900000);
    const appId = 'APP-' + Math.floor(100000 + Math.random() * 900000);

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    const newApp = {
        id: appId,
        mrn: mrn,
        patientName: name,
        phone: phone,
        doctorName: doctor,
        date: todayStr,
        startHour: now.getHours(),
        startMinute: now.getMinutes(),
        duration: 15,
        status: 'arrived',
        billingMode: 'Cash',
        reason: 'Walk-in Fast Track',
        clinicalProfile: { incomplete: true }
    };

    apps.push(newApp);
    localStorage.setItem('medcore_appointments', JSON.stringify(apps));

    const newQueueItem = {
        id: appId,
        mrn: mrn,
        patientName: name,
        doctor: doctor,
        reason: 'Walk-in Fast Track',
        checkedInAt: new Date().toISOString()
    };

    queue.push(newQueueItem);
    localStorage.setItem('medcore_live_queue', JSON.stringify(queue));

    logs.unshift({
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Walk-in patient ${name} routed to ${doctor.split(' (')[0]}`,
        author: 'Reception'
    });
    if (logs.length > 50) logs.pop();
    localStorage.setItem('medcore_activity_log', JSON.stringify(logs));

    if (typeof updateMetricCounts === 'function') updateMetricCounts();
    if (typeof renderActivityLog === 'function') renderActivityLog();
    if (typeof renderProviderStatus === 'function') renderProviderStatus();

    nameEl.value = '';
    phoneEl.value = '';
    doctorEl.value = 'Dr. Mohammed (General Practice)';
    
    const btn = document.querySelector('.widget-btn');
    if (btn) {
        const originalText = btn.textContent;
        btn.textContent = 'Sent to Waiting Room \u2713';
        btn.style.background = 'var(--success-bg)';
        btn.style.color = 'var(--success-text)';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
            btn.style.color = '';
        }, 2000);
    }
};