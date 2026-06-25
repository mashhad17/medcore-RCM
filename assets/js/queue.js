/* ─────────────────────────────────────────────────
   MEDCORE HMS · LIVE QUEUE LOGIC (WITH LOGGING HOOKS)
   ───────────────────────────────────────────────── */

// GLOBAL LEDGER HELPER
function logActivity(text, author) {
    let logs = JSON.parse(localStorage.getItem('medcore_activity_log')) || [];
    const now = new Date();
    let hours = now.getHours();
    let ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    let mins = now.getMinutes().toString().padStart(2, '0');
    
    logs.unshift({ time: `${hours}:${mins} ${ampm}`, text: text, author: author });
    if(logs.length > 50) logs.pop(); // Cap memory at 50 logs
    
    localStorage.setItem('medcore_activity_log', JSON.stringify(logs));
}

function moveCard(cardId, targetColId) {
    const card = document.getElementById(cardId);
    const targetColBody = document.querySelector(`#${targetColId} .col-body`);
    const ptName = card.querySelector('.pt-name-text').innerText;
    
    card.classList.add('moving');
    
    setTimeout(() => {
        const btn = card.querySelector('.btn-card-action');
        if(targetColId === 'col-consultation') {
            btn.innerHTML = "Send to Billing &rarr;";
            btn.onclick = function() { moveCard(cardId, 'col-billing'); };
            card.querySelector('.timer-badge').setAttribute('data-minutes', '0');
            card.querySelector('.time-text').innerText = "0 m";
            
            // HOOK: Log Consultation
            logActivity(`Sent ${ptName} to Consultation Room`, 'by System');
        } 
        else if (targetColId === 'col-billing') {
            btn.innerHTML = "Complete & Discharge";
            btn.classList.add('btn-card-checkout');
            btn.onclick = function() { dischargeCard(cardId); };
            
            const emptyState = document.getElementById('empty-billing');
            if(emptyState) emptyState.style.display = 'none';
            
            // HOOK: Log Billing
            logActivity(`Sent ${ptName} to Billing`, 'by System');
        }

        targetColBody.appendChild(card);
        card.classList.remove('moving');
        
        updateColors();
        updateCounts();
    }, 300);
}

function dischargeCard(cardId) {
    const card = document.getElementById(cardId);
    const ptName = card.querySelector('.pt-name-text').innerText;
    
    card.classList.add('moving');
    setTimeout(() => {
        card.remove();
        updateCounts();
        
        // HOOK: Log Discharge
        logActivity(`Discharged ${ptName} after checkout`, 'by Accounts');
    }, 300);
}

function updateTimers() {
    const badges = document.querySelectorAll('.timer-badge');
    badges.forEach(badge => {
        let mins = parseInt(badge.getAttribute('data-minutes'));
        mins++;
        badge.setAttribute('data-minutes', mins);
        badge.querySelector('.time-text').innerText = mins + " m";
    });
    updateColors();
}

function updateColors() {
    const badges = document.querySelectorAll('.timer-badge');
    badges.forEach(badge => {
        let mins = parseInt(badge.getAttribute('data-minutes'));
        badge.classList.remove('timer-safe', 'timer-warning', 'timer-danger');
        if(mins >= 30) {
            badge.classList.add('timer-danger');
        } else if (mins >= 15) {
            badge.classList.add('timer-warning');
        } else {
            badge.classList.add('timer-safe');
        }
    });
}

function updateCounts() {
    const countVisible = (selector) => {
        return Array.from(document.querySelectorAll(selector)).filter(card => card.style.display !== 'none').length;
    };
    
    document.getElementById('count-waiting').innerText = countVisible('#col-waiting .queue-card');
    document.getElementById('count-consultation').innerText = countVisible('#col-consultation .queue-card');
    document.getElementById('count-billing').innerText = countVisible('#col-billing .queue-card');
}

function filterQueue() {
    const filterValue = document.getElementById("queuePhysicianFilter").value;
    const searchValue = document.getElementById("queueSearchInput").value.toLowerCase();
    const cards = document.querySelectorAll('.queue-card');
    
    cards.forEach(card => {
        const doc = card.getAttribute('data-physician');
        const cardText = card.innerText.toLowerCase();
        
        const docMatch = (filterValue === 'all' || doc === filterValue);
        const searchMatch = cardText.includes(searchValue);
        
        if(docMatch && searchMatch) {
            card.style.display = 'flex'; 
        } else {
            card.style.display = 'none';
        }
    });
    
    updateCounts();
}

/* ── RENDER PATIENTS ADDED FROM THE SCHEDULER (medcore_live_queue) ── */
function sigInitials(name) {
    return (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function buildWaitingCard(item, idx) {
    const id = 'card-live-' + idx;
    const docShort = (item.doctor || 'Unassigned').split(' (')[0];
    const mins = item.checkedInAt ? Math.max(0, Math.floor((Date.now() - new Date(item.checkedInAt)) / 60000)) : 0;
    const avatarClass = ['avatar-orange', 'avatar-blue', 'avatar-green'][idx % 3];

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
            <div class="timer-badge timer-safe" data-minutes="${mins}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span class="time-text">${mins} m</span>
            </div>
        </div>
        <div class="card-middle">
            <div class="detail-row"><span class="detail-label">Assigned:</span> <span class="detail-value doc-text">${docShort}</span></div>
            <div class="detail-row"><span class="detail-label">Reason:</span> <span class="detail-value">${item.reason || 'Consultation'}</span></div>
        </div>
        <button class="btn-card-action" onclick="moveCard('${id}', 'col-consultation')">
            Send to Consultation &rarr;
        </button>`;
    return card;
}

function renderLiveQueue() {
    const body = document.querySelector('#col-waiting .col-body');
    if (!body) return;

    const queue = JSON.parse(localStorage.getItem('medcore_live_queue')) || [];
    const existingMrns = new Set(
        Array.from(document.querySelectorAll('.queue-card .pt-mrn')).map(el => el.innerText.trim())
    );

    queue.forEach((item, i) => {
        if (item.mrn && existingMrns.has(item.mrn)) return;   // avoid duplicating demo cards
        body.appendChild(buildWaitingCard(item, i));
        existingMrns.add(item.mrn);
    });

    updateColors();
    updateCounts();
}

document.addEventListener('DOMContentLoaded', renderLiveQueue);

// Start automated timer (Ticks every 60s)
setInterval(updateTimers, 60000);