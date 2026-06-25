<?php
/* ============================================================
   MedCore HMS — Page bootstrap
   Loads the current data from MySQL and primes localStorage
   BEFORE the app's JavaScript runs, so all existing front-end
   logic keeps working unchanged — but the database is now the
   source of truth. Writes are mirrored back via assets/js/store.js.

   If the database isn't reachable yet, it silently does nothing
   and the front-end falls back to its built-in demo seeding.
   ============================================================ */

require_once __DIR__ . '/lib.php';

$boot = ['appointments' => null, 'payments' => null, 'queue' => null, 'activity' => null];
try {
    $pdo = medcore_db();
    $boot['appointments'] = mc_get_appointments($pdo);
    $boot['payments']     = mc_get_payments($pdo);
    $boot['queue']        = mc_get_queue($pdo);
    $boot['activity']     = mc_get_activity($pdo);
} catch (Throwable $e) {
    // DB not set up — leave $boot null so the JS seeds itself.
}
?>
<script>
(function () {
    try {
        // Prevent the legacy one-time cache wipe from clearing DB-loaded data
        localStorage.setItem('medcore_v9_visit_history_sync', 'true');

        <?php if (!empty($boot['appointments'])): ?>
        localStorage.setItem('medcore_appointments', <?= json_encode(json_encode($boot['appointments'])) ?>);
        <?php endif; ?>
        <?php if (!empty($boot['payments'])): ?>
        localStorage.setItem('medcore_payments', <?= json_encode(json_encode($boot['payments'])) ?>);
        <?php endif; ?>
        <?php if (!empty($boot['queue'])): ?>
        localStorage.setItem('medcore_live_queue', <?= json_encode(json_encode($boot['queue'])) ?>);
        <?php endif; ?>
        <?php if (!empty($boot['activity'])): ?>
        localStorage.setItem('medcore_activity_log', <?= json_encode(json_encode($boot['activity'])) ?>);
        <?php endif; ?>
    } catch (e) { /* storage unavailable */ }
})();
</script>
