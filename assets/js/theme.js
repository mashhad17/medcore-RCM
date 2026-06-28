// 1. Instantly check local storage BEFORE the page renders
if (localStorage.getItem('medcore_theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
} else {
    document.documentElement.setAttribute('data-theme', 'light');
}

// 2. The toggle function (Triggers when the button is clicked)
function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const target = current === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', target);
    localStorage.setItem('medcore_theme', target);
    
    updateThemeIcon(target);
}

// 3. Update the SVG icon visually (Moon for dark, Sun for light)
function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if(!icon) return;
    
    if (theme === 'dark') {
        // Sun Icon (To switch back to light)
        icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    } else {
        // Moon Icon (To switch to dark)
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    }
}

// 4. Ensure the icon matches the state when the page finishes loading
document.addEventListener('DOMContentLoaded', () => {
    if(localStorage.getItem('medcore_theme') === 'dark') {
        updateThemeIcon('dark');
    }
});

// 5. Live UAE clock (Gulf Standard Time, UTC+4 — no daylight saving)
function updateUAEClock() {
    var now = new Date();
    var timeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Dubai',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    var dateStr = now.toLocaleDateString('en-US', {
        timeZone: 'Asia/Dubai',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    var timeEl = document.getElementById('header-time');
    var dateEl = document.getElementById('header-date');
    if (timeEl) timeEl.textContent = timeStr;
    if (dateEl) dateEl.textContent = dateStr;
}

document.addEventListener('DOMContentLoaded', function () {
    updateUAEClock();
    setInterval(updateUAEClock, 1000);
});

// 6. Sign out — ends the staff session and returns to the login screen.
function medcoreSignOut() {
    if (!confirm('Sign out of MedCore?')) return;
    try {
        localStorage.removeItem('medcore_remember_device');
        sessionStorage.clear();
    } catch (e) { /* storage unavailable */ }
    window.location.href = 'index.php';
}

// Inject a Sign out button into every page's sidebar footer (next to the theme
// toggle) so it's consistent everywhere without editing each page.
document.addEventListener('DOMContentLoaded', function () {
    var footer = document.querySelector('.sidebar-footer');
    if (!footer || document.getElementById('signOutBtn')) return;
    var btn = document.createElement('button');
    btn.id = 'signOutBtn';
    btn.className = 'fade-text';
    btn.title = 'Sign out';
    btn.setAttribute('onclick', 'medcoreSignOut()');
    btn.style.cssText = 'background:transparent;border:none;cursor:pointer;color:var(--text-muted);display:flex;align-items:center;justify-content:center;padding:4px;border-radius:8px;margin-left:6px;transition:color 0.2s;';
    btn.onmouseenter = function () { btn.style.color = 'var(--danger)'; };
    btn.onmouseleave = function () { btn.style.color = 'var(--text-muted)'; };
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>';
    var themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn && themeBtn.parentNode) themeBtn.parentNode.insertBefore(btn, themeBtn.nextSibling);
    else footer.appendChild(btn);
});