/* ============================================================
   MedCore HMS — Storage bridge
   Keeps the existing localStorage-based front-end intact, but
   mirrors every write of the core collections to the MySQL
   database via api.php. The page is primed from the DB by
   bootstrap.php, so localStorage stays the fast read cache while
   MySQL is the durable source of truth.
   ============================================================ */
(function () {
    // localStorage key  ->  api.php resource name
    var SYNCED = {
        'medcore_appointments': 'appointments',
        'medcore_payments': 'payments',
        'medcore_live_queue': 'queue',
        'medcore_activity_log': 'activity'
    };

    if (window.__medcoreStorePatched) return;
    window.__medcoreStorePatched = true;

    var nativeSetItem = localStorage.setItem.bind(localStorage);
    var nativeRemoveItem = localStorage.removeItem.bind(localStorage);

    // Browsers cap any `keepalive` fetch body at 64 KB. Consent signatures
    // (base64 PNGs) push the appointments payload past that, which would
    // SILENTLY drop the write and the record would never reach MySQL.
    // So only use keepalive for small bodies; send larger ones as a normal
    // fetch (the server's post_max_size is 40 MB). Failures are surfaced to
    // the console instead of being swallowed.
    var KEEPALIVE_LIMIT = 60000; // stay safely under the 64 KB browser cap

    function persist(resource, jsonString) {
        var body = jsonString && jsonString.length ? jsonString : '[]';
        var opts = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body
        };
        if (body.length < KEEPALIVE_LIMIT) opts.keepalive = true;

        try {
            fetch('api.php?resource=' + resource, opts)
                .then(function (r) {
                    if (!r.ok) console.warn('[medcore] DB sync failed for "' + resource + '": HTTP ' + r.status);
                })
                .catch(function (e) {
                    // offline / DB down: localStorage still holds it, but make it visible
                    console.warn('[medcore] DB sync error for "' + resource + '":', e);
                });
        } catch (e) {
            console.warn('[medcore] DB sync threw for "' + resource + '":', e);
        }
    }

    localStorage.setItem = function (key, value) {
        nativeSetItem(key, value);
        if (SYNCED[key]) persist(SYNCED[key], value);
    };

    localStorage.removeItem = function (key) {
        nativeRemoveItem(key);
        if (SYNCED[key]) persist(SYNCED[key], '[]');
    };
})();
