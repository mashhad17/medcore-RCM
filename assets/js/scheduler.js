/* ─────────────────────────────────────────────────
   MEDCORE HMS · SCHEDULER LOGIC (SMART IDENTITY + REAL-TIME SYNC)
   ───────────────────────────────────────────────── */

const GRID_START_HOUR = 8;
const GRID_END_HOUR = 23; // clinic day runs 8 AM → 11 PM
const PIXELS_PER_HOUR = 120;

let displayMonthDate = new Date();
let selectedDate = new Date();
const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

/* ── 1. CALENDAR NAVIGATION ── */
function renderCalendar() {
    const monthYearText = document.getElementById('calendar-month-year');
    const grid = document.getElementById('calendar-days-grid');
    const year = displayMonthDate.getFullYear();
    const month = displayMonthDate.getMonth();

    monthYearText.textContent = `${monthNames[month]} ${year}`;
    grid.innerHTML = `<div class="calendar-day-name">S</div><div class="calendar-day-name">M</div><div class="calendar-day-name">T</div><div class="calendar-day-name">W</div><div class="calendar-day-name">T</div><div class="calendar-day-name">F</div><div class="calendar-day-name">S</div>`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    for (let i = firstDayIndex - 1; i >= 0; i--) {
        grid.innerHTML += `<div class="calendar-date faded" onclick="changeMonth(-1)">${prevMonthDays - i}</div>`;
    }
    for (let i = 1; i <= daysInMonth; i++) {
        const isSelected = i === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear();
        const activeClass = isSelected ? 'active' : '';
        grid.innerHTML += `<div class="calendar-date ${activeClass}" onclick="selectDate(${year}, ${month}, ${i})">${i}</div>`;
    }
    const remainingCells = 42 - (firstDayIndex + daysInMonth);
    for (let i = 1; i <= remainingCells; i++) {
        grid.innerHTML += `<div class="calendar-date faded" onclick="changeMonth(1)">${i}</div>`;
    }
}

function changeMonth(offset) {
    displayMonthDate.setMonth(displayMonthDate.getMonth() + offset);
    renderCalendar();
}

function selectDate(year, month, day) {
    selectedDate = new Date(year, month, day);
    displayMonthDate = new Date(year, month, 1);
    renderCalendar();

    // Keep the header date-nav input in sync with calendar clicks.
    const vi = document.getElementById('viewDate');
    if (vi) vi.value = formatDateKey(selectedDate);

    document.getElementById('header-date-text').textContent = `${shortMonths[month]} ${day}, ${year}`;
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    document.getElementById('panel-date-input').value = formattedDate;

    renderAppointmentsForDate(formattedDate);
    updateTimeIndicator();
}

/* ── 2. GRID STRUCTURE ── */
function buildGridStructure() {
    const timeAxisContainer = document.getElementById('time-axis-container');
    const horizontalLines = document.getElementById('horizontal-lines');
    const timeSelect = document.getElementById('panel-time-input');
    timeSelect.innerHTML = '';

    for (let i = GRID_START_HOUR; i <= GRID_END_HOUR; i++) {
        const topPosition = (i - GRID_START_HOUR) * PIXELS_PER_HOUR;
        let hourStr = i > 12 ? (i - 12) + ':00 PM' : i + ':00 AM';
        let halfHourStr = i > 12 ? (i - 12) + ':30 PM' : i + ':30 AM';
        if (i === 12) { hourStr = '12:00 PM'; halfHourStr = '12:30 PM'; }

        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-slot-label';
        timeLabel.style.top = topPosition + 'px';
        timeLabel.innerText = hourStr;
        timeAxisContainer.appendChild(timeLabel);

        const hourLine = document.createElement('div');
        hourLine.className = 'hour-line';
        hourLine.style.top = topPosition + 'px';
        horizontalLines.appendChild(hourLine);

        timeSelect.innerHTML += `<option value="${hourStr}">${hourStr}</option>`;

        if (i < GRID_END_HOUR) {
            const halfHourLine = document.createElement('div');
            halfHourLine.className = 'half-hour-line';
            halfHourLine.style.top = (topPosition + (PIXELS_PER_HOUR / 2)) + 'px';
            horizontalLines.appendChild(halfHourLine);
            timeSelect.innerHTML += `<option value="${halfHourStr}">${halfHourStr}</option>`;
        }
    }
}

function updateTimeIndicator() {
    const indicator = document.getElementById('current-time-indicator');
    if (!indicator) return null;

    const now = new Date();
    const todayStr = formatDateKey(now);
    const selectedStr = formatDateKey(selectedDate);

    if (selectedStr !== todayStr) {
        indicator.style.display = 'none';
        return null;
    }

    indicator.style.display = 'flex';
    let hours = now.getHours();
    let minutes = now.getMinutes();

    if (hours < GRID_START_HOUR) { hours = GRID_START_HOUR; minutes = 0; }
    if (hours > GRID_END_HOUR) { hours = GRID_END_HOUR; minutes = 0; }

    const topPixels = ((hours - GRID_START_HOUR) * PIXELS_PER_HOUR) + (minutes * (PIXELS_PER_HOUR / 60));
    indicator.style.top = topPixels + 'px';

    return topPixels;
}

function smartAutoScroll() {
    const currentPixels = updateTimeIndicator();
    const scrollContainer = document.getElementById('grid-scroll-container');
    if (currentPixels !== null) scrollContainer.scrollTop = currentPixels - (scrollContainer.clientHeight / 2);
    else scrollContainer.scrollTop = 0;
}

/* ── 3. BACKGROUND DATA AUTOMATION & MOCK DB ── */
let appointments = [];
let activeAppointmentId = null;
const doctorColumns = ['Dr. Mohammed (General Practice)', 'Dr. Fatima (Dental Surgery)', 'Dr. Roger (Dermatology)', 'Dr. Sarah (Pediatrics)', 'Dr. Ali (Orthopedics)'];

function forceTimeIntegrity() {
    const now = new Date();
    let updated = false;

    appointments.forEach(app => {
        if (app.status === 'cancelled' || app.status === 'completed') return;

        const appDateParts = app.date.split('-');
        const endTime = new Date(appDateParts[0], appDateParts[1] - 1, appDateParts[2], app.startHour, app.startMinute + app.duration);

        if (now >= endTime) {
            app.status = 'completed';
            updated = true;
            removeFromLiveQueue(app.mrn);
        }
    });
    if (updated) localStorage.setItem('medcore_appointments', JSON.stringify(appointments));
}

function removeFromLiveQueue(mrn) {
    let queue = JSON.parse(localStorage.getItem('medcore_live_queue')) || [];
    const initialLength = queue.length;
    queue = queue.filter(q => q.mrn !== mrn);
    if (queue.length !== initialLength) localStorage.setItem('medcore_live_queue', JSON.stringify(queue));
}

function initAppointments() {
    // ── SMART CACHE OVERRIDE FOR VISIT HISTORY SYNC ──
    if (!localStorage.getItem('medcore_v9_visit_history_sync')) {
        localStorage.removeItem('medcore_appointments');
        localStorage.setItem('medcore_v9_visit_history_sync', 'true');
    }

    const stored = localStorage.getItem('medcore_appointments');
    if (stored && JSON.parse(stored).length > 0) {
        appointments = JSON.parse(stored);
    } else if (typeof medcoreDefaultAppointments === 'function') {
        appointments = medcoreDefaultAppointments(formatDateKey(new Date()));
        localStorage.setItem('medcore_appointments', JSON.stringify(appointments));
    } else {
        appointments = [];
    }
}

function getColIndexForDoctor(docName) { return doctorColumns.indexOf(docName); }
function formatDateKey(dateObj) { return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`; }
function parseTimeString(timeStr) {
    const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (!match) return { hour: 9, minute: 0 };
    let hour = parseInt(match[1]); const minute = parseInt(match[2]); const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return { hour, minute };
}

function getAppointmentsForDate(dateString) {
    let list = appointments.filter(app => app.date === dateString);
    const dateKey = `initialized_${dateString}`;

    if (list.length === 0 && !localStorage.getItem(dateKey)) {
        const dateObj = new Date(dateString); const day = dateObj.getDate(); let mockList = [];
        const todayStr = formatDateKey(new Date());

        if (dateString === todayStr) {
            // Handled by init
        } else if (day % 2 === 0) {
            mockList = [{
                id: `app-mock-${dateString}-1`, patientName: 'Sara Khan', mrn: 'MRN-2026-0006', nid: '784-1995-663829-2', phone: '+971 50 765 4321', resident: 'yes', doctorName: 'Dr. Fatima (Dental Surgery)', colIndex: 1, date: dateString, startHour: 9, startMinute: 0, duration: 45, reason: 'Dental Exam and scale.', status: 'scheduled',
                clinicalProfile: {
                    bloodGroup: "A-", allergies: ["Ibuprofen"], conditions: ["Hypertension"],
                    vitals: { date: "May 10, 2026", bp: "140/90", hr: "78 bpm", weight: "65 kg" },
                    encounters: [
                        { date: "May 10, 2026", diagnosis: "Dental Checkup", status: "Completed", doctor: "Dr. Fatima", dept: "Dental Surgery" }
                    ],
                    packages: [
                        { name: "Daman (Thiqa Plan)", activationDate: "Jan 01, 2026", expiryDate: "Dec 31, 2026", usage: "Unlimited", status: "Active" }
                    ]
                }
            }];
        } else {
            mockList = [{
                id: `app-mock-${dateString}-1`, patientName: 'Ameem Siddiqui', mrn: 'MRN-2026-0008', nid: '784-1997-223344-9', phone: '+971 56 889 9000', resident: 'yes', doctorName: 'Dr. Roger (Dermatology)', colIndex: 2, date: dateString, startHour: 15, startMinute: 0, duration: 30, reason: 'Acne Consultation and Prescription Refill.', status: 'scheduled',
                clinicalProfile: {
                    bloodGroup: "B+", allergies: ["Latex"], conditions: ["None reported"],
                    vitals: { date: "Jun 01, 2026", bp: "118/75", hr: "68 bpm", weight: "72 kg" },
                    encounters: [
                        { date: "Jun 01, 2026", diagnosis: "Minor Wrist Fracture", status: "Resolved", doctor: "Dr. Ali", dept: "Orthopedics" },
                        { date: "Feb 14, 2025", diagnosis: "General Checkup", status: "Completed", doctor: "Dr. Mohammed", dept: "General Practice" }
                    ],
                    packages: [
                        { name: "DHA Essential Benefits Plan (EBP)", activationDate: "Mar 15, 2025", expiryDate: "Mar 14, 2026", usage: "General: 3 / 5 Visits", status: "Expired" },
                        { name: "GIG Gulf Comprehensive Care", activationDate: "Mar 15, 2026", expiryDate: "Mar 14, 2027", usage: "Unlimited", status: "Active" }
                    ],
                    items: [
                        { date: "Jun 01, 2026", description: "Topical Hydrocortisone Cream 1%", qty: "1 Tube", dept: "Dermatology" },
                        { date: "Feb 14, 2025", description: "Disposable Examination Gloves", qty: "1 Pack", dept: "General Practice" }
                    ]
                }
            }];
        }

        appointments.push(...mockList);
        localStorage.setItem('medcore_appointments', JSON.stringify(appointments));
        localStorage.setItem(dateKey, 'true');
    }
    return appointments.filter(app => app.date === dateString);
}

/* ── 4. TIMELINE RENDERING ── */
const DOCTOR_COLUMN_ACCENTS = ['#4F7CAC', '#0EA5E9', '#8B5CF6', '#EC4899', '#F59E0B'];

function renderGridHeaders() {
    if (typeof window.getRealTimeProviderStatus === 'function') {
        const providers = window.getRealTimeProviderStatus();
        providers.forEach((p, index) => {
            const headerCol = document.getElementById(`doc-header-${index}`);
            if (headerCol) {
                const accent = DOCTOR_COLUMN_ACCENTS[index % DOCTOR_COLUMN_ACCENTS.length];
                const shortName = p.name.split(' (')[0];
                const initials = shortName.replace(/^dr\.?\s*/i, '').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
                headerCol.style.setProperty('--col-accent', accent);
                headerCol.innerHTML = `
                    <div class="doc-avatar">${initials || 'DR'}</div>
                    <div class="doctor-name">${shortName}</div>
                    <div class="doctor-spec">${p.dept}</div>
                    <div class="doc-status-pill">
                        <span class="status-dot ${p.dotClass}"></span> ${p.status}
                    </div>
                `;
            }
        });
    }
}

function renderAppointmentsForDate(dateString) {
    getAppointmentsForDate(dateString);
    forceTimeIntegrity();
    renderGridHeaders();

    for (let i = 0; i < 5; i++) { const col = document.getElementById(`col-${i}`); if (col) col.innerHTML = ''; }

    const dailyApps = appointments.filter(app => app.date === dateString);

    // Patients currently sitting in the live waiting queue
    const queuedMrns = new Set((JSON.parse(localStorage.getItem('medcore_live_queue')) || []).map(q => q.mrn));

    dailyApps.forEach(app => {
        const column = document.getElementById(`col-${app.colIndex}`); if (!column) return;
        const topPixels = ((app.startHour - GRID_START_HOUR) * PIXELS_PER_HOUR) + (app.startMinute * (PIXELS_PER_HOUR / 60));
        const heightPixels = app.duration * (PIXELS_PER_HOUR / 60);
        const block = document.createElement('div');

        let statusClass = 'app-status-scheduled';
        if (app.status === 'arrived') statusClass = 'app-status-arrived';
        else if (app.status === 'warning') statusClass = 'app-status-warning';
        else if (app.status === 'completed' || app.status === 'past') statusClass = 'app-status-completed';
        else if (app.status === 'cancelled') statusClass = 'app-status-cancelled';

        // Confirmation status (set via the "More Action" menu) overrides the box colour
        const confirmClass = app.confirmStatus ? `app-confirm-${app.confirmStatus}` : '';

        // Patient sent to the waiting queue → striped magenta frame
        const queueClass = queuedMrns.has(app.mrn) ? 'app-in-queue' : '';

        block.className = `appointment-block ${statusClass} ${confirmClass} ${queueClass}`.trim(); block.style.top = topPixels + 'px'; block.style.height = heightPixels + 'px';
        block.innerHTML = `<div class="app-title">${app.patientName}</div><div class="app-detail">${app.reason}</div>
            <button class="app-more-btn" title="More Action">&#8942;</button>`;
        block.onclick = (e) => { e.stopPropagation(); openQuickView(app.id); };
        block.querySelector('.app-more-btn').onclick = (e) => openConfirmMenu(e, app.id);
        column.appendChild(block);
    });
}

/* ── APPOINTMENT CONFIRMATION · "MORE ACTION" MENU ── */
const CONFIRM_OPTIONS = [
    { key: 'confirmed',   label: 'Confirm Appointment', color: 'var(--success-text)' },
    { key: 'unreachable', label: 'Call Not Reachable',  color: '#F97316' },
    { key: 'cancelled',   label: 'Cancel Appointment',  color: 'var(--danger)' },
    { key: 'pending',     label: 'Yet To Confirm',      color: '#EAB308' }
];

function getConfirmMenu() {
    let menu = document.getElementById('appt-action-menu');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'appt-action-menu';
        menu.className = 'action-menu';
        menu.innerHTML = '<div class="action-menu-title">More Action</div>' +
            CONFIRM_OPTIONS.map(o =>
                `<div class="action-menu-item" data-key="${o.key}">
                    <span class="action-dot" style="background:${o.color};"></span>${o.label}
                 </div>`).join('');
        document.body.appendChild(menu);

        // Close when clicking anywhere outside the menu
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target)) menu.style.display = 'none';
        });
    }
    return menu;
}

function openConfirmMenu(event, appId) {
    event.stopPropagation();
    const menu = getConfirmMenu();
    const app = appointments.find(a => a.id === appId);

    // Wire each option to this specific appointment + mark the current one
    menu.querySelectorAll('.action-menu-item').forEach(item => {
        item.classList.toggle('is-active', !!app && app.confirmStatus === item.dataset.key);
        item.onclick = (e) => {
            e.stopPropagation();
            setConfirmStatus(appId, item.dataset.key);
            menu.style.display = 'none';
        };
    });

    // Show then position relative to the trigger button
    menu.style.display = 'block';
    const rect = event.currentTarget.getBoundingClientRect();
    let left = rect.right - menu.offsetWidth;
    let top = rect.bottom + 4;
    if (left < 8) left = 8;
    if (top + menu.offsetHeight > window.innerHeight - 8) top = rect.top - menu.offsetHeight - 4;
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
}

function setConfirmStatus(appId, key) {
    const app = appointments.find(a => a.id === appId);
    if (!app) return;

    app.confirmStatus = key;

    const labelMap = {
        confirmed: 'confirmed',
        unreachable: 'marked Not Reachable',
        cancelled: 'cancelled',
        pending: 'set to Yet To Confirm'
    };

    // Cancelling here also drives the existing lifecycle (drops from live queue)
    if (key === 'cancelled') {
        app.status = 'cancelled';
        removeFromLiveQueue(app.mrn);
    }

    localStorage.setItem('medcore_appointments', JSON.stringify(appointments));
    logActivity(`${app.patientName} appointment ${labelMap[key]}`, 'by Reception');
    renderAppointmentsForDate(formatDateKey(selectedDate));

    // Keep an open quick-view card in sync
    if (document.getElementById('quickViewModal').classList.contains('open')) openQuickView(appId);
}

/* Generate an MRN that is not already used by any patient on record, so two
   different patients can never share one (which previously cross-matched the
   queue / consultation state by MRN). */
function generateUniqueMrn() {
    const year = new Date().getFullYear();
    const existing = new Set((appointments || []).map(a => a.mrn).filter(Boolean));
    for (let i = 0; i < 50; i++) {
        const mrn = 'MRN-' + year + '-' + String(Math.floor(1000 + Math.random() * 9000));
        if (!existing.has(mrn)) return mrn;
    }
    // Extremely unlikely fallback — guarantee uniqueness with a timestamp tail.
    return 'MRN-' + year + '-' + Date.now().toString().slice(-6);
}

/* ── LIVE QUEUE HELPER ── */
/* Find a patient's live-queue entry. Prefer the appointment id (always unique)
   so a duplicate/clashing MRN can never cross-match a different patient; fall
   back to MRN only for older entries that predate id tracking. */
function findQueueItem(app) {
    const queue = JSON.parse(localStorage.getItem('medcore_live_queue')) || [];
    return queue.find(q => (q.id && app.id) ? q.id === app.id : (!!q.mrn && q.mrn === app.mrn)) || null;
}

function isInQueue(app) {
    return !!findQueueItem(app);
}

function addToLiveQueue(app) {
    let queue = JSON.parse(localStorage.getItem('medcore_live_queue')) || [];
    if (findQueueItem(app)) return;
    queue.push({
        id: app.id,
        mrn: app.mrn,
        patientName: app.patientName,
        doctor: app.doctorName,
        reason: app.reason,
        checkedInAt: new Date().toISOString(),
        stage: 'waiting'   // Waiting Room → Consultation → Billing → Completed
    });
    localStorage.setItem('medcore_live_queue', JSON.stringify(queue));
}

/* Returns the patient (queue item) a doctor is currently consulting, if any —
   i.e. a live-queue item at stage 'consultation' for that doctor, other than
   the patient we're checking for. Used to enforce one-patient-at-a-time. */
function getDoctorConsultationPatient(doctorName, exceptMrn, exceptId) {
    if (!doctorName) return null;
    const docShort = doctorName.split(' (')[0].trim();
    const queue = JSON.parse(localStorage.getItem('medcore_live_queue')) || [];
    return queue.find(q => q.stage === 'consultation'
        && !(exceptId && q.id && q.id === exceptId)
        && q.mrn !== exceptMrn
        && (q.doctor || '').split(' (')[0].trim() === docShort) || null;
}

/* Move a live-queue patient into a different stage (used when reception sends
   the consultation to the doctor → the patient appears In Consultation). */
function setLiveQueueStage(mrn, stage) {
    let queue = JSON.parse(localStorage.getItem('medcore_live_queue')) || [];
    const item = queue.find(q => q.mrn === mrn);
    if (!item) return;
    item.stage = stage;
    if (stage === 'consultation' && !item.consultStartedAt) item.consultStartedAt = new Date().toISOString();
    localStorage.setItem('medcore_live_queue', JSON.stringify(queue));
}

/* ── APPOINTMENT QUICK-VIEW CARD ── */
function calcAge(dobStr) {
    if (!dobStr) return '';
    const dob = new Date(dobStr);
    if (isNaN(dob)) return '';
    const now = new Date();
    let years = now.getFullYear() - dob.getFullYear();
    let months = now.getMonth() - dob.getMonth();
    if (now.getDate() < dob.getDate()) months--;
    if (months < 0) { years--; months += 12; }
    return `${years}y ${months}m`;
}

function nowStamp() {
    const d = new Date();
    let h = d.getHours(); const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(h).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${ampm}`;
}

function formatApptTimeRange(app) {
    const to12 = (h, m) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hr = h % 12 || 12;
        return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
    };
    let endTotal = app.startHour * 60 + app.startMinute + (app.duration || 0);
    return `${to12(app.startHour, app.startMinute)} - ${to12(Math.floor(endTotal / 60) % 24, endTotal % 60)}`;
}

function openQuickView(appId) {
    const app = appointments.find(a => a.id === appId);
    if (!app) return;
    activeAppointmentId = appId;

    const profile = app.clinicalProfile || null;
    const pkg = profile && profile.packages && profile.packages.length ? profile.packages[profile.packages.length - 1] : null;
    const visitType = (profile && profile.encounters && profile.encounters.length) ? 'Revisit Patient' : 'New Patient';
    const age = calcAge(app.dob);
    const idText = app.nid ? `Emirates Id / ${app.nid}` : 'Not on file';
    const itemsText = (profile && profile.items && profile.items.length)
        ? profile.items.map(i => i.description).join(', ')
        : (app.reason || 'No items recorded');

    const confirmVal = app.confirmStatus || 'pending';
    const visitVal = (app.status === 'past') ? 'completed' : app.status;

    // ── Consultation workflow state ──
    // Step 1: patient must be added to the live queue.
    // Step 2: only then can the consultation be sent to the doctor portal.
    // Step 3: doctor picks it up and starts the consultation.
    // Read the patient's live-queue item so the modal reflects the SAME state
    // the Live Clinic Queue shows — whether they were sent from here or moved
    // into Consultation on the queue board.
    const queueItem     = findQueueItem(app);
    const queueStage    = queueItem ? (queueItem.stage || 'waiting') : null;
    const inQueue       = !!queueItem;
    const inConsultation = queueStage === 'consultation' || queueStage === 'billing';
    const sentToDoctor  = !!app.sentToDoctor || inConsultation;
    const docFull       = app.doctorName || 'Unassigned';
    const docName       = docFull.split(' (')[0];
    const docDept       = (docFull.match(/\((.*?)\)/) || [, 'General'])[1];
    const initials      = (app.patientName || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();

    // Consultation is finished once the visit is completed AND payment collected
    // (the queue's "Mark as Paid" sets status=completed + invoice.paid).
    const consultationDone = (app.status === 'completed' || app.status === 'past') || !!(app.invoice && app.invoice.paid);

    // Once the patient has moved past the queue, the "Add to Queue" step stays done.
    const queuedDone = inQueue || sentToDoctor || consultationDone;

    // Is this doctor already busy with another patient (one consult at a time)?
    const busyWith      = (sentToDoctor || consultationDone) ? null : getDoctorConsultationPatient(app.doctorName, app.mrn, app.id);
    const doctorBusy    = !!busyWith;

    const flowStep = consultationDone ? 4 : (sentToDoctor ? 3 : (inQueue ? 2 : 1));

    document.getElementById('quick-view-body').innerHTML = `
        <div class="qv-head">
            <div class="qv-avatar">${initials || '–'}</div>
            <div class="qv-head-main">
                <div class="qv-name">${app.patientName}</div>
                <div class="qv-mrn">${app.mrn}</div>
                <div class="qv-chips">
                    <span class="qv-chip"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.34a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.74-1.27a2 2 0 0 1 2.11-.45c.74.34 1.53.57 2.34.7A2 2 0 0 1 22 16.92z"></path></svg>${app.phone || 'N/A'}</span>
                    <span class="qv-chip"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>${app.dob ? new Date(app.dob).toLocaleDateString('en-GB') : 'DOB unknown'}${age ? ` · ${age}` : ''}</span>
                    <span class="qv-chip">${app.resident === 'no' ? 'Non-Resident' : 'Resident'}</span>
                </div>
            </div>
            <div class="qv-head-side">
                <span class="qv-badge ${visitType === 'New Patient' ? 'qv-badge-new' : 'qv-badge-revisit'}">${visitType}</span>
                <div class="qv-time"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>${formatApptTimeRange(app)}</div>
                <div class="qv-doc">${docName} · ${docDept}</div>
            </div>
        </div>

        <div class="qv-flow">
            <div class="qv-step ${flowStep >= 1 ? (flowStep > 1 ? 'done' : 'active') : ''}">
                <span class="qv-step-dot">${flowStep > 1 ? '✓' : '1'}</span>
                <span class="qv-step-label">Add to Queue</span>
            </div>
            <div class="qv-step-bar ${flowStep > 1 ? 'fill' : ''}"></div>
            <div class="qv-step ${flowStep >= 2 ? (flowStep > 2 ? 'done' : 'active') : ''}">
                <span class="qv-step-dot">${flowStep > 2 ? '✓' : '2'}</span>
                <span class="qv-step-label">Send to Doctor</span>
            </div>
            <div class="qv-step-bar ${flowStep > 2 ? 'fill' : ''}"></div>
            <div class="qv-step ${flowStep >= 3 ? (flowStep > 3 ? 'done' : 'active') : ''}">
                <span class="qv-step-dot">${flowStep > 3 ? '✓' : '3'}</span>
                <span class="qv-step-label">Consultation</span>
            </div>
        </div>

        <div class="qv-info-grid">
            <div class="qv-info"><span class="qv-info-key">ID</span><span class="qv-info-val">${idText}</span></div>
            <div class="qv-info"><span class="qv-info-key">Insurance</span><span class="qv-info-val">${pkg ? `${pkg.name} (exp ${pkg.expiryDate})` : 'Cash / No active policy'}</span></div>
            <div class="qv-info"><span class="qv-info-key">Overdue</span><span class="qv-info-val" style="color: var(--danger); font-weight: 700;">${(app.overdue != null ? app.overdue : 0).toLocaleString()}</span></div>
            <div class="qv-info"><span class="qv-info-key">Items</span><span class="qv-info-val">${itemsText}</span></div>
        </div>

        <div class="qv-primary">
            <button class="qv-btn qv-btn-primary ${queuedDone ? 'is-done' : ''}" ${queuedDone ? 'disabled' : ''} onclick="quickAddToQueue('${app.id}')">
                ${queuedDone
                    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> In Queue'
                    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Add to Queue'}
            </button>
            <button class="qv-btn qv-btn-doctor ${sentToDoctor ? 'is-done' : ''}" ${(!inQueue || sentToDoctor || doctorBusy) ? 'disabled' : ''} onclick="sendToDoctor('${app.id}')" title="${sentToDoctor ? 'Already with the doctor' : (doctorBusy ? docName + ' is busy with another patient' : (inQueue ? 'Send this consultation to ' + docName : 'Add the patient to the queue first'))}">
                ${sentToDoctor
                    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Sent to Doctor'
                    : (doctorBusy
                        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg> Doctor Busy'
                        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg> Send to Doctor')}
            </button>
        </div>
        ${consultationDone
            ? `<div class="qv-sent-note"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Consultation complete — payment collected &amp; patient checked out.</div>`
            : (sentToDoctor ? `<div class="qv-sent-note"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> ${queueStage === 'billing' ? `Consultation complete — <strong>${docName}</strong> sent this patient to billing.` : (inConsultation ? `With <strong>${docName}</strong> — consultation in progress.` : `On <strong>${docName}</strong>'s portal — awaiting consultation.`)}</div>` : '')}
        ${doctorBusy ? `<div class="qv-busy-note"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> <strong>${docName}</strong> is in consultation with <strong>${busyWith.patientName}</strong>. You can send this patient once that consultation moves to billing.</div>` : ''}

        <div class="qv-actions">
            <button class="qv-link" onclick="openInvoice('${app.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>Make Invoice</button>
            <button class="qv-link" onclick="quickChangeDoctor('${app.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>Change Doctor</button>
            <button class="qv-link" onclick="quickAction('Print Sick Leave', '${app.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>Print Sick Leave</button>
            <button class="qv-link" onclick="openConsentList('${app.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>Request Consent</button>
            <button class="qv-link" onclick="quickPrintInvoice('${app.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>Print Invoice</button>
        </div>

        <div class="qv-selects">
            <div>
                <label class="modal-label">Appointment Status</label>
                <select class="input" onchange="setConfirmStatus('${app.id}', this.value)">
                    <option value="confirmed"   ${confirmVal === 'confirmed' ? 'selected' : ''}>Appointment Confirmed</option>
                    <option value="unreachable" ${confirmVal === 'unreachable' ? 'selected' : ''}>Call Not Reachable</option>
                    <option value="cancelled"   ${confirmVal === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    <option value="pending"     ${confirmVal === 'pending' ? 'selected' : ''}>Yet To Confirm</option>
                </select>
            </div>
            <div>
                <label class="modal-label">Visit Status</label>
                <select class="input" onchange="setVisitStatus('${app.id}', this.value)">
                    <option value="scheduled" ${visitVal === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                    <option value="arrived"   ${visitVal === 'arrived' ? 'selected' : ''}>Checked-In</option>
                    <option value="warning"   ${visitVal === 'warning' ? 'selected' : ''}>Late / Warning</option>
                    <option value="completed" ${visitVal === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="cancelled" ${visitVal === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </div>
        </div>

        <div class="qv-foot">
            <span><span class="qv-label">Created:</span> Admin · ${app.createdDate || '—'}</span>
            <span><span class="qv-label">Modified:</span> Admin · ${app.modifiedDate || '—'}</span>
        </div>
    `;

    document.getElementById('quickViewModal').classList.add('open');
    document.getElementById('quickViewBackdrop').classList.add('open');
}

function closeQuickView() {
    document.getElementById('quickViewModal').classList.remove('open');
    document.getElementById('quickViewBackdrop').classList.remove('open');
}

function setVisitStatus(appId, status) {
    const app = appointments.find(a => a.id === appId);
    if (!app) return;
    app.status = status;
    if (status === 'arrived') addToLiveQueue(app);
    else removeFromLiveQueue(app.mrn);
    localStorage.setItem('medcore_appointments', JSON.stringify(appointments));
    logActivity(`${app.patientName} visit status → ${status}`, 'by Reception');
    renderAppointmentsForDate(formatDateKey(selectedDate));
}

function isConsentSigned(app) {
    return !!app.consents && Object.values(app.consents).some(c => c.signed);
}

function quickAddToQueue(appId) {
    const app = appointments.find(a => a.id === appId);
    if (!app) return;

    // A patient can only be sent to the waiting queue once consent is signed
    if (!isConsentSigned(app)) {
        if (confirm('No signed consent on file for this patient.\n\nOpen the consent form to capture it now?')) {
            openConsentList(appId);
        }
        return;
    }

    app.status = 'arrived';
    addToLiveQueue(app);
    localStorage.setItem('medcore_appointments', JSON.stringify(appointments));
    logActivity(`${app.patientName} added to live queue`, 'by Reception');
    renderAppointmentsForDate(formatDateKey(selectedDate));
    alert(`${app.patientName} added to the Waiting Room. You can now Send to Doctor.`);
    openQuickView(appId);
}

/* ── SEND CONSULTATION TO THE DOCTOR PORTAL ──
   Bridges the reception appointment into the doctor portal DB via
   send_to_doctor.php, so the specific doctor sees it on their dashboard
   and can start the consultation. Gated behind the live queue (Step 1). */
async function sendToDoctor(appId) {
    const app = appointments.find(a => a.id === appId);
    if (!app) return;

    if (!isInQueue(app)) {
        alert('Add the patient to the queue first, then send to the doctor.');
        return;
    }
    if (!app.doctorName) {
        alert('No doctor is assigned. Use "Change Doctor" to assign one before sending.');
        return;
    }
    if (app.sentToDoctor) {
        alert(`${app.patientName} has already been sent to ${app.doctorName.split(' (')[0]}.`);
        return;
    }

    // A doctor can only see one patient at a time. Block if that doctor already
    // has another patient in the Consultation lane (status: In Consultation).
    const busyWith = getDoctorConsultationPatient(app.doctorName, app.mrn, app.id);
    if (busyWith) {
        alert(`${app.doctorName.split(' (')[0]} is currently in consultation with ${busyWith.patientName}.\n\nPlease wait until that consultation is sent to billing before sending another patient.`);
        return;
    }

    // Optimistic UI: lock the button while the request is in flight.
    const btn = document.querySelector('.qv-btn-doctor');
    if (btn) { btn.disabled = true; btn.innerHTML = 'Sending…'; }

    const startStr = `${String(app.startHour).padStart(2, '0')}:${String(app.startMinute).padStart(2, '0')}`;
    const payload = {
        extRef:      app.id,
        doctorName:  app.doctorName,
        patientName: app.patientName,
        mrn:         app.mrn,
        dob:         app.dob || '',
        gender:      app.gender || '',
        phone:       app.phone || '',
        nationalId:  app.nid || '',
        reason:      app.reason || '',
        date:        app.date || '',
        time:        startStr,
        duration:    app.duration || 30
    };

    try {
        const res = await fetch('send_to_doctor.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Request failed');

        app.sentToDoctor = true;
        app.portalAppointmentId = data.appointment_id;
        localStorage.setItem('medcore_appointments', JSON.stringify(appointments));
        // The patient is now with the doctor → advance them to the In-Consultation
        // lane of the Live Clinic Queue automatically.
        setLiveQueueStage(app.mrn, 'consultation');
        logActivity(`${app.patientName} sent to ${app.doctorName.split(' (')[0]} for consultation`, 'by Reception');
        renderAppointmentsForDate(formatDateKey(selectedDate));
        alert(data.message || `Consultation sent to ${app.doctorName.split(' (')[0]}. It now appears on the doctor's portal.`);
    } catch (err) {
        alert('Could not send to the doctor portal.\n\n' + err.message);
    } finally {
        openQuickView(appId);
    }
}

function quickChangeDoctor(appId) {
    closeQuickView();
    openAppointmentDetails(appId);
}

function quickPrintInvoice(appId) {
    const app = appointments.find(a => a.id === appId);
    if (!app) return;
    invoiceState = { appId: appId, page: 'invoice' };
    getInvoice(app);
    localStorage.setItem('medcore_appointments', JSON.stringify(appointments));
    printInvoice();
}

function quickAction(label, appId) {
    const app = appointments.find(a => a.id === appId);
    logActivity(`${label} initiated for ${app ? app.patientName : 'patient'}`, 'by Reception');
    alert(`${label} — workflow coming soon for ${app ? app.patientName : 'this patient'}.`);
}

/* ───────────────────────────────────────────────
   DOCTOR SIGNATURE REGISTRY
   ------------------------------------------------
   Every doctor has a signature kept on file. It is generated once per
   doctor (a styled rendering of their name), cached in localStorage, and
   pre-filled onto every consent form for that doctor — so the doctor's
   signature is already there when the patient arrives to sign.
   ─────────────────────────────────────────────── */
function loadDoctorSignatures() {
    try { return JSON.parse(localStorage.getItem('medcore_doctor_signatures')) || {}; }
    catch (e) { return {}; }
}

function renderSignatureImage(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 360; canvas.height = 120;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1F3A5F';
    ctx.textBaseline = 'middle';
    // Handwriting-style fonts available on Windows, with cursive fallback.
    ctx.font = 'italic 600 40px "Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive';
    ctx.fillText(name, 16, 50);
    // Hand-drawn underline flourish
    ctx.strokeStyle = '#1F3A5F'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(14, 86);
    ctx.bezierCurveTo(90, 98, 220, 72, 346, 88);
    ctx.stroke();
    return canvas.toDataURL('image/png');
}

function getDoctorSignature(doctorFull) {
    const docName = doctorFull ? doctorFull.split(' (')[0] : 'Attending Physician';
    const store = loadDoctorSignatures();
    if (store[docName]) return store[docName];
    const dataUrl = renderSignatureImage(docName);
    store[docName] = dataUrl;
    localStorage.setItem('medcore_doctor_signatures', JSON.stringify(store));
    return dataUrl;
}

/* ───────────────────────────────────────────────
   CONSENT WORKFLOW
   ─────────────────────────────────────────────── */
const CONSENT_FORMS = [
    {
        id: 1, name: 'General Consent form',
        body: `<p>I hereby voluntarily consent to and authorize the performance of examinations, tests, and procedures to maintain my health and to assess, diagnose, and treat my illness or injuries. I understand that it is the responsibility of my healthcare providers to explain the reasons for any particular diagnostic examination, test or procedure, the available treatment options, common risk, anticipated benefits associated with these options, and alternative courses of treatment.</p>
        <p><strong>Release of personal and medical information</strong> — I understand that the email address and mobile number provided in the registration form will be used as a communication tool in between the Clinic and myself.</p>
        <p>On completion of this form, I hereby authorize the Clinic to provide any information of whatever nature concerning my treatment including but not limited to my current conditions/comorbidities to my insurance carrier or to third party payer, for the purpose of determining benefit entitlement and to process payment, therefore I take responsibility for financial settlement of my bills as the Clinic is obligated by federal regulations.</p>`
    },
    {
        id: 2, name: 'Dermal Filler Consent Form',
        body: `<p>I consent to treatment with dermal/soft-tissue filler injections. The nature and purpose of the procedure, the expected results, and the alternatives to treatment have been explained to me.</p>
        <p>I understand that possible side effects include but are not limited to redness, swelling, bruising, tenderness, lumps, asymmetry, and, rarely, vascular occlusion or infection. No guarantee has been made regarding the outcome.</p>
        <p>I confirm that I have disclosed my full medical history, allergies, and current medications, and I consent to the use of clinical photographs for my medical record.</p>`
    },
    {
        id: 3, name: 'BOTOX CONSENT FORM NEW - edited',
        body: `<p>I authorize the administration of Botulinum Toxin Type A (BOTOX) injections for the treatment of dynamic facial wrinkles and/or approved medical indications.</p>
        <p>I understand that results are temporary, typically lasting 3–4 months, and that repeat treatments are required to maintain the effect. Potential side effects include localized pain, bruising, headache, temporary eyelid or brow drooping, and asymmetry.</p>
        <p>I confirm I am not pregnant or breastfeeding and have no neuromuscular disorders that contraindicate this treatment.</p>`
    },
    {
        id: 4, name: 'Adult Psychotherapy Consent Form',
        body: `<p>I voluntarily agree to participate in psychotherapy services. The therapeutic process, its potential benefits, and its risks — including the possibility of experiencing uncomfortable emotions — have been explained to me.</p>
        <p>I understand that all information disclosed during sessions is confidential and will not be released without my written consent, except where disclosure is required by law (e.g., risk of harm to self or others).</p>
        <p>I acknowledge my right to ask questions, to refuse any intervention, and to discontinue treatment at any time.</p>`
    },
    {
        id: 5, name: 'Informed Consent Form',
        body: `<p>I acknowledge that the proposed procedure, its purpose, the expected benefits, the material risks and complications, and reasonable alternative treatments have been explained to me in a language I understand.</p>
        <p>I have had the opportunity to ask questions, and all my questions have been answered to my satisfaction. I understand that no guarantee has been given as to the result of the procedure.</p>
        <p>I give my informed consent to proceed with the recommended treatment.</p>`
    }
];

const RELATION_TYPES = ['Self', 'Parent', 'Guardian', 'Spouse', 'Sibling', 'Other'];

let consentState = { appId: null, selected: [], queue: [], queueIndex: 0 };

function getConsentRecords(app) {
    if (!app.consents) app.consents = {};
    return app.consents;
}

function openConsentList(appId) {
    const app = appointments.find(a => a.id === appId);
    if (!app) return;
    closeQuickView();
    consentState.appId = appId;
    renderConsentList();
    document.getElementById('consentModal').classList.add('open');
    document.getElementById('consentBackdrop').classList.add('open');
}

function consentPatientBar(app) {
    const pkg = app.clinicalProfile && app.clinicalProfile.packages && app.clinicalProfile.packages.length
        ? app.clinicalProfile.packages[app.clinicalProfile.packages.length - 1] : null;
    return `
        <div class="consent-patient-bar">
            <div style="width: 46px; height: 46px; border-radius: 50%; background: var(--bg-aesthetic); display: flex; align-items: center; justify-content: center; color: var(--text-muted); flex-shrink: 0;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <div>
                <div style="font-weight: 700; color: var(--text-dark);">${app.patientName} <span style="color: var(--text-muted); font-weight: 500;">[${app.mrn}]</span></div>
                <div style="color: var(--text-muted); font-size: 0.75rem;">${app.dob ? new Date(app.dob).toLocaleDateString('en-GB') : 'DOB unknown'} · ${app.phone || 'N/A'}</div>
            </div>
            <div style="margin-left: auto; text-align: right; font-size: 0.75rem; color: var(--text-muted);">
                ${pkg ? pkg.name : 'Cash / No Insurance'}<br>Consultation: ${app.date}
            </div>
        </div>`;
}

function renderConsentList() {
    const app = appointments.find(a => a.id === consentState.appId);
    if (!app) return;
    const records = getConsentRecords(app);

    const rows = CONSENT_FORMS.map(form => {
        const rec = records[form.id];
        const checked = consentState.selected.includes(form.id) ? 'checked' : '';
        let statusPill = '<span style="color: var(--text-muted);">—</span>';
        if (rec && rec.status === 'Signed') statusPill = `<span class="consent-status-pill" style="background: var(--success-bg); color: var(--success-text);">Signed</span>`;
        else if (rec && rec.status === 'Awaiting') statusPill = `<span class="consent-status-pill" style="background: var(--warning-bg); color: var(--warning-text);">Awaiting Consent</span>`;

        return `
        <tr>
            <td><input type="checkbox" ${checked} onchange="toggleConsentSelect(${form.id}, this.checked)"></td>
            <td>${String(form.id).padStart(2, '0')}</td>
            <td>${form.name}</td>
            <td>${statusPill}</td>
            <td>${rec ? `<button class="qv-link" style="padding:0;" onclick="openConsentDoc([${form.id}], 0)">View / Edit</button>` : '<span style="color: var(--text-muted);">Not requested</span>'}</td>
            <td>
                <button title="Print" onclick="alert('Printing ${form.name}...')" style="background: none; border: none; cursor: pointer; color: var(--text-muted);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                </button>
            </td>
        </tr>`;
    }).join('');

    const hasSelection = consentState.selected.length > 0;

    document.getElementById('consent-body').innerHTML = `
        ${consentPatientBar(app)}
        <div class="consent-toolbar">
            <input type="text" class="input" placeholder="Filter by consent name" oninput="filterConsentRows(this.value)" style="flex: 1;">
            <select class="input" style="width: 220px;" onchange="filterConsentType(this.value)">
                <option value="ALL">ALL</option>
                ${CONSENT_FORMS.map(f => `<option value="${f.id}">${f.name}</option>`).join('')}
            </select>
            <label style="display: flex; align-items: center; gap: 6px; font-size: 0.8125rem; color: var(--text-mid); white-space: nowrap;">
                <input type="checkbox" onchange="toggleShowSelected(this.checked)"> Show Selected
            </label>
        </div>
        <div class="consent-scroll">
            <table class="consent-table" id="consent-table">
                <thead>
                    <tr>
                        <th><input type="checkbox" onchange="toggleConsentSelectAll(this.checked)" ${consentState.selected.length === CONSENT_FORMS.length ? 'checked' : ''}></th>
                        <th>S#</th><th>Consent Forms</th><th>Consent Status</th><th>View or Edit Consent</th><th>Action</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <div class="consent-footer">
            <button class="btn-primary" ${hasSelection ? '' : 'disabled style="opacity:0.5; cursor:not-allowed;"'} onclick="requestDigitalConsent()">REQUEST DIGITAL CONSENT</button>
            <div style="display: flex; gap: 10px;">
                <button class="btn-secondary" onclick="alert('Consent link sent via SMS / WhatsApp.')">SEND LINK</button>
                <button class="btn-secondary" onclick="alert('Generating printable consent forms...')">PRINT CONSENT FORM</button>
                <button class="btn-secondary" onclick="requestDigitalConsent()">EDIT AND PRINT CONSENT</button>
                <button class="btn-ghost" onclick="closeConsent()">Close</button>
            </div>
        </div>`;
}

function toggleConsentSelect(formId, checked) {
    if (checked && !consentState.selected.includes(formId)) consentState.selected.push(formId);
    else if (!checked) consentState.selected = consentState.selected.filter(id => id !== formId);
    renderConsentList();
}

function toggleConsentSelectAll(checked) {
    consentState.selected = checked ? CONSENT_FORMS.map(f => f.id) : [];
    renderConsentList();
}

function filterConsentRows(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('#consent-table tbody tr').forEach(tr => {
        const name = tr.children[2].textContent.toLowerCase();
        tr.style.display = name.includes(q) ? '' : 'none';
    });
}

function filterConsentType(val) {
    document.querySelectorAll('#consent-table tbody tr').forEach((tr, i) => {
        tr.style.display = (val === 'ALL' || String(CONSENT_FORMS[i].id) === val) ? '' : 'none';
    });
}

function toggleShowSelected(on) {
    document.querySelectorAll('#consent-table tbody tr').forEach((tr, i) => {
        const isSel = consentState.selected.includes(CONSENT_FORMS[i].id);
        tr.style.display = (!on || isSel) ? '' : 'none';
    });
}

function requestDigitalConsent() {
    if (consentState.selected.length === 0) { alert('Please select at least one consent form.'); return; }
    openConsentDoc([...consentState.selected], 0);
}

function openConsentDoc(queue, index) {
    consentState.queue = queue;
    consentState.queueIndex = index;
    const app = appointments.find(a => a.id === consentState.appId);
    const form = CONSENT_FORMS.find(f => f.id === queue[index]);
    if (!app || !form) return;

    const records = getConsentRecords(app);
    const rec = records[form.id] || { relation: 'Self', relationName: app.patientName, signedByPatient: false, accepted: false, signed: false, patientSig: null, doctorSig: null };
    const doctorName = app.doctorName ? app.doctorName.split(' (')[0] : 'Attending Physician';
    const isLast = index >= queue.length - 1;
    // The attending doctor's signature is kept on file and pre-filled here, so it
    // is already present on the form before the patient signs.
    const doctorSig = rec.doctorSig || getDoctorSignature(app.doctorName);
    consentSig = { patient: rec.patientSig || null, doctor: doctorSig };

    document.getElementById('consent-body').innerHTML = `
        <div class="consent-toolbar" style="justify-content: space-between;">
            <button class="qv-link" style="font-weight: 600;" onclick="renderConsentList()">
                <span style="font-size: 1.1rem;">←</span> Get Consent
            </button>
            <span style="font-size: 0.8125rem; font-weight: 600; color: ${rec.signed ? 'var(--success-text)' : 'var(--warning-text)'};">
                ${rec.signed ? '✓ Consent Signed' : 'Awaiting Digital Consent'}
            </span>
        </div>
        <div class="consent-toolbar" style="gap: 20px;">
            <div style="flex: 1;">
                <label class="modal-label">Select relation type</label>
                <select class="input" id="consent-relation-type">
                    ${RELATION_TYPES.map(r => `<option ${rec.relation === r ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
            </div>
            <div style="flex: 1;">
                <label class="modal-label">Enter Relation Name</label>
                <input type="text" class="input" id="consent-relation-name" value="${rec.relationName || app.patientName}">
            </div>
            <label style="display: flex; align-items: center; gap: 6px; font-size: 0.8125rem; color: var(--text-mid); white-space: nowrap; margin-top: 18px;">
                <input type="checkbox" id="consent-signed-by-patient" ${rec.signedByPatient ? 'checked' : ''}> Signed by patient
            </label>
            <button class="btn-secondary" style="margin-top: 14px;" onclick="resetConsentDoc()">RESET</button>
        </div>
        <div class="consent-scroll">
            <div class="consent-doc">
                <h2>${form.name}</h2>
                ${form.body}

                <div class="consent-sign-grid">
                    <div>
                        <div style="font-size: 0.8125rem; color: var(--text-mid); margin-bottom: 18px;">
                            <strong>Patient:</strong> ${app.patientName}<br>
                            <strong>Emirates ID:</strong> ${app.nid || 'N/A'}<br>
                            <strong>DOB:</strong> ${app.dob ? new Date(app.dob).toLocaleDateString('en-GB') : 'N/A'}<br>
                            <strong>MRN:</strong> ${app.mrn}
                        </div>
                        <div class="consent-sign-line" id="consent-patient-sign">${rec.patientSig ? `<img class="sig-img" src="${rec.patientSig}">` : ''}</div>
                        <div class="consent-sign-label">Patient / Guardian Signature</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 10px;"><strong>Date:</strong> ${rec.date || nowStamp()}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.8125rem; color: var(--text-mid); margin-bottom: 18px;">
                            <strong>Attending Doctor:</strong> ${doctorName}<br>
                            <strong>Department:</strong> ${(app.doctorName.match(/\((.*?)\)/) || [, 'General'])[1]}<br>
                            <strong>Date of Consultation:</strong> ${app.date}
                        </div>
                        <div class="consent-sign-line" id="consent-doctor-sign">${doctorSig ? `<img class="sig-img" src="${doctorSig}">` : ''}</div>
                        <div class="consent-sign-label">Doctor Seal / Signature <span style="color: var(--success-text); font-weight: 600;">✓ on file</span></div>
                    </div>
                </div>
            </div>
            <div style="text-align: center; font-size: 0.75rem; color: var(--text-muted); padding-bottom: 12px;">
                Form ${index + 1} of ${queue.length}
            </div>
        </div>
        <div class="consent-footer">
            <label style="display: flex; align-items: center; gap: 6px; font-size: 0.8125rem; color: var(--text-mid);">
                <input type="checkbox" id="consent-accept" ${rec.accepted ? 'checked' : ''}> I accept this consent form
            </label>
            <div style="display: flex; gap: 10px;">
                <button class="btn-secondary" onclick="openSignatureModal()">SIGNATURE</button>
                <button class="btn-secondary" onclick="saveConsent(false)">SAVE ${isLast ? '' : 'AND CONTINUE'}</button>
                <button class="btn-primary" onclick="saveConsent(true)">COMPLETE</button>
            </div>
        </div>`;
}

/* ── SIGNATURE PAD ── */
let consentSig = { patient: null, doctor: null };
let sigPads = {};

function openSignatureModal() {
    const accept = document.getElementById('consent-accept');
    if (!accept || !accept.checked) {
        alert('Please tick "I accept this consent form" before signing.');
        return;
    }
    document.getElementById('signatureModal').classList.add('open');
    document.getElementById('signatureBackdrop').classList.add('open');

    // Canvases need a real size before we can draw — size them now that they're visible
    ['patient', 'doctor'].forEach(who => {
        const canvas = document.getElementById(`sig-canvas-${who}`);
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        const ctx = canvas.getContext('2d');
        ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1F2937';
        sigPads[who] = { canvas, ctx, drawing: false, dirty: false };

        // Restore any previously captured signature
        if (consentSig[who]) {
            const img = new Image();
            img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            img.src = consentSig[who];
            sigPads[who].dirty = true;
        }
        attachSigDrawing(who);
    });
}

function attachSigDrawing(who) {
    const pad = sigPads[who];
    const { canvas, ctx } = pad;
    const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        const p = e.touches ? e.touches[0] : e;
        return { x: p.clientX - r.left, y: p.clientY - r.top };
    };
    const start = (e) => { e.preventDefault(); pad.drawing = true; pad.dirty = true; const { x, y } = pos(e); ctx.beginPath(); ctx.moveTo(x, y); };
    const move = (e) => { if (!pad.drawing) return; e.preventDefault(); const { x, y } = pos(e); ctx.lineTo(x, y); ctx.stroke(); };
    const end = () => { pad.drawing = false; };

    canvas.onmousedown = start; canvas.onmousemove = move;
    canvas.onmouseup = end; canvas.onmouseleave = end;
    canvas.ontouchstart = start; canvas.ontouchmove = move; canvas.ontouchend = end;
}

function setSigMode(who, mode, btn) {
    btn.parentElement.querySelectorAll('.sig-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    if (mode === 'upload') document.getElementById(`sig-upload-${who}`).click();
}

function handleSigUpload(who, input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const pad = sigPads[who];
            pad.ctx.clearRect(0, 0, pad.canvas.width, pad.canvas.height);
            // Fit the uploaded image inside the pad, preserving aspect ratio
            const scale = Math.min(pad.canvas.width / img.width, pad.canvas.height / img.height);
            const w = img.width * scale, h = img.height * scale;
            pad.ctx.drawImage(img, (pad.canvas.width - w) / 2, (pad.canvas.height - h) / 2, w, h);
            pad.dirty = true;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function clearSigCanvas(who) {
    const pad = sigPads[who];
    if (!pad) return;
    pad.ctx.clearRect(0, 0, pad.canvas.width, pad.canvas.height);
    pad.dirty = false;
}

function saveSignatures() {
    let captured = false;
    ['patient', 'doctor'].forEach(who => {
        const pad = sigPads[who];
        if (pad && pad.dirty) {
            consentSig[who] = pad.canvas.toDataURL('image/png');
            captured = true;
        }
    });
    if (!captured) { alert('Please draw or upload at least one signature.'); return; }

    // Inject straight into the live consent document
    if (consentSig.patient) document.getElementById('consent-patient-sign').innerHTML = `<img class="sig-img" src="${consentSig.patient}">`;
    if (consentSig.doctor) document.getElementById('consent-doctor-sign').innerHTML = `<img class="sig-img" src="${consentSig.doctor}">`;

    closeSignatureModal();
}

function closeSignatureModal() {
    document.getElementById('signatureModal').classList.remove('open');
    document.getElementById('signatureBackdrop').classList.remove('open');
}

function resetConsentDoc() {
    // Reset clears the patient signature only — the doctor's signature is on
    // file, so it stays pre-filled on the form.
    const app = appointments.find(a => a.id === consentState.appId);
    const docSig = app ? getDoctorSignature(app.doctorName) : null;
    consentSig = { patient: null, doctor: docSig };
    const pLine = document.getElementById('consent-patient-sign');
    const dLine = document.getElementById('consent-doctor-sign');
    if (pLine) pLine.innerHTML = '';
    if (dLine) dLine.innerHTML = docSig ? `<img class="sig-img" src="${docSig}">` : '';
    const accept = document.getElementById('consent-accept');
    if (accept) accept.checked = false;
    const sbp = document.getElementById('consent-signed-by-patient');
    if (sbp) sbp.checked = false;
}

function saveConsent(complete) {
    const app = appointments.find(a => a.id === consentState.appId);
    const form = CONSENT_FORMS.find(f => f.id === consentState.queue[consentState.queueIndex]);
    if (!app || !form) return;

    const accepted = document.getElementById('consent-accept').checked;
    const signed = !!consentSig.patient && accepted;

    if (complete && !signed) {
        alert('To complete, please tick "I accept this consent form" and capture the patient signature.');
        return;
    }

    const records = getConsentRecords(app);
    records[form.id] = {
        relation: document.getElementById('consent-relation-type').value,
        relationName: document.getElementById('consent-relation-name').value,
        signedByPatient: document.getElementById('consent-signed-by-patient').checked,
        accepted: accepted,
        patientSig: consentSig.patient,
        doctorSig: consentSig.doctor,
        signed: signed,
        status: signed ? 'Signed' : 'Awaiting',
        date: nowStamp()
    };
    localStorage.setItem('medcore_appointments', JSON.stringify(appointments));
    logActivity(`${form.name} ${signed ? 'signed & completed' : 'saved (awaiting)'} for ${app.patientName}`, 'by Reception');

    // Advance to the next selected form, or finish
    if (consentState.queueIndex < consentState.queue.length - 1) {
        openConsentDoc(consentState.queue, consentState.queueIndex + 1);
    } else if (complete && signed) {
        // Consent fully signed → return to the appointment so it can be sent to the queue
        consentState.selected = [];
        closeConsent();
        openQuickView(app.id);
    } else {
        consentState.selected = [];
        renderConsentList();
    }
}

function closeConsent() {
    document.getElementById('consentModal').classList.remove('open');
    document.getElementById('consentBackdrop').classList.remove('open');
    consentState = { appId: null, selected: [], queue: [], queueIndex: 0 };
}

/* ───────────────────────────────────────────────
   INVOICE / BILLING
   ─────────────────────────────────────────────── */
const VAT_RATE = 0; // UAE healthcare services are generally VAT-exempt
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
const PAYMENT_METHODS = ['Cash', 'Credit / Debit Card', 'Cheque', 'Bank Transfer', 'Online Payment'];

let invoiceState = { appId: null, page: 'invoice' };

function money(n) { return (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function catalogFor(desc) {
    const d = (desc || '').toLowerCase();
    return TREATMENT_CATALOG.find(c => d.includes(c.match)) || null;
}

function makeInvLine(code, desc, qty, unit) {
    const line = { code, desc, qty, unit, discPct: 0, vatPct: VAT_RATE };
    recalcLine(line);
    return line;
}

function recalcLine(line) {
    line.gross = +(line.unit * line.qty).toFixed(2);
    line.disc = +(line.gross * line.discPct / 100).toFixed(2);
    line.nett = +(line.gross - line.disc).toFixed(2);
    line.vat = +(line.nett * line.vatPct / 100).toFixed(2);
    line.total = +(line.nett + line.vat).toFixed(2);
}

// Extended consultation time charged per 15-minute block beyond the booked slot.
const EXTENDED_TIME_RATE = 50.00;

function buildInvoiceLines(app) {
    const dept = (app.doctorName.match(/\((.*?)\)/) || [, 'General Practice'])[1];
    const lines = [];

    // Show the effective consultation length; flag it when the doctor extended it.
    const dur = app.duration || 0;
    const booked = (app.bookedDuration != null) ? app.bookedDuration : dur;
    const extended = dur > booked && booked > 0;
    const consDesc = dur > 0
        ? `Consultation - ${dept} (${dur} min${extended ? ', extended' : ''})`
        : `Consultation - ${dept}`;

    const consCat = catalogFor(dept) || { code: 'CONS-GP-001', name: `Consultation - ${dept}`, price: 164.00 };
    lines.push(makeInvLine(consCat.code, consDesc, 1, consCat.price));

    // Bill the extra time the consultation ran over the originally booked slot.
    if (extended) {
        const extraMin = dur - booked;
        const blocks = Math.ceil(extraMin / 15);
        lines.push(makeInvLine('EXT-TIME', `Extended consultation time (+${extraMin} min, was ${booked} min)`, blocks, EXTENDED_TIME_RATE));
    }

    if (app.clinicalProfile && app.clinicalProfile.items && app.clinicalProfile.items.length) {
        app.clinicalProfile.items.forEach(it => {
            const cat = catalogFor(it.description);
            const qty = parseInt(it.qty) || 1;
            lines.push(makeInvLine(cat ? cat.code : 'ITM-GEN', it.description, qty, cat ? cat.price : 50.00));
        });
    }
    return lines;
}

function getInvoice(app) {
    if (!app.invoice) {
        app.invoice = {
            no: 'INV-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 9000)),
            date: app.date,
            lines: buildInvoiceLines(app),
            paymentMethod: 'Cash',
            amountPaid: 0,
            paid: false
        };
    }
    return app.invoice;
}

function invoiceTotals(inv) {
    const t = { gross: 0, disc: 0, nett: 0, vat: 0, total: 0 };
    inv.lines.forEach(l => { t.gross += l.gross; t.disc += l.disc; t.nett += l.nett; t.vat += l.vat; t.total += l.total; });
    return t;
}

function openInvoice(appId) {
    const app = appointments.find(a => a.id === appId);
    if (!app) return;
    closeQuickView();
    invoiceState = { appId: appId, page: 'invoice' };
    getInvoice(app);
    renderInvoice();
    document.getElementById('invoiceModal').classList.add('open');
    document.getElementById('invoiceBackdrop').classList.add('open');
}

function closeInvoice() {
    document.getElementById('invoiceModal').classList.remove('open');
    document.getElementById('invoiceBackdrop').classList.remove('open');
    invoiceState = { appId: null, page: 'invoice' };
}

function invoiceHeader(app) {
    const pkg = app.clinicalProfile && app.clinicalProfile.packages && app.clinicalProfile.packages.length
        ? app.clinicalProfile.packages[app.clinicalProfile.packages.length - 1] : null;
    const doctorName = app.doctorName ? app.doctorName.split(' (')[0] : 'Attending Physician';
    const dept = (app.doctorName.match(/\((.*?)\)/) || [, 'General'])[1];
    const age = calcAge(app.dob);
    return `
        <div class="inv-header">
            <div class="col">
                <div style="font-weight: 700; color: var(--text-dark); font-size: 0.9375rem;">${app.patientName} <span style="color: var(--accent); font-weight: 600;">[${app.mrn}]</span></div>
                Male | ${age || '—'} | ${app.dob ? new Date(app.dob).toLocaleDateString('en-GB') : 'DOB N/A'}<br>
                ${app.resident === 'no' ? 'Non-Resident' : 'Resident'} | ${app.phone || 'N/A'}
            </div>
            <div class="col">
                <div style="font-weight: 700; color: var(--text-dark);">${doctorName}</div>
                ${dept}<br>Visit Date: ${app.date}
            </div>
            <div class="col" style="text-align: right;">
                Advance: <b style="color: var(--success-text);">${money(1000)}</b><br>
                Credit Note: <b>${money(0)}</b><br>
                Overdue: <b style="color: var(--danger);">${money(app.overdue || 0)}</b>
            </div>
        </div>
        <div class="inv-tabs">
            <button class="inv-tab ${invoiceState.page === 'invoice' ? 'active' : ''}" onclick="switchInvoicePage('invoice')">Patient Invoice(s)</button>
            <button class="inv-tab ${invoiceState.page === 'payment' ? 'active' : ''}" onclick="switchInvoicePage('payment')">Payment</button>
        </div>`;
}

function switchInvoicePage(page) {
    invoiceState.page = page;
    renderInvoice();
}

function renderInvoice() {
    if (invoiceState.page === 'payment') return renderInvoicePayment();
    renderInvoiceLines();
}

function renderInvoiceLines() {
    const app = appointments.find(a => a.id === invoiceState.appId);
    if (!app) return;
    const inv = getInvoice(app);
    const t = invoiceTotals(inv);

    const rows = inv.lines.map((l, i) => `
        <tr>
            <td>${String(i + 1).padStart(2, '0')}</td>
            <td><span class="inv-code">${l.code}</span></td>
            <td>${l.desc}</td>
            <td class="num"><input type="number" min="1" value="${l.qty}" onchange="updateInvLine(${i}, 'qty', this.value)"></td>
            <td class="num"><input type="number" min="0" step="0.01" value="${l.unit}" onchange="updateInvLine(${i}, 'unit', this.value)"></td>
            <td class="num">${money(l.gross)}</td>
            <td class="num"><input type="number" min="0" max="100" value="${l.discPct}" onchange="updateInvLine(${i}, 'discPct', this.value)"></td>
            <td class="num">${money(l.nett)}</td>
            <td class="num">${money(l.vat)}</td>
            <td class="num" style="font-weight: 600;">${money(l.total)}</td>
            <td>${inv.paid ? '<span style="color:var(--success-text);font-weight:600;">Paid</span>' : 'Self Paid'}</td>
            <td><button class="inv-remove" onclick="removeInvLine(${i})" title="Remove">&times;</button></td>
        </tr>`).join('');

    document.getElementById('invoice-body').innerHTML = `
        ${invoiceHeader(app)}
        <div class="inv-summary">
            <div class="metric">Total Invoice Amt <b>${money(t.gross)}</b></div>
            <div class="metric">Total Cash Amt <b>${money(t.total)}</b></div>
            <div class="metric">Total Insurance Amt <b>${money(0)}</b></div>
            <div class="metric collect">Amount to be Collected <b>${money(inv.paid ? 0 : t.total)}</b></div>
            <div class="metric" style="margin-left: auto;">Invoices <b>${inv.lines.length} (Cash)</b></div>
        </div>
        <div class="inv-scroll">
            <table class="inv-table">
                <thead>
                    <tr>
                        <th>S#</th><th>Code</th><th>Treatment / Item Description</th>
                        <th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Gross</th>
                        <th class="num">Disc %</th><th class="num">Nett</th><th class="num">VAT</th>
                        <th class="num">Total</th><th>Type</th><th></th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 16px;">
                <select class="input" id="inv-add-select" style="width: 320px;">
                    ${TREATMENT_CATALOG.map(c => `<option value="${c.code}">${c.name} — AED ${money(c.price)}</option>`).join('')}
                </select>
                <button class="btn-secondary" onclick="addInvLine()">+ Add Treatment Line</button>
            </div>
        </div>
        <div class="inv-footer">
            <div style="font-size: 0.8125rem; color: var(--text-muted);">Invoice No: <strong style="color: var(--text-dark);">${inv.no}</strong> · Date: ${inv.date}</div>
            <div style="display: flex; gap: 10px;">
                <button class="btn-ghost" onclick="closeInvoice()">Close</button>
                <button class="btn-secondary" onclick="printInvoice()">PRINT INVOICE</button>
                <button class="btn-primary" onclick="switchInvoicePage('payment')">PROCEED TO PAYMENT &rarr;</button>
            </div>
        </div>`;
}

function updateInvLine(idx, field, value) {
    const app = appointments.find(a => a.id === invoiceState.appId);
    const inv = getInvoice(app);
    const line = inv.lines[idx];
    if (!line) return;
    const num = parseFloat(value);
    if (field === 'qty') line.qty = Math.max(1, isNaN(num) ? 1 : num);
    else if (field === 'unit') line.unit = isNaN(num) ? 0 : num;
    else if (field === 'discPct') line.discPct = Math.min(100, Math.max(0, isNaN(num) ? 0 : num));
    recalcLine(line);
    saveAppointmentsAndRender();
    renderInvoiceLines();
}

function addInvLine() {
    const app = appointments.find(a => a.id === invoiceState.appId);
    const inv = getInvoice(app);
    const code = document.getElementById('inv-add-select').value;
    const cat = TREATMENT_CATALOG.find(c => c.code === code);
    if (!cat) return;
    inv.lines.push(makeInvLine(cat.code, cat.name, 1, cat.price));
    saveAppointmentsAndRender();
    renderInvoiceLines();
}

function removeInvLine(idx) {
    const app = appointments.find(a => a.id === invoiceState.appId);
    const inv = getInvoice(app);
    inv.lines.splice(idx, 1);
    saveAppointmentsAndRender();
    renderInvoiceLines();
}

function renderInvoicePayment() {
    const app = appointments.find(a => a.id === invoiceState.appId);
    if (!app) return;
    const inv = getInvoice(app);
    const t = invoiceTotals(inv);
    const due = inv.paid ? 0 : t.total;

    document.getElementById('invoice-body').innerHTML = `
        ${invoiceHeader(app)}
        <div class="inv-scroll">
            <div style="margin: 18px 0 6px; font-weight: 600; color: var(--text-dark);">Payment Method <span style="color: var(--text-muted); font-weight: 400; font-size: 0.8125rem;">(Cash / Self-Paid Claim)</span></div>
            <div class="pay-methods">
                ${PAYMENT_METHODS.map(m => `
                    <label class="pay-method ${inv.paymentMethod === m ? 'selected' : ''}">
                        <input type="radio" name="pay-method" value="${m}" ${inv.paymentMethod === m ? 'checked' : ''} onchange="setPaymentMethod('${m}')"> ${m}
                    </label>`).join('')}
            </div>

            <div class="pay-grid">
                <div>
                    <label class="modal-label">Amount Tendered (AED)</label>
                    <input type="number" class="input" id="pay-tendered" min="0" step="0.01" value="${inv.paid ? inv.amountPaid : due.toFixed(2)}" oninput="updateChange()">
                </div>
                <div>
                    <label class="modal-label">Change / Balance</label>
                    <input type="text" class="input" id="pay-change" value="0.00" readonly style="background: var(--bg-aesthetic);">
                </div>
            </div>

            <div class="pay-summary">
                <div class="pay-row"><span>Total Invoice Amount</span><span>AED ${money(t.gross)}</span></div>
                <div class="pay-row"><span>Discount</span><span>- AED ${money(t.disc)}</span></div>
                <div class="pay-row"><span>VAT</span><span>AED ${money(t.vat)}</span></div>
                <div class="pay-row total"><span>Amount to be Collected</span><span>AED ${money(due)}</span></div>
            </div>

            ${inv.paid ? `<div style="margin-top: 16px; color: var(--success-text); font-weight: 600;">&#10003; Payment received via ${inv.paymentMethod} on ${inv.paidDate}</div>` : ''}
        </div>
        <div class="inv-footer">
            <button class="btn-secondary" onclick="switchInvoicePage('invoice')">&larr; Back to Invoice</button>
            <div style="display: flex; gap: 10px;">
                <button class="btn-ghost" onclick="closeInvoice()">Close</button>
                <button class="btn-secondary" onclick="printInvoice()">PRINT INVOICE</button>
                <button class="btn-primary" ${inv.paid ? 'disabled style="opacity:0.5;"' : ''} onclick="collectPayment()">COLLECT PAYMENT</button>
            </div>
        </div>`;
    updateChange();
}

function setPaymentMethod(method) {
    const app = appointments.find(a => a.id === invoiceState.appId);
    getInvoice(app).paymentMethod = method;
    saveAppointmentsAndRender();
    renderInvoicePayment();
}

function updateChange() {
    const app = appointments.find(a => a.id === invoiceState.appId);
    if (!app) return;
    const inv = getInvoice(app);
    const t = invoiceTotals(inv);
    const due = inv.paid ? 0 : t.total;
    const tendered = parseFloat(document.getElementById('pay-tendered').value) || 0;
    const change = Math.max(0, tendered - due);
    document.getElementById('pay-change').value = money(change);
}

function collectPayment() {
    const app = appointments.find(a => a.id === invoiceState.appId);
    const inv = getInvoice(app);
    const t = invoiceTotals(inv);
    const tendered = parseFloat(document.getElementById('pay-tendered').value) || 0;

    if (tendered < t.total) {
        alert(`Amount tendered (AED ${money(tendered)}) is less than the amount to be collected (AED ${money(t.total)}).`);
        return;
    }
    inv.paid = true;
    inv.amountPaid = t.total;
    inv.paidDate = nowStamp();
    inv.lines.forEach(l => l.status = 'Paid');
    recordPayment(app, inv, t.total);
    saveAppointmentsAndRender();
    logActivity(`Invoice ${inv.no} (AED ${money(t.total)}) collected via ${inv.paymentMethod} for ${app.patientName}`, 'by Accounts');
    alert(`Payment of AED ${money(t.total)} received via ${inv.paymentMethod}.\nChange: AED ${money(tendered - t.total)}`);
    renderInvoicePayment();
}

function saveAppointmentsAndRender() {
    localStorage.setItem('medcore_appointments', JSON.stringify(appointments));
    renderAppointmentsForDate(formatDateKey(selectedDate));
}

function recordPayment(app, inv, total) {
    let payments = JSON.parse(localStorage.getItem('medcore_payments')) || [];
    const dept = (app.doctorName.match(/\((.*?)\)/) || [, 'General'])[1];
    payments.unshift({
        invoiceNo: inv.no,
        patientName: app.patientName,
        mrn: app.mrn,
        doctor: app.doctorName ? app.doctorName.split(' (')[0] : 'Unassigned',
        dept: dept,
        amount: total,
        method: inv.paymentMethod,
        collectedBy: 'System Admin',
        date: new Date().toISOString(),
        visitDate: app.date
    });
    localStorage.setItem('medcore_payments', JSON.stringify(payments));
}

function printInvoice() {
    const app = appointments.find(a => a.id === invoiceState.appId);
    if (!app) return;
    const inv = getInvoice(app);
    const t = invoiceTotals(inv);
    const doctorName = app.doctorName ? app.doctorName.split(' (')[0] : 'Attending Physician';
    const dept = (app.doctorName.match(/\((.*?)\)/) || [, 'General'])[1];

    const rows = inv.lines.map((l, i) => `
        <tr>
            <td>${String(i + 1).padStart(2, '0')}</td>
            <td>${l.code}</td>
            <td>${l.desc}</td>
            <td style="text-align:center;">${l.qty}</td>
            <td style="text-align:right;">${money(l.unit)}</td>
            <td style="text-align:right;">${money(l.gross)}</td>
            <td style="text-align:right;">${money(l.disc)}</td>
            <td style="text-align:right;">${money(l.vat)}</td>
            <td style="text-align:right;">${money(l.total)}</td>
        </tr>`).join('');

    const html = `<!DOCTYPE html><html><head><title>Invoice ${inv.no}</title>
        <style>
            body { font-family: Arial, sans-serif; color: #1F2937; padding: 32px; font-size: 13px; }
            h1 { font-size: 20px; margin: 0; color: #4F7CAC; }
            .meta { display: flex; justify-content: space-between; margin: 20px 0; }
            .meta div { line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { background: #4B5563; color: #fff; padding: 8px; text-align: left; font-size: 11px; }
            td { padding: 8px; border-bottom: 1px solid #E5E7EB; }
            .totals { margin-top: 16px; width: 280px; margin-left: auto; }
            .totals tr td { border: none; padding: 4px 8px; }
            .grand { font-weight: 700; font-size: 15px; border-top: 2px solid #1F2937; }
            .status { display:inline-block; margin-top:8px; padding:4px 12px; border-radius:6px; font-weight:700; ${inv.paid ? 'background:#ECFDF5;color:#059669;' : 'background:#FFFBEB;color:#D97706;'} }
            .foot { margin-top: 40px; display:flex; justify-content:space-between; }
            .sign { border-top: 1px solid #1F2937; width: 200px; padding-top: 6px; font-size: 11px; color:#6B7280; }
        </style></head><body>
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #4F7CAC; padding-bottom:12px;">
            <div><h1>MedCore HMS</h1><div style="color:#6B7280;">Tax Invoice</div></div>
            <div style="text-align:right;"><strong>Invoice No:</strong> ${inv.no}<br><strong>Date:</strong> ${inv.date}</div>
        </div>
        <div class="meta">
            <div><strong>Bill To:</strong><br>${app.patientName}<br>MRN: ${app.mrn}<br>ID: ${app.nid || 'N/A'}<br>${app.phone || ''}</div>
            <div style="text-align:right;"><strong>Attending Doctor:</strong><br>${doctorName}<br>${dept}<br>Visit Date: ${app.date}</div>
        </div>
        <span class="status">${inv.paid ? 'PAID · ' + inv.paymentMethod : 'UNPAID'}</span>
        <table>
            <thead><tr><th>S#</th><th>Code</th><th>Description</th><th>Qty</th><th>Unit</th><th>Gross</th><th>Disc</th><th>VAT</th><th>Total</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <table class="totals">
            <tr><td>Gross</td><td style="text-align:right;">AED ${money(t.gross)}</td></tr>
            <tr><td>Discount</td><td style="text-align:right;">- AED ${money(t.disc)}</td></tr>
            <tr><td>VAT</td><td style="text-align:right;">AED ${money(t.vat)}</td></tr>
            <tr class="grand"><td>Total</td><td style="text-align:right;">AED ${money(t.total)}</td></tr>
        </table>
        <div class="foot">
            <div class="sign">Patient Signature</div>
            <div class="sign">Authorized Signatory</div>
        </div>
        </body></html>`;

    const w = window.open('', '_blank', 'width=820,height=920');
    if (!w) { alert('Please allow pop-ups to print the invoice.'); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
}

let currentBillingMode = 'cash';
function setBillingMode(mode) {
    currentBillingMode = mode;
    const insSection = document.getElementById('insurance-details-section');
    if (insSection) {
        insSection.style.display = (mode === 'insurance') ? 'grid' : 'none';
    }
    refreshInsuranceContextBar();
}

/* ── INSURANCE CONTEXT BAR (TOP-RIGHT) ── */
// The bar only renders when Payment Mode = Insurance. The values come from the
// insurance detail fields below (which, in production, are hydrated by the
// insurance eligibility API once a policy is fetched).
function refreshInsuranceContextBar() {
    const bar = document.getElementById('insurance-context-bar');
    if (!bar) return;

    if (currentBillingMode !== 'insurance') {
        bar.style.display = 'none';
        bar.innerHTML = '';
        return;
    }

    const company = (document.getElementById('reg-insurance-company').value || '').trim();
    const type = (document.getElementById('reg-insurance-type').value || '').trim();
    const expiryRaw = document.getElementById('reg-insurance-expiry').value;
    const copay = (document.getElementById('reg-insurance-copay').value || '').trim();

    // Nothing entered/fetched yet — prompt instead of showing an empty bar.
    if (!company && !type && !expiryRaw && !copay) {
        bar.style.display = 'block';
        bar.innerHTML = '<span style="color: var(--text-muted);">Awaiting insurance details — fetch from card or enter the policy below.</span>';
        return;
    }

    let expiry = '—';
    if (expiryRaw) {
        const d = new Date(expiryRaw);
        expiry = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }

    bar.style.display = 'block';
    bar.innerHTML = `
        ${company || 'Insurance Provider'} | <span style="font-weight: 600; color: var(--text-dark);">${type || 'Plan'}</span> | General<br>
        Expiry : ${expiry}${copay ? ` | CoPay : ${copay} AED` : ''}
    `;
}

/* ── DYNAMIC DATA MERGER (LEGACY PROFILES + LIVE APPOINTMENTS) ── */
function getCombinedEncounters(profile, mrn) {
    // 1. Grab hardcoded legacy encounters
    let allEncounters = profile && profile.encounters ? [...profile.encounters] : [];

    // 2. Actively fetch all live appointments mapped to this MRN
    if (mrn) {
        let activeApps = appointments.filter(a => a.mrn === mrn);
        activeApps.forEach(a => {
            let dParts = a.date.split('-');
            let dateObj = new Date(dParts[0], dParts[1] - 1, dParts[2]);
            let fDate = shortMonths[dateObj.getMonth()] + " " + String(dateObj.getDate()).padStart(2, '0') + ", " + dateObj.getFullYear();

            let deptMatch = a.doctorName.match(/\((.*?)\)/);
            let dept = deptMatch ? deptMatch[1] : 'General';
            let doc = a.doctorName.split(' (')[0];

            // Prevent exact duplicates
            let exists = allEncounters.some(e => e.date === fDate && e.doctor === doc);
            if (!exists) {
                allEncounters.push({
                    date: fDate,
                    diagnosis: a.reason || 'General Consultation',
                    status: a.status.charAt(0).toUpperCase() + a.status.slice(1),
                    doctor: doc,
                    dept: dept
                });
            }
        });
    }

    // Sort descending by date
    allEncounters.sort((a, b) => new Date(b.date) - new Date(a.date));
    return allEncounters;
}

/* ── DYNAMIC CLINICAL HIGHLIGHTS INJECTION ── */
function renderClinicalHighlights(profile, mrn) {
    const allergiesBox = document.getElementById('dyn-allergies');
    const bloodBox = document.getElementById('dyn-blood-group');
    const condBox = document.getElementById('dyn-conditions');
    const vitalsBox = document.getElementById('dyn-vitals');
    const vitalsDate = document.getElementById('dyn-vitals-date');
    const encountersBox = document.getElementById('dyn-encounters');

    if (!profile) {
        allergiesBox.innerHTML = '<span style="color:var(--text-muted); font-size:0.8125rem;">No known allergies on file</span>';
        bloodBox.innerHTML = '<span style="color:var(--text-muted); font-size:0.8125rem;">N/A</span>';
        condBox.innerHTML = '<span style="color:var(--text-muted); font-size:0.8125rem;">None reported</span>';
        vitalsDate.innerText = '';
        vitalsBox.innerHTML = '<div style="color:var(--text-muted); font-size:0.8125rem;">No recent vitals recorded</div>';
    } else {
        if (profile.allergies && profile.allergies.length > 0) {
            allergiesBox.innerHTML = profile.allergies.map(alg => `
                <span style="background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; padding: 4px 10px; border-radius: 16px; font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    ${alg}
                </span>
            `).join('');
        } else allergiesBox.innerHTML = '<span style="color:var(--text-muted); font-size:0.8125rem;">No known allergies</span>';

        bloodBox.innerHTML = `<span style="background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; padding: 4px 12px; border-radius: 6px; font-size: 0.8125rem; font-weight: 700;">${profile.bloodGroup || 'Unknown'}</span>`;

        if (profile.conditions && profile.conditions.length > 0) {
            condBox.innerHTML = profile.conditions.map(cond => `
                <span style="background: var(--bg-aesthetic); color: var(--text-dark); border: 1px solid var(--border-light); padding: 4px 12px; border-radius: 6px; font-size: 0.8125rem; font-weight: 500;">${cond}</span>
            `).join('');
        } else condBox.innerHTML = '<span style="color:var(--text-muted); font-size:0.8125rem;">None reported</span>';

        if (profile.vitals) {
            vitalsDate.innerText = `(${profile.vitals.date})`;
            vitalsBox.innerHTML = `
                <div><span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">BP</span> <span style="font-size: 0.875rem; font-weight: 600; color: var(--text-dark); margin-left: 6px;">${profile.vitals.bp}</span></div>
                <div><span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">HR</span> <span style="font-size: 0.875rem; font-weight: 600; color: var(--text-dark); margin-left: 6px;">${profile.vitals.hr}</span></div>
                <div><span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Weight</span> <span style="font-size: 0.875rem; font-weight: 600; color: var(--text-dark); margin-left: 6px;">${profile.vitals.weight}</span></div>
            `;
        } else {
            vitalsDate.innerText = '';
            vitalsBox.innerHTML = '<div style="color:var(--text-muted); font-size:0.8125rem;">No recent vitals recorded</div>';
        }
    }

    // Use merged encounters here too
    let mergedEncounters = getCombinedEncounters(profile, mrn);

    if (mergedEncounters.length > 0) {
        encountersBox.innerHTML = mergedEncounters.map(enc => {
            let badgeClass = (enc.status === 'Completed' || enc.status === 'Resolved') ? 'badge-completed' : (enc.status === 'Scheduled' ? 'badge-scheduled' : 'badge-warning');
            let badgeColor = (badgeClass === 'badge-completed') ? 'var(--success-bg)' : (badgeClass === 'badge-scheduled' ? 'var(--bg-aesthetic)' : 'var(--bg-canvas)');
            let badgeText = (badgeClass === 'badge-completed') ? 'var(--success-text)' : (badgeClass === 'badge-scheduled' ? 'var(--accent)' : 'var(--text-mid)');
            let badgeBorder = (badgeClass === 'badge-completed') ? '#A7F3D0' : (badgeClass === 'badge-scheduled' ? '#93C5FD' : 'var(--border-light)');

            return `
            <tr style="background: #FFFFFF; transition: background 0.2s;">
                <td style="padding: 14px 16px; border-bottom: 1px solid var(--border-light); font-weight: 600; color: var(--text-dark); white-space: nowrap;">
                    ${enc.date}
                </td>
                <td style="padding: 14px 16px; border-bottom: 1px solid var(--border-light);">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 0.875rem; font-weight: 600; color: var(--text-dark);">${enc.diagnosis}</span>
                        <span style="background: ${badgeColor}; color: ${badgeText}; padding: 2px 8px; border-radius: 12px; font-size: 0.6875rem; font-weight: 600; border: 1px solid ${badgeBorder};">${enc.status}</span>
                    </div>
                </td>
                <td style="padding: 14px 16px; border-bottom: 1px solid var(--border-light);">
                    <div style="display: flex; align-items: center; gap: 6px; font-size: 0.8125rem; color: var(--text-muted); font-weight: 500;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        <span style="color: var(--text-mid);">${enc.doctor}</span>
                        <span style="color: var(--border-light);">|</span>
                        <span>${enc.dept}</span>
                    </div>
                </td>
                <td style="padding: 14px 16px; border-bottom: 1px solid var(--border-light); text-align: right;">
                    <button onclick="alert('Accessing secure clinical notes for ${enc.diagnosis}...')" style="background: transparent; border: 1px solid var(--border-light); color: var(--accent); padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">Notes</button>
                </td>
            </tr>
            `;
        }).join('');
    } else {
        encountersBox.innerHTML = '<tr><td colspan="4" style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.8125rem;">No previous clinical encounters on record.</td></tr>';
    }
}

function renderVisitHistory(profile, mrn) {
    const historyTbody = document.getElementById('dyn-visit-history');

    // Dynamic Merge Magic Happens Here
    let mergedEncounters = getCombinedEncounters(profile, mrn);

    if (mergedEncounters.length === 0) {
        historyTbody.innerHTML = '<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.8125rem;">No previous clinical encounters on record.</td></tr>';
        return;
    }

    historyTbody.innerHTML = mergedEncounters.map((enc, index) => {
        let badgeClass = (enc.status === 'Completed' || enc.status === 'Resolved') ? 'badge-completed' : (enc.status === 'Scheduled' ? 'badge-scheduled' : 'badge-warning');
        let rowId = `visit-detail-${index}`;

        return `
        <tr style="background: #FFFFFF; transition: background 0.15s; border-bottom: 1px solid var(--border-light);">
            <td style="padding: 12px; font-weight: 500; color: var(--text-dark);">${enc.date}</td>
            <td style="padding: 12px;">${enc.doctor} <br><span style="font-size:0.6875rem; color:var(--text-muted);">${enc.dept}</span></td>
            <td style="padding: 12px;">${enc.diagnosis}</td>
            <td style="padding: 12px;"><span class="status-badge ${badgeClass}" style="font-size:0.6rem; padding: 2px 6px;">${enc.status}</span></td>
            <td style="padding: 12px; text-align: right;">
                <button onclick="toggleVisitDetails('${rowId}')" style="background: var(--bg-aesthetic); border: 1px solid var(--border-light); color: var(--text-dark); padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">View</button>
            </td>
        </tr>
        <tr id="${rowId}" style="display: none; background: #F8FAFC; border-bottom: 1px solid var(--border-light);">
            <td colspan="5" style="padding: 16px;">
                <div style="border-left: 3px solid var(--accent); padding-left: 16px;">
                    <span style="display: block; font-size: 0.6875rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Clinical Visit Summary</span>
                    <p style="font-size: 0.8125rem; color: var(--text-dark); margin-bottom: 8px;"><strong>Reason for Visit:</strong> ${enc.diagnosis} Evaluation</p>
                    <p style="font-size: 0.8125rem; color: var(--text-dark); margin-bottom: 8px;"><strong>Treatment/Notes:</strong> Patient scheduled/evaluated by ${enc.doctor}. Advised to return if symptoms persist.</p>
                    <div style="display: flex; gap: 16px; margin-top: 12px;">
                        <button onclick="alert('Downloading Prescription PDF...')" style="background: #FFFFFF; border: 1px solid var(--border-light); color: var(--accent); padding: 4px 12px; border-radius: 4px; font-size: 0.6875rem; font-weight: 600; cursor: pointer; transition: background 0.2s;">Download Rx</button>
                        <button onclick="alert('Opening secure lab portal...')" style="background: #FFFFFF; border: 1px solid var(--border-light); color: var(--accent); padding: 4px 12px; border-radius: 4px; font-size: 0.6875rem; font-weight: 600; cursor: pointer; transition: background 0.2s;">Lab Results</button>
                    </div>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

function renderPackageHistory(profile) {
    const packageTbody = document.getElementById('dyn-package-history');

    if (!profile || !profile.packages || profile.packages.length === 0) {
        packageTbody.innerHTML = '<tr><td colspan="6" style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.8125rem;">No active or past insurance packages on record.</td></tr>';
        return;
    }

    const sortedPackages = [...profile.packages].reverse();

    packageTbody.innerHTML = sortedPackages.map((pkg, index) => {
        let badgeClass = pkg.status.toLowerCase() === 'active' ? 'badge-scheduled' : 'badge-completed';
        let rowId = `package-detail-${index}`;

        return `
        <tr style="background: #FFFFFF; transition: background 0.15s; border-bottom: 1px solid var(--border-light);">
            <td style="padding: 12px; font-weight: 600; color: var(--text-dark);">${pkg.name}</td>
            <td style="padding: 12px; color: var(--text-mid);">${pkg.activationDate}</td>
            <td style="padding: 12px; color: var(--text-mid);">${pkg.expiryDate}</td>
            <td style="padding: 12px; color: var(--text-mid);">${pkg.usage}</td>
            <td style="padding: 12px;"><span class="status-badge ${badgeClass}" style="font-size:0.6rem; padding: 2px 6px;">${pkg.status}</span></td>
            <td style="padding: 12px; text-align: right;">
                <button onclick="togglePackageDetails('${rowId}')" style="background: var(--bg-aesthetic); border: 1px solid var(--border-light); color: var(--text-dark); padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">View</button>
            </td>
        </tr>
        <tr id="${rowId}" style="display: none; background: #F8FAFC; border-bottom: 1px solid var(--border-light);">
            <td colspan="6" style="padding: 16px;">
                <div style="border-left: 3px solid var(--accent); padding-left: 16px;">
                    <span style="display: block; font-size: 0.6875rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Package Details & Limits</span>
                    <p style="font-size: 0.8125rem; color: var(--text-dark); margin-bottom: 8px;"><strong>Coverage Breakdown:</strong> Standard plan covering In-Patient and Out-Patient services based on network tier.</p>
                    <p style="font-size: 0.8125rem; color: var(--text-dark); margin-bottom: 8px;"><strong>Co-Pay & Deductibles:</strong> ${pkg.usage}.</p>
                    <div style="display: flex; gap: 16px; margin-top: 12px;">
                        <button onclick="alert('Downloading Insurance Policy PDF...')" style="background: #FFFFFF; border: 1px solid var(--border-light); color: var(--accent); padding: 4px 12px; border-radius: 4px; font-size: 0.6875rem; font-weight: 600; cursor: pointer; transition: background 0.2s;">Download Policy</button>
                        <button onclick="alert('Opening Network Hospitals list...')" style="background: #FFFFFF; border: 1px solid var(--border-light); color: var(--accent); padding: 4px 12px; border-radius: 4px; font-size: 0.6875rem; font-weight: 600; cursor: pointer; transition: background 0.2s;">View Network</button>
                    </div>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

function renderItemConsumption(profile) {
    const itemTbody = document.getElementById('dyn-item-history');
    if (!itemTbody) return;

    if (!profile || !profile.items || profile.items.length === 0) {
        itemTbody.innerHTML = '<tr><td colspan="4" style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.8125rem;">No item consumption recorded for this patient yet.</td></tr>';
        return;
    }

    // Most recent consumption first
    const sortedItems = [...profile.items].sort((a, b) => new Date(b.date) - new Date(a.date));

    itemTbody.innerHTML = sortedItems.map(item => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid var(--border-light); font-weight: 500;">${item.date}</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border-light);">${item.description}</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border-light);">${item.qty}</td>
            <td style="padding: 12px; border-bottom: 1px solid var(--border-light);">${item.dept}</td>
        </tr>
    `).join('');
}

function toggleVisitDetails(rowId) {
    const row = document.getElementById(rowId);
    row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
}

function togglePackageDetails(rowId) {
    const row = document.getElementById(rowId);
    row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
}

/* ── UPGRADED SEARCH AUTOCOMPLETE (NID INCLUDED) ── */
function initSearchAutocomplete() {
    const searchInput = document.getElementById('header-search-input');
    const searchContainer = searchInput.closest('.context-search');

    searchContainer.style.position = 'relative';

    const dropdown = document.createElement('div');
    dropdown.id = 'search-dropdown';
    dropdown.style.cssText = 'display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100; max-height: 200px; overflow-y: auto; margin-top: 4px;';
    searchContainer.appendChild(dropdown);

    searchInput.addEventListener('input', function () {
        const query = this.value.toLowerCase().trim();
        dropdown.innerHTML = '';

        if (!query) {
            dropdown.style.display = 'none';
            return;
        }

        const uniquePatients = [];
        const seenMrns = new Set();
        appointments.forEach(app => {
            if (!seenMrns.has(app.mrn)) {
                seenMrns.add(app.mrn);
                uniquePatients.push(app);
            }
        });

        const matches = uniquePatients.filter(pt =>
            (pt.patientName && pt.patientName.toLowerCase().includes(query)) ||
            (pt.mrn && pt.mrn.toLowerCase().includes(query)) ||
            (pt.phone && pt.phone.includes(query)) ||
            (pt.nid && pt.nid.toLowerCase().includes(query))
        );

        if (matches.length > 0) {
            matches.forEach(pt => {
                const item = document.createElement('div');
                item.style.cssText = 'padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--border-light); display: flex; flex-direction: column; background: var(--bg-surface); transition: background 0.15s;';

                item.innerHTML = `<span style="font-size: 0.8125rem; font-weight: 600; color: var(--text-dark);">${pt.patientName}</span>
                                  <span style="font-size: 0.6875rem; color: var(--text-muted);">${pt.mrn} | ID: ${pt.nid || 'N/A'} | Ph: ${pt.phone}</span>`;

                item.onmouseenter = () => item.style.background = 'var(--bg-aesthetic)';
                item.onmouseleave = () => item.style.background = 'var(--bg-surface)';

                item.addEventListener('click', () => {
                    loadPatientData(pt);
                    searchInput.value = pt.patientName;
                    dropdown.style.display = 'none';
                });

                dropdown.appendChild(item);
            });
            dropdown.style.display = 'block';
        } else {
            const noItem = document.createElement('div');
            noItem.style.cssText = 'padding: 8px 12px; font-size: 0.8125rem; color: var(--text-muted); text-align: center;';
            noItem.innerText = 'No patient found';
            dropdown.appendChild(noItem);
            dropdown.style.display = 'block';
        }
    });

    document.addEventListener('click', function (e) {
        if (!searchContainer.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}

function loadPatientData(pt) {
    document.getElementById('side-pt-name').innerText = pt.patientName;
    document.getElementById('side-pt-details').innerText = `Male | DOB: ${pt.dob || 'Unknown'} \n ${pt.phone}`;

    document.getElementById('reg-patient-name').value = pt.patientName || "";
    document.getElementById('reg-patient-id').value = pt.nid || "";
    if (pt.dob) document.getElementById('reg-patient-dob').value = pt.dob;
    document.getElementById('reg-patient-phone').value = pt.phone || "";
    document.getElementById('reg-patient-resident').value = pt.resident || "yes";

    const newPatientCb = document.getElementById('cb-new-patient');
    if (newPatientCb) newPatientCb.checked = false;

    // Inject Dynamic Tabs Data
    renderClinicalHighlights(pt.clinicalProfile || null, pt.mrn);
    renderVisitHistory(pt.clinicalProfile || null, pt.mrn);
    renderPackageHistory(pt.clinicalProfile || null);
    renderItemConsumption(pt.clinicalProfile || null);
}

/* ── 5. GRID CLICK & MODAL CONTROLS ── */
function handleColumnClick(event, docName) {
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const hourFloat = GRID_START_HOUR + (y / PIXELS_PER_HOUR);
    let hour = Math.floor(hourFloat);
    let mins = Math.floor((hourFloat - hour) * 60);
    mins = Math.round(mins / 15) * 15;

    if (mins === 60) { hour += 1; mins = 0; }

    let dispHour = hour > 12 ? hour - 12 : hour;
    if (hour === 12) dispHour = 12;
    let ampm = hour >= 12 ? 'PM' : 'AM';
    let dispMin = mins === 0 ? "00" : mins;
    let timeString = `${dispHour}:${dispMin} ${ampm}`;

    openBookingPanel(docName, timeString, "");
}

function openAppointmentDetails(appId) {
    const app = appointments.find(a => a.id === appId);
    if (!app) return;
    activeAppointmentId = appId;

    let startMinStr = app.startMinute === 0 ? "00" : app.startMinute;
    let startHr = app.startHour > 12 ? app.startHour - 12 : app.startHour; if (app.startHour === 12) startHr = 12;
    let startAmPm = app.startHour >= 12 ? "PM" : "AM";
    document.getElementById('modal-header-text').innerText = `Appointment with ${app.doctorName} on ${app.date} @ ${startHr}:${startMinStr} ${startAmPm}`;

    const badge = document.getElementById('view-status-badge');
    badge.style.display = 'inline-flex';
    badge.className = `status-badge badge-${app.status === 'past' ? 'completed' : app.status}`;
    badge.innerText = app.status === 'arrived' ? 'Checked In' : (app.status === 'warning' ? 'Late / Warning' : (app.status === 'completed' ? 'Completed' : app.status));

    document.getElementById('side-pt-name').innerText = app.patientName;
    document.getElementById('side-pt-details').innerText = `Male | DOB: ${app.dob || 'Unknown'} \n ${app.phone}`;
    document.getElementById('header-search-input').value = app.patientName;

    document.getElementById('reg-patient-name').value = app.patientName || "";
    document.getElementById('reg-patient-id').value = app.nid || "";
    document.getElementById('reg-patient-dob').value = app.dob || "";
    document.getElementById('reg-patient-phone').value = app.phone || "";
    document.getElementById('reg-patient-resident').value = app.resident || "yes";

    const newPatientCb = document.getElementById('cb-new-patient');
    if (newPatientCb) newPatientCb.checked = false;

    document.getElementById('panel-doc-input').value = app.doctorName;
    document.getElementById('panel-reason-input').value = app.reason;
    document.getElementById('panel-duration-input').value = app.duration;
    document.getElementById('panel-date-input').value = app.date;

    const timeSelect = document.getElementById('panel-time-input');
    const timeString = `${startHr}:${startMinStr} ${startAmPm}`;
    if (!Array.from(timeSelect.options).some(opt => opt.value === timeString)) {
        const opt = document.createElement('option'); opt.value = timeString; opt.innerText = timeString; timeSelect.appendChild(opt);
    }
    timeSelect.value = timeString;

    document.querySelector('input[name="billing_mode"][value="cash"]').checked = true;
    setBillingMode('cash');

    // Inject Dynamic Tabs Data
    renderClinicalHighlights(app.clinicalProfile || null, app.mrn);
    renderVisitHistory(app.clinicalProfile || null, app.mrn);
    renderPackageHistory(app.clinicalProfile || null);
    renderItemConsumption(app.clinicalProfile || null);

    renderFooterButtons(app);
    document.getElementById('bookingPanel').classList.add('open');
    document.getElementById('backdrop').classList.add('open');
    switchTab('tab-appointment', document.querySelector('.erp-tab'));
}

function openBookingPanel(docName, timeStr, patientName) {
    activeAppointmentId = null;
    document.getElementById('modal-header-text').innerText = "New Appointment Registration";
    document.getElementById('view-status-badge').style.display = 'none';

    document.getElementById('side-pt-name').innerText = "New Patient";
    document.getElementById('side-pt-details').innerText = "Enter details to generate summary";
    document.getElementById('header-search-input').value = patientName || "";

    const newPatientCb = document.getElementById('cb-new-patient');
    if (newPatientCb) newPatientCb.checked = true;

    document.getElementById('reg-patient-name').value = patientName || "";
    document.getElementById('reg-patient-id').value = "";
    document.getElementById('reg-patient-dob').value = "";
    document.getElementById('reg-patient-phone').value = "";
    document.getElementById('reg-patient-resident').value = "yes";

    document.querySelector('input[name="billing_mode"][value="cash"]').checked = true;
    setBillingMode('cash');

    document.getElementById('reg-insurance-company').value = "";
    document.getElementById('reg-insurance-type').value = "";
    document.getElementById('reg-insurance-expiry').value = "";
    document.getElementById('reg-insurance-copay').value = "";

    document.getElementById('panel-reason-input').value = "";
    document.getElementById('panel-duration-input').value = "45";

    if (docName) document.getElementById('panel-doc-input').value = docName;
    else document.getElementById('panel-doc-input').selectedIndex = 0;

    const dateStr = formatDateKey(selectedDate);
    document.getElementById('panel-date-input').value = dateStr;

    const timeSelect = document.getElementById('panel-time-input');
    if (timeStr) {
        if (!Array.from(timeSelect.options).some(opt => opt.value === timeStr)) {
            const opt = document.createElement('option'); opt.value = timeStr; opt.innerText = timeStr; timeSelect.appendChild(opt);
        }
        timeSelect.value = timeStr;
    } else timeSelect.selectedIndex = 0;

    // Clear out Dynamic Tabs for New Patient
    renderClinicalHighlights(null, null);
    renderVisitHistory(null, null);
    renderPackageHistory(null);
    renderItemConsumption(null);

    renderFooterButtons(null);
    document.getElementById('bookingPanel').classList.add('open');
    document.getElementById('backdrop').classList.add('open');
    switchTab('tab-appointment', document.querySelector('.erp-tab'));
}

function renderFooterButtons(app) {
    const footer = document.getElementById('panel-footer-actions');
    footer.innerHTML = '';

    if (app && (app.status === 'completed' || app.status === 'past' || app.status === 'cancelled')) {
        const statusMsg = document.createElement('div');
        statusMsg.style.fontSize = '0.875rem'; statusMsg.style.fontWeight = '600';
        statusMsg.style.color = (app.status === 'cancelled') ? 'var(--danger)' : 'var(--success-text)';
        statusMsg.innerHTML = (app.status === 'cancelled') ? '✕ Appointment Cancelled' : '✓ Appointment Completed';

        const closeBtn = document.createElement('button'); closeBtn.className = 'btn-secondary'; closeBtn.innerHTML = 'Close Panel'; closeBtn.onclick = () => closeBookingPanel();

        footer.style.justifyContent = 'space-between'; footer.appendChild(statusMsg); footer.appendChild(closeBtn);
    } else {
        const cancelBtn = document.createElement('button'); cancelBtn.className = 'btn-ghost'; cancelBtn.innerHTML = 'Cancel'; cancelBtn.onclick = () => closeBookingPanel();

        const rightBtns = document.createElement('div'); rightBtns.style.display = 'flex'; rightBtns.style.gap = '12px';

        if (app) {
            const checkInBtn = document.createElement('button');
            if (app.status === 'arrived') {
                checkInBtn.className = 'btn-secondary'; checkInBtn.innerHTML = 'Undo Check-in'; checkInBtn.onclick = () => toggleCheckIn(app.id, 'scheduled');
            } else {
                checkInBtn.className = 'btn-secondary'; checkInBtn.style.color = 'var(--success-text)'; checkInBtn.style.borderColor = '#A7F3D0'; checkInBtn.innerHTML = 'Check-in Patient'; checkInBtn.onclick = () => toggleCheckIn(app.id, 'arrived');
            }
            rightBtns.appendChild(checkInBtn);
        }

        const saveBtn = document.createElement('button'); saveBtn.className = 'btn-primary'; saveBtn.innerHTML = 'Save Appointment'; saveBtn.onclick = () => saveAppointmentForm();
        rightBtns.appendChild(saveBtn);

        footer.style.justifyContent = 'flex-end';
        if (app) {
            const deleteBtn = document.createElement('button'); deleteBtn.className = 'btn-ghost'; deleteBtn.innerHTML = 'Cancel Appt'; deleteBtn.onclick = () => cancelAppointment(app.id);
            footer.style.justifyContent = 'space-between'; footer.appendChild(deleteBtn);
        } else {
            footer.appendChild(cancelBtn);
        }
        footer.appendChild(rightBtns);
    }
}

function toggleCheckIn(appId, newStatus) {
    const app = appointments.find(a => a.id === appId); if (!app) return;
    app.status = newStatus; localStorage.setItem('medcore_appointments', JSON.stringify(appointments));
    if (newStatus === 'arrived') {
        addToLiveQueue(app);
        logActivity(`${app.patientName} checked in`, 'by Reception');
    } else {
        logActivity(`Undid check-in for ${app.patientName}`, 'by Reception');
    }
    const formattedDate = formatDateKey(selectedDate); renderAppointmentsForDate(formattedDate); openAppointmentDetails(appId);
}

// ── OVERHAULED: SMART IDENTITY MATCHING & GLOBAL PROFILE SYNC ──
function saveAppointmentForm() {
    const name = document.getElementById('reg-patient-name').value.trim();
    const nid = document.getElementById('reg-patient-id').value.trim();
    const dob = document.getElementById('reg-patient-dob').value;
    const phone = document.getElementById('reg-patient-phone').value.trim();
    const resident = document.getElementById('reg-patient-resident').value;
    const doc = document.getElementById('panel-doc-input').value;
    const date = document.getElementById('panel-date-input').value;
    const timeStr = document.getElementById('panel-time-input').value;
    const duration = parseInt(document.getElementById('panel-duration-input').value);
    const reason = document.getElementById('panel-reason-input').value.trim();

    if (!name || !doc || !date || !timeStr) { alert('Please fill in all required fields.'); return; }

    let newPackageObj = null;
    if (currentBillingMode === 'insurance') {
        const insCompany = document.getElementById('reg-insurance-company').value.trim();
        const insType = document.getElementById('reg-insurance-type').value.trim();
        const insExpiry = document.getElementById('reg-insurance-expiry').value;
        const insCopay = document.getElementById('reg-insurance-copay').value;

        if (!insCompany || !insType || !insExpiry || !insCopay) {
            alert('Please fill in all required Insurance details.');
            return;
        }
        if (parseInt(insCopay) < 20) {
            alert('CoPay must be at minimum 20 AED.');
            return;
        }

        const today = new Date();
        const todayStr = shortMonths[today.getMonth()] + " " + String(today.getDate()).padStart(2, '0') + ", " + today.getFullYear();
        let expDateObj = new Date(insExpiry);
        const expStr = shortMonths[expDateObj.getMonth()] + " " + String(expDateObj.getDate()).padStart(2, '0') + ", " + expDateObj.getFullYear();

        newPackageObj = {
            name: `${insCompany} - ${insType}`,
            activationDate: todayStr,
            expiryDate: expStr,
            usage: `Out-Patient: ${insCopay} AED CoPay`,
            status: "Active"
        };
    }

    const timeParsed = parseTimeString(timeStr);
    const colIndex = getColIndexForDoctor(doc);

    if (activeAppointmentId) {
        const app = appointments.find(a => a.id === activeAppointmentId);
        if (app) {
            app.patientName = name; app.nid = nid; app.dob = dob; app.phone = phone;
            app.resident = resident; app.doctorName = doc; app.colIndex = colIndex;
            app.date = date; app.startHour = timeParsed.hour; app.startMinute = timeParsed.minute;
            app.duration = duration; app.reason = reason; app.modifiedDate = nowStamp();

            if (newPackageObj) {
                if (!app.clinicalProfile) app.clinicalProfile = { packages: [], encounters: [], conditions: [], allergies: [] };
                if (!app.clinicalProfile.packages) app.clinicalProfile.packages = [];
                app.clinicalProfile.packages.push(newPackageObj);
            }

            const updatedProfile = app.clinicalProfile;
            appointments.forEach(a => {
                if (a.mrn === app.mrn) {
                    a.clinicalProfile = updatedProfile ? JSON.parse(JSON.stringify(updatedProfile)) : null;
                }
            });

            logActivity(`Updated appointment for ${name}`, 'by admin');
        }
    } else {
        let existingPt = appointments.find(a =>
            (a.nid === nid && nid !== '') ||
            (a.phone === phone && phone !== '')
        );

        let targetMrn = existingPt ? existingPt.mrn : generateUniqueMrn();

        let sharedProfile = null;
        if (existingPt && existingPt.clinicalProfile) {
            sharedProfile = JSON.parse(JSON.stringify(existingPt.clinicalProfile));
        } else if (newPackageObj) {
            sharedProfile = { packages: [], encounters: [], conditions: [], allergies: [] };
        }

        if (newPackageObj) {
            if (!sharedProfile) sharedProfile = { packages: [], encounters: [], conditions: [], allergies: [] };
            if (!sharedProfile.packages) sharedProfile.packages = [];
            sharedProfile.packages.push(newPackageObj);
        }

        const newApp = {
            id: 'app-' + Date.now(),
            patientName: name,
            mrn: targetMrn,
            nid: nid || (existingPt ? existingPt.nid : '784-XXXX-XXXXXXX-X'),
            dob: dob || (existingPt ? existingPt.dob : ''),
            phone: phone || (existingPt ? existingPt.phone : '+971 50 000 0000'),
            resident: resident,
            doctorName: doc,
            colIndex: colIndex,
            date: date,
            startHour: timeParsed.hour,
            startMinute: timeParsed.minute,
            duration: duration,
            reason: reason || 'General consultation.',
            status: 'scheduled',
            confirmStatus: 'pending',
            overdue: existingPt ? (existingPt.overdue || 0) : 0,
            createdDate: nowStamp(),
            modifiedDate: nowStamp(),
            clinicalProfile: sharedProfile
        };
        appointments.push(newApp);

        if (existingPt) {
            appointments.forEach(a => {
                if (a.mrn === targetMrn) {
                    a.clinicalProfile = sharedProfile ? JSON.parse(JSON.stringify(sharedProfile)) : null;
                }
            });
        }

        logActivity(`Booked appointment for ${name} with ${doc}`, 'by admin');
    }

    localStorage.setItem('medcore_appointments', JSON.stringify(appointments));
    renderAppointmentsForDate(formatDateKey(selectedDate));
    closeBookingPanel();
}

function cancelAppointment(appId) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    const app = appointments.find(a => a.id === appId);
    if (app) {
        app.status = 'cancelled';
        localStorage.setItem('medcore_appointments', JSON.stringify(appointments));
        logActivity(`Cancelled appointment for ${app.patientName}`, 'by admin');
    }
    renderAppointmentsForDate(formatDateKey(selectedDate));
    closeBookingPanel();
}

function closeBookingPanel() {
    document.getElementById('bookingPanel').classList.remove('open'); document.getElementById('backdrop').classList.remove('open');
}

/* ── 6. TAB SWITCHBOARD LOGIC ── */
function switchTab(tabId, btnElement) {
    document.querySelectorAll('.erp-tab').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

window.onload = () => {
    // Honour the shared view-date (?date=) so the scheduler opens on the
    // selected day; default to today.
    const vd = (typeof medcoreViewDate === 'function') ? medcoreViewDate() : null;
    selectedDate = vd ? new Date(vd + 'T00:00:00') : new Date();
    if (isNaN(selectedDate)) selectedDate = new Date();
    displayMonthDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);

    document.getElementById('header-date-text').textContent = selectedDate.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });

    initAppointments();
    renderCalendar();
    buildGridStructure();
    initSearchAutocomplete();

    // Keep the insurance context bar in sync as policy fields are edited
    ['reg-insurance-company', 'reg-insurance-type', 'reg-insurance-expiry', 'reg-insurance-copay'].forEach(id => {
        const field = document.getElementById(id);
        if (field) field.addEventListener('input', refreshInsuranceContextBar);
    });

    const formattedDate = formatDateKey(selectedDate);
    document.getElementById('panel-date-input').value = formattedDate;

    renderAppointmentsForDate(formattedDate);
    smartAutoScroll();

    // Prefill from "Book Visit" in the Patient Directory
    try {
        const prefill = JSON.parse(localStorage.getItem('medcore_prefill_patient'));
        if (prefill && prefill.patientName) {
            openBookingPanel('', '', prefill.patientName);
            const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
            setVal('reg-patient-name', prefill.patientName);
            setVal('reg-patient-id', prefill.nid);
            setVal('reg-patient-phone', prefill.phone);
            setVal('reg-patient-dob', prefill.dob);
            const cb = document.getElementById('cb-new-patient'); if (cb) cb.checked = false;
        }
        localStorage.removeItem('medcore_prefill_patient');
    } catch (e) { /* no prefill */ }

    setInterval(() => {
        updateTimeIndicator();
        renderAppointmentsForDate(formatDateKey(selectedDate));
    }, 60000);
};