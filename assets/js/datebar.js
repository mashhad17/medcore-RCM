/* ─────────────────────────────────────────────────
   MEDCORE HMS · SHARED VIEW-DATE BAR
   ------------------------------------------------
   A single date control (used in every page header) that sets the "view date"
   via the ?date=YYYY-MM-DD URL param. Default = today. Pages read
   medcoreViewDate() to scope their data; live behaviour only applies when the
   view date is today.
   ───────────────────────────────────────────────── */
(function () {
    function pad(n) { return String(n).padStart(2, '0'); }
    function fmt(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

    function todayStr() { return fmt(new Date()); }

    function viewDate() {
        const p = new URLSearchParams(location.search).get('date');
        return (p && /^\d{4}-\d{2}-\d{2}$/.test(p)) ? p : todayStr();
    }
    function isToday() { return viewDate() === todayStr(); }

    function setViewDate(date) {
        const url = new URL(location.href);
        if (!date || date === todayStr()) url.searchParams.delete('date');
        else url.searchParams.set('date', date);
        location.href = url.toString();
    }

    function shiftDay(n) {
        const d = new Date(viewDate() + 'T00:00:00');
        d.setDate(d.getDate() + n);
        setViewDate(fmt(d));
    }

    function prettyDate(s) {
        const d = new Date(s + 'T00:00:00');
        if (isNaN(d)) return s;
        return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    }

    function init() {
        const input = document.getElementById('viewDate');
        if (input) {
            input.value = viewDate();
            input.max = todayStr(); // history only — no future days
            input.addEventListener('change', () => setViewDate(input.value));
        }
        const prev = document.getElementById('viewDatePrev');
        const next = document.getElementById('viewDateNext');
        const todayBtn = document.getElementById('viewDateToday');
        if (prev) prev.onclick = () => shiftDay(-1);
        if (next) next.onclick = () => shiftDay(1);
        if (next && isToday()) next.setAttribute('disabled', 'disabled'); // can't go past today
        if (todayBtn) {
            todayBtn.onclick = () => setViewDate(todayStr());
            todayBtn.style.display = isToday() ? 'none' : '';
        }
        // "Viewing history" badge for any non-today date
        document.querySelectorAll('.viewing-badge').forEach(b => {
            if (!isToday()) { b.style.display = 'inline-flex'; b.textContent = 'Viewing ' + prettyDate(viewDate()); }
        });
    }

    // expose
    window.medcoreToday = todayStr;
    window.medcoreViewDate = viewDate;
    window.medcoreIsToday = isToday;
    window.medcoreSetViewDate = setViewDate;
    window.medcorePrettyDate = prettyDate;

    document.addEventListener('DOMContentLoaded', init);
})();
