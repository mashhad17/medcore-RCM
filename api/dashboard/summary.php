<?php
/* ============================================================
   MedCore HMS — Dashboard summary (Reception Shift Control)
   GET → one command-center payload, polled by dashboard.js:
     { metrics, providers, nextUp, activity, generatedAt }
   All values are computed live from MySQL.
   ============================================================ */

require_once __DIR__ . '/../../lib.php';
header('Content-Type: application/json');

try {
    $pdo = medcore_db();

    echo json_encode([
        'metrics'      => mc_dashboard_metrics($pdo),
        'providers'    => mc_provider_status($pdo),
        'nextUp'       => mc_next_up($pdo, 5),
        'activity'     => mc_recent_activity($pdo, 20),
        'appointments' => mc_today_appointments($pdo),
        'generatedAt'  => date('c'),
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error', 'details' => $e->getMessage()]);
}
