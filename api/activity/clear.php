<?php
/* ============================================================
   MedCore HMS — Clear activity log (Reception Shift Control)
   POST → empties the activity_log server-side for all users.
   Returns { ok: true }.
   ============================================================ */

require_once __DIR__ . '/../../lib.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'POST required']);
    exit;
}

try {
    $pdo = medcore_db();
    $pdo->exec("DELETE FROM activity_log");
    echo json_encode(['ok' => true]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
