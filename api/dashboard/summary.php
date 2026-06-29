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

    // Reflect the Doctor Portal live: a finished consult advances the patient
    // Consultation → Billing before we compute the board, so the dashboard
    // updates within one poll instead of waiting for a page reload.
    mc_sync_status_from_portal($pdo);

    $today = $pdo->query("SELECT CURDATE()")->fetchColumn();
    $date  = (isset($_GET['date']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['date'])) ? $_GET['date'] : $today;
    $isToday = ($date === $today);

    echo json_encode([
        'date'         => $date,
        'isToday'      => $isToday,
        'metrics'      => mc_dashboard_metrics($pdo, $date),
        'providers'    => mc_provider_status($pdo),
        // Today shows the live waiting room; a past day shows that day's appointments.
        'nextUp'       => $isToday ? mc_next_up($pdo, 5) : mc_appointments_on($pdo, $date),
        'activity'     => mc_recent_activity($pdo, 20),
        'appointments' => mc_today_appointments($pdo, $date),
        'generatedAt'  => date('c'),
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error', 'details' => $e->getMessage()]);
}
