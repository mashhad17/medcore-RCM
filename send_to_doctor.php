<?php
/* ============================================================
   MedCore HMS — Send Consultation to Doctor Portal (bridge)
   ------------------------------------------------------------
   Reception calls this endpoint (POST JSON) when it sends a
   consultation request to a specific doctor. It writes the
   patient + a 'Scheduled' appointment directly into the doctor
   portal database (`medical_center`) on the same MySQL server,
   so the consultation shows up on that doctor's dashboard.

   The two apps stay independent; this is the single point of
   contact between them.

   POST body (JSON):
     {
       "extRef":      "app-1750000000000",  // reception appointment id
       "doctorName":  "Dr. Fatima (Dental Surgery)",
       "patientName": "Sara Khan",
       "mrn":         "MRN-2026-0006",
       "dob":         "1990-04-12",          // optional
       "gender":      "Female",              // optional
       "phone":       "+971 50 765 4321",    // optional
       "reason":      "Dental exam and scale", // optional
       "date":        "2026-06-24",          // optional, defaults today
       "time":        "09:00"                // optional, defaults 09:00
     }
   ============================================================ */

header('Content-Type: application/json');

/** Connect to the doctor portal database (same XAMPP MySQL server). */
function portal_db()
{
    static $pdo = null;
    if ($pdo) return $pdo;
    $pdo = new PDO(
        'mysql:host=127.0.0.1;dbname=medical_center;charset=utf8mb4',
        'root',
        '',
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    portal_ensure_schema($pdo);
    return $pdo;
}

/**
 * Ensure the portal columns this bridge writes to exist.
 *
 * The Doctor Portal adds these via idempotent migrations in its own
 * config/db.php, but reception talks to the portal DB directly and may
 * reach it before the portal app has ever loaded. So self-heal here too:
 * add any missing columns before we try to write them. Idempotent and cheap.
 */
function portal_ensure_schema(PDO $pdo)
{
    $ensure = function ($table, $column, $ddl) use ($pdo) {
        $stmt = $pdo->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
        $stmt->execute([$column]);
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE `$table` ADD COLUMN $ddl");
        }
    };
    try {
        // patients identity fields carried from reception
        $ensure('patients', 'mrn',         "mrn VARCHAR(40) NULL");
        $ensure('patients', 'phone',       "phone VARCHAR(40) NULL");
        $ensure('patients', 'national_id', "national_id VARCHAR(60) NULL");
        $ensure('patients', 'email',       "email VARCHAR(150) NULL");

        // appointments linking + slot metadata
        $ensure('appointments', 'source',          "source VARCHAR(20) NOT NULL DEFAULT 'portal'");
        $ensure('appointments', 'ext_ref',         "ext_ref VARCHAR(64) NULL");
        $ensure('appointments', 'chief_complaint', "chief_complaint TEXT NULL");
        $ensure('appointments', 'duration',        "duration INT NOT NULL DEFAULT 30");

        // ext_ref must be unique for the ON DUPLICATE KEY dedupe to work
        $idx = $pdo->query("SHOW INDEX FROM `appointments` WHERE Key_name = 'uq_appt_ext_ref'");
        if (!$idx->fetch()) {
            $pdo->exec("ALTER TABLE appointments ADD UNIQUE KEY uq_appt_ext_ref (ext_ref)");
        }
    } catch (PDOException $ex) {
        // If a table doesn't exist yet the portal hasn't been set up at all;
        // the insert below will surface a clearer error.
    }
}

/** Normalise a UI gender value to the portal ENUM. */
function norm_gender($g)
{
    $g = strtolower(trim((string)$g));
    if (strpos($g, 'f') === 0) return 'Female';
    if (strpos($g, 'm') === 0) return 'Male';
    return 'Other';
}

/** Best-effort date parse → 'Y-m-d', or null. */
function to_date($s)
{
    if (!$s) return null;
    $t = strtotime($s);
    return $t ? date('Y-m-d', $t) : null;
}

/** Build a login email for a doctor created on the fly from its label. */
function doctor_email($doctorName)
{
    $name = trim($doctorName);
    // Strip a leading "Dr." and take the part before the department parens.
    $name = preg_replace('/^\s*dr\.?\s*/i', '', $name);
    $name = preg_split('/\s*\(/', $name)[0];
    $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '', $name));
    if ($slug === '') $slug = 'doctor' . substr(md5($doctorName), 0, 6);
    return $slug . '@medcore.local';
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'POST required']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) $body = [];

$extRef     = trim((string)($body['extRef'] ?? ''));
$doctorName = trim((string)($body['doctorName'] ?? ''));
$patient    = trim((string)($body['patientName'] ?? ''));
$mrn        = trim((string)($body['mrn'] ?? ''));
$reason     = trim((string)($body['reason'] ?? ''));

if ($doctorName === '' || $patient === '') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'doctorName and patientName are required']);
    exit;
}

$dob        = to_date($body['dob'] ?? null) ?: '2000-01-01'; // portal dob is NOT NULL
$gender     = norm_gender($body['gender'] ?? '');
$phone      = trim((string)($body['phone'] ?? '')) ?: null;
$nationalId = trim((string)($body['nationalId'] ?? '')) ?: null;
$email      = trim((string)($body['email'] ?? '')) ?: null;
$duration   = max(1, (int)($body['duration'] ?? 30));
$apptDate   = to_date($body['date'] ?? null) ?: date('Y-m-d');

// Normalise time to HH:MM:SS (default 09:00).
$timeRaw = trim((string)($body['time'] ?? ''));
$apptTime = '09:00:00';
if ($timeRaw !== '') {
    $t = strtotime($timeRaw);
    if ($t) $apptTime = date('H:i:s', $t);
}

try {
    $pdo = portal_db();
    $pdo->beginTransaction();

    /* 1. Resolve the doctor by its full label. The portal is seeded with the
       reception doctors; if a brand-new label arrives, create a login for it. */
    $stmt = $pdo->prepare("SELECT doctor_id FROM doctors WHERE name = ? LIMIT 1");
    $stmt->execute([$doctorName]);
    $doctorId = $stmt->fetchColumn();

    if (!$doctorId) {
        $email = doctor_email($doctorName);
        // Avoid email collisions for distinct labels sharing a first name.
        $exists = $pdo->prepare("SELECT COUNT(*) FROM doctors WHERE email = ?");
        $exists->execute([$email]);
        if ($exists->fetchColumn() > 0) {
            $email = explode('@', $email)[0] . substr(md5($doctorName), 0, 4) . '@medcore.local';
        }
        $ins = $pdo->prepare("INSERT INTO doctors (name, email, password_hash) VALUES (?, ?, ?)");
        $ins->execute([$doctorName, $email, password_hash('password123', PASSWORD_DEFAULT)]);
        $doctorId = $pdo->lastInsertId();
    }

    /* 2. Upsert the patient. Match on MRN when available, then national_id,
       then name + dob as a last resort. All known fields are kept up-to-date. */
    $patientId = null;
    if ($mrn !== '') {
        $stmt = $pdo->prepare("SELECT patient_id FROM patients WHERE mrn = ? LIMIT 1");
        $stmt->execute([$mrn]);
        $patientId = $stmt->fetchColumn() ?: null;
    }
    if (!$patientId && $nationalId !== null) {
        $stmt = $pdo->prepare("SELECT patient_id FROM patients WHERE national_id = ? LIMIT 1");
        $stmt->execute([$nationalId]);
        $patientId = $stmt->fetchColumn() ?: null;
    }
    if (!$patientId) {
        $stmt = $pdo->prepare("SELECT patient_id FROM patients WHERE name = ? AND dob = ? LIMIT 1");
        $stmt->execute([$patient, $dob]);
        $patientId = $stmt->fetchColumn() ?: null;
    }

    if ($patientId) {
        $upd = $pdo->prepare("
            UPDATE patients
            SET name        = ?,
                dob         = ?,
                gender      = ?,
                mrn         = COALESCE(NULLIF(?, ''), mrn),
                phone       = COALESCE(?, phone),
                national_id = COALESCE(?, national_id),
                email       = COALESCE(?, email)
            WHERE patient_id = ?
        ");
        $upd->execute([$patient, $dob, $gender, $mrn, $phone, $nationalId, $email, $patientId]);
    } else {
        $ins = $pdo->prepare("INSERT INTO patients (name, dob, gender, mrn, phone, national_id, email) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $ins->execute([$patient, $dob, $gender, ($mrn !== '' ? $mrn : null), $phone, $nationalId, $email]);
        $patientId = $pdo->lastInsertId();
    }

    /* 3. Insert the appointment as a 'Scheduled' consultation request.
       Dedupe on ext_ref so re-sending the same reception appointment updates
       it in place rather than creating duplicates. */
    if ($extRef !== '') {
        $sql = "INSERT INTO appointments
                    (patient_id, doctor_id, appointment_date, appointment_time, status, source, ext_ref, chief_complaint, duration)
                VALUES (?, ?, ?, ?, 'Scheduled', 'reception', ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    patient_id        = VALUES(patient_id),
                    doctor_id         = VALUES(doctor_id),
                    appointment_date  = VALUES(appointment_date),
                    appointment_time  = VALUES(appointment_time),
                    chief_complaint   = VALUES(chief_complaint),
                    duration          = VALUES(duration),
                    status            = IF(status = 'Completed', status, 'Scheduled')";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$patientId, $doctorId, $apptDate, $apptTime, $extRef, ($reason !== '' ? $reason : null), $duration]);
        // Resolve the affected appointment id (insert or update).
        $look = $pdo->prepare("SELECT appointment_id FROM appointments WHERE ext_ref = ? LIMIT 1");
        $look->execute([$extRef]);
        $appointmentId = $look->fetchColumn();
    } else {
        $stmt = $pdo->prepare("INSERT INTO appointments
                    (patient_id, doctor_id, appointment_date, appointment_time, status, source, chief_complaint, duration)
                VALUES (?, ?, ?, ?, 'Scheduled', 'reception', ?, ?)");
        $stmt->execute([$patientId, $doctorId, $apptDate, $apptTime, ($reason !== '' ? $reason : null), $duration]);
        $appointmentId = $pdo->lastInsertId();
    }

    $pdo->commit();

    echo json_encode([
        'ok'             => true,
        'message'        => 'Consultation sent to ' . $doctorName,
        'appointment_id' => (int)$appointmentId,
        'doctor_id'      => (int)$doctorId,
        'patient_id'     => (int)$patientId,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
