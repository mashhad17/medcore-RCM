<?php
/* ============================================================
   MedCore HMS — Quick Walk-In (Reception Shift Control)
   POST JSON { name, phone, doctor } →
     creates a real patient + 'arrived' appointment (today, now)
     + live-queue entry, logs the event, all in one transaction.
   Returns { ok, mrn, appointmentId } or { ok:false, error }.
   ============================================================ */

require_once __DIR__ . '/../lib.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'POST required']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) $body = [];

$name   = trim((string)($body['name']   ?? ''));
$phone  = trim((string)($body['phone']  ?? ''));
$doctor = trim((string)($body['doctor'] ?? '')) ?: 'Unassigned';

/* ── Server-side validation ── */
$errors = [];
if ($name === '')  $errors[] = 'Patient name is required.';
if ($phone === '') $errors[] = 'Phone number is required.';
// Lenient international format: digits, spaces, + and -, at least 7 digits.
elseif (!preg_match('/^[0-9+\-\s]{7,}$/', $phone) || preg_match_all('/\d/', $phone) < 7) {
    $errors[] = 'Phone number looks invalid.';
}
if ($errors) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => implode(' ', $errors)]);
    exit;
}

try {
    $pdo = medcore_db();
    $pdo->beginTransaction();

    // Unique MRN: MRN-<YYYY>-<6 digits>, retry on the rare collision.
    $year = date('Y');
    $check = $pdo->prepare("SELECT 1 FROM patients WHERE mrn = ?");
    do {
        $mrn = 'MRN-' . $year . '-' . str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $check->execute([$mrn]);
    } while ($check->fetchColumn());

    $pid = mc_upsert_patient($pdo, [
        'mrn'       => $mrn,
        'full_name' => $name,
        'phone'     => $phone,
    ]);

    $did      = mc_lookup_doctor($pdo, $doctor);
    $apptId   = uniqid('app-');
    $nowParts = $pdo->query("SELECT HOUR(NOW()) AS h, MINUTE(NOW()) AS m")->fetch();

    $pdo->prepare(
        "INSERT INTO appointments
         (id, patient_id, doctor_id, appt_date, start_hour, start_minute, duration_min,
          reason, status)
         VALUES (?, ?, ?, CURDATE(), ?, ?, 15, 'Walk-in Fast Track', 'arrived')"
    )->execute([$apptId, $pid, $did, (int)$nowParts['h'], (int)$nowParts['m']]);

    $pdo->prepare(
        "INSERT INTO live_queue (patient_id, doctor_label, reason, checked_in_at)
         VALUES (?, ?, 'Walk-in Fast Track', ?)"
    )->execute([$pid, $doctor, date('c')]);

    $shortDoc = preg_split('/\s*\(/', $doctor)[0];
    mc_log_event($pdo, "Walk-in patient $name routed to $shortDoc", 'Reception', 'walkin');

    $pdo->commit();

    echo json_encode(['ok' => true, 'mrn' => $mrn, 'appointmentId' => $apptId]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
