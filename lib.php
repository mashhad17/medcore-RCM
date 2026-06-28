<?php
/* ============================================================
   MedCore HMS — Data access layer (normalised schema)
   Maps between the front-end JS object shape (camelCase, nested
   clinicalProfile / invoice / consents) and the normalised
   medcore_db tables. Used by both bootstrap.php and api.php.

   The front-end posts each collection as a full array ("replace
   the whole collection"), so each save function rebuilds its
   owned tables inside a transaction. Patients are shared across
   collections, so they are UPSERTed by MRN (never bulk-deleted).
   ============================================================ */

require_once __DIR__ . '/config.php';

/* ---------- helpers ---------- */

// UI date ('2026-06-24' or 'Jun 01, 2026') -> 'Y-m-d' or null.
function mc_to_date($s)
{
    if (!$s) return null;
    $t = strtotime($s);
    return $t ? date('Y-m-d', $t) : null;
}

// DB DATE -> ISO 'Y-m-d' (used for fields the UI stores as ISO), or null.
function mc_iso($d) { return $d ? date('Y-m-d', strtotime($d)) : null; }

// DB DATE -> 'Mon DD, YYYY' (the UI's clinical display format), or ''.
function mc_disp($d) { return $d ? date('M d, Y', strtotime($d)) : ''; }

// Insert-or-update a patient by MRN; returns patients.id.
// Only overwrites columns for which a value is supplied.
function mc_upsert_patient($pdo, $fields)
{
    $mrn = $fields['mrn'] ?? '';
    if ($mrn === '') $mrn = 'NOMRN-' . substr(md5($fields['full_name'] ?? uniqid()), 0, 12);

    $id = $pdo->prepare("SELECT id FROM patients WHERE mrn = ?");
    $id->execute([$mrn]);
    $pid = $id->fetchColumn();

    if ($pid === false) {
        $ins = $pdo->prepare(
            "INSERT INTO patients (mrn, full_name, national_id, dob, phone, is_resident, blood_group)
             VALUES (?,?,?,?,?,?,?)"
        );
        $ins->execute([
            $mrn,
            $fields['full_name']   ?? '',
            $fields['national_id'] ?? null,
            $fields['dob']         ?? null,
            $fields['phone']       ?? null,
            array_key_exists('is_resident', $fields) ? $fields['is_resident'] : 1,
            $fields['blood_group'] ?? null,
        ]);
        return (int)$pdo->lastInsertId();
    }

    // Update only the columns we were actually given.
    $cols = [];
    $vals = [];
    foreach ([
        'full_name'   => 'full_name',
        'national_id' => 'national_id',
        'dob'         => 'dob',
        'phone'       => 'phone',
        'is_resident' => 'is_resident',
        'blood_group' => 'blood_group',
    ] as $k => $col) {
        if (array_key_exists($k, $fields) && $fields[$k] !== null && $fields[$k] !== '') {
            $cols[] = "$col = ?";
            $vals[] = $fields[$k];
        }
    }
    if ($cols) {
        $vals[] = (int)$pid;
        $pdo->prepare("UPDATE patients SET " . implode(', ', $cols) . " WHERE id = ?")->execute($vals);
    }
    return (int)$pid;
}

// Find a doctor by its exact UI label, creating it (and its
// department) if necessary. Returns doctors.id.
function mc_lookup_doctor($pdo, $label)
{
    $label = $label ?: 'Unassigned';
    $q = $pdo->prepare("SELECT id FROM doctors WHERE full_name = ?");
    $q->execute([$label]);
    $did = $q->fetchColumn();
    if ($did !== false) return (int)$did;

    // Derive department from the "(...)" suffix, default General Practice.
    $dept = 'General Practice';
    if (preg_match('/\((.*?)\)/', $label, $m)) $dept = $m[1];

    $dq = $pdo->prepare("SELECT id FROM departments WHERE name = ?");
    $dq->execute([$dept]);
    $deptId = $dq->fetchColumn();
    if ($deptId === false) {
        $pdo->prepare("INSERT INTO departments (name) VALUES (?)")->execute([$dept]);
        $deptId = (int)$pdo->lastInsertId();
    }

    $nextCol = (int)$pdo->query("SELECT COALESCE(MAX(col_index)+1, 0) FROM doctors")->fetchColumn();
    $pdo->prepare("INSERT INTO doctors (full_name, department_id, col_index) VALUES (?,?,?)")
        ->execute([$label, $deptId, $nextCol]);
    return (int)$pdo->lastInsertId();
}

/* ---------- APPOINTMENTS ---------- */
/**
 * Self-healing schema for the patient-flow fields that the UI added after the
 * original schema was created. Idempotent and cheap: adds each column only if
 * missing. Must run OUTSIDE a transaction (ALTER TABLE implicitly commits).
 */
function mc_ensure_flow_columns($pdo)
{
    static $done = false;
    if ($done) return;
    $done = true;

    $ensure = function ($table, $column, $ddl) use ($pdo) {
        try {
            $stmt = $pdo->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
            $stmt->execute([$column]);
            if (!$stmt->fetch()) {
                $pdo->exec("ALTER TABLE `$table` ADD COLUMN $ddl");
            }
        } catch (PDOException $e) {
            // Table may not exist yet in a partially-set-up DB; ignore.
        }
    };

    // Appointment → "Send to Doctor" lifecycle flag.
    $ensure('appointments', 'sent_to_doctor',        "sent_to_doctor TINYINT(1) NOT NULL DEFAULT 0");
    $ensure('appointments', 'portal_appointment_id', "portal_appointment_id INT NULL");
    // Original booked duration, kept when the doctor portal extends a consult.
    $ensure('appointments', 'booked_duration_min',   "booked_duration_min INT NULL");

    // Live-queue lane (Waiting → Consultation → Billing) + linkage.
    $ensure('live_queue', 'stage',              "stage VARCHAR(20) NOT NULL DEFAULT 'waiting'");
    $ensure('live_queue', 'consult_started_at', "consult_started_at VARCHAR(40) NULL");
    $ensure('live_queue', 'appt_id',            "appt_id VARCHAR(64) NULL");
}

/**
 * Pull consultation durations back from the Doctor Portal (medical_center DB).
 *
 * When a doctor extends a consult (e.g. 45 → 90 min) on the portal, reception
 * needs to see the longer block on the scheduler and bill the extra time. The
 * portal links each consult to its reception appointment via `ext_ref`
 * (= the medcore appointment id), so we match on that.
 *
 * - The original booked duration is captured once into booked_duration_min
 *   before we overwrite duration_min, so the invoice can show "extended".
 * - Runs before localStorage is primed (bootstrap.php), so the front-end sees
 *   the new value and subsequent reception writes preserve it.
 * Silent no-op if the portal DB isn't reachable.
 */
function mc_sync_durations_from_portal($pdo)
{
    mc_ensure_flow_columns($pdo);
    try {
        $portal = new PDO(
            'mysql:host=127.0.0.1;dbname=medical_center;charset=utf8mb4',
            'root',
            '',
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
        $rows = $portal->query(
            "SELECT ext_ref, duration FROM appointments WHERE ext_ref IS NOT NULL AND ext_ref <> ''"
        )->fetchAll();
    } catch (Throwable $e) {
        return; // portal not set up / unreachable — leave reception data as-is
    }

    $capture = $pdo->prepare("UPDATE appointments SET booked_duration_min = duration_min WHERE id = ? AND booked_duration_min IS NULL");
    $update  = $pdo->prepare("UPDATE appointments SET duration_min = ? WHERE id = ? AND duration_min <> ?");
    foreach ($rows as $r) {
        $ext = (string)$r['ext_ref'];
        $dur = (int)$r['duration'];
        if ($dur <= 0) continue;
        $capture->execute([$ext]);          // remember the original duration once
        $update->execute([$dur, $ext, $dur]); // adopt the portal's duration
    }
}

function mc_get_appointments($pdo)
{
    mc_ensure_flow_columns($pdo);
    $sql = "SELECT a.*, p.mrn, p.full_name, p.national_id, p.dob, p.phone,
                   p.is_resident, p.blood_group,
                   d.full_name AS doctor_name, d.col_index
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN doctors  d ON a.doctor_id  = d.id
            ORDER BY a.created_at ASC, a.id ASC";
    $rows = $pdo->query($sql)->fetchAll();

    // Prepared child queries.
    $qAll = $pdo->prepare("SELECT allergen FROM patient_allergies WHERE patient_id = ?");
    $qCon = $pdo->prepare("SELECT condition_name FROM patient_conditions WHERE patient_id = ?");
    $qPkg = $pdo->prepare("SELECT plan_name, activation_date, expiry_date, usage_note, status FROM patient_packages WHERE patient_id = ? ORDER BY id");
    $qEnc = $pdo->prepare("SELECT encounter_date, diagnosis, status, doctor_label, dept_label FROM encounters WHERE patient_id = ? ORDER BY id");
    $qItm = $pdo->prepare("SELECT item_date, description, quantity, dept_label FROM dispensed_items WHERE patient_id = ? ORDER BY id");
    $qVit = $pdo->prepare("SELECT recorded_on, blood_pressure, heart_rate, weight FROM vitals WHERE appointment_id = ? ORDER BY id LIMIT 1");
    $qInv = $pdo->prepare("SELECT * FROM invoices WHERE appointment_id = ? LIMIT 1");
    $qLin = $pdo->prepare("SELECT code, description, qty, gross, discount, nett, vat, line_total FROM invoice_lines WHERE invoice_id = ? ORDER BY id");
    $qCns = $pdo->prepare("SELECT * FROM appointment_consents WHERE appointment_id = ? ORDER BY consent_form_id");

    $out = [];
    foreach ($rows as $r) {
        $pid = (int)$r['patient_id'];

        $allergies  = $qAll->execute([$pid]) ? array_column($qAll->fetchAll(), 'allergen') : [];
        $conditions = $qCon->execute([$pid]) ? array_column($qCon->fetchAll(), 'condition_name') : [];

        $qPkg->execute([$pid]);
        $packages = array_map(function ($p) {
            return [
                'name'           => $p['plan_name'],
                'activationDate' => mc_disp($p['activation_date']),
                'expiryDate'     => mc_disp($p['expiry_date']),
                'usage'          => $p['usage_note'],
                'status'         => $p['status'],
            ];
        }, $qPkg->fetchAll());

        $qEnc->execute([$pid]);
        $encounters = array_map(function ($e) {
            return [
                'date'      => mc_disp($e['encounter_date']),
                'diagnosis' => $e['diagnosis'],
                'status'    => $e['status'],
                'doctor'    => $e['doctor_label'],
                'dept'      => $e['dept_label'],
            ];
        }, $qEnc->fetchAll());

        $qItm->execute([$pid]);
        $items = array_map(function ($i) {
            return [
                'date'        => mc_disp($i['item_date']),
                'description' => $i['description'],
                'qty'         => $i['quantity'],
                'dept'        => $i['dept_label'],
            ];
        }, $qItm->fetchAll());

        $qVit->execute([$r['id']]);
        $vrow = $qVit->fetch();
        $vitals = $vrow ? [
            'date'   => mc_disp($vrow['recorded_on']),
            'bp'     => $vrow['blood_pressure'],
            'hr'     => $vrow['heart_rate'],
            'weight' => $vrow['weight'],
        ] : null;

        // Assemble clinicalProfile only if there is any clinical data.
        $hasProfile = $r['blood_group'] || $allergies || $conditions || $packages || $encounters || $items || $vitals;
        $clinicalProfile = null;
        if ($hasProfile) {
            $clinicalProfile = [
                'bloodGroup' => $r['blood_group'] ?: '',
                'allergies'  => $allergies,
                'conditions' => $conditions,
                'encounters' => $encounters,
                'packages'   => $packages,
            ];
            if ($vitals) $clinicalProfile['vitals'] = $vitals;
            if ($items)  $clinicalProfile['items']  = $items;
        }

        // Invoice + lines.
        $invoice = null;
        $qInv->execute([$r['id']]);
        $inv = $qInv->fetch();
        if ($inv) {
            $qLin->execute([$inv['id']]);
            $lines = array_map(function ($l) {
                return [
                    'code'  => $l['code'],
                    'desc'  => $l['description'],
                    'qty'   => (int)$l['qty'],
                    'gross' => (float)$l['gross'],
                    'disc'  => (float)$l['discount'],
                    'nett'  => (float)$l['nett'],
                    'vat'   => (float)$l['vat'],
                    'total' => (float)$l['line_total'],
                ];
            }, $qLin->fetchAll());
            $invoice = [
                'no'            => $inv['invoice_no'],
                'date'          => mc_iso($inv['issue_date']),
                'lines'         => $lines,
                'paymentMethod' => $inv['payment_method'],
                'amountPaid'    => (float)$inv['amount_paid'],
                'paid'          => (bool)$inv['is_paid'],
            ];
        }

        // Consents keyed by form id.
        $consents = null;
        $qCns->execute([$r['id']]);
        $crows = $qCns->fetchAll();
        if ($crows) {
            $consents = [];
            foreach ($crows as $c) {
                $consents[(string)$c['consent_form_id']] = [
                    'relation'        => $c['relation_type'],
                    'relationName'    => $c['relation_name'],
                    'signedByPatient' => (bool)$c['signed_by_patient'],
                    'accepted'        => (bool)$c['accepted'],
                    'patientSig'      => $c['patient_signature'],
                    'doctorSig'       => $c['doctor_signature'],
                    'signed'          => (bool)$c['signed'],
                    'status'          => $c['status'],
                    'date'            => $c['signed_at'],
                ];
            }
        }

        $out[] = [
            'id'              => $r['id'],
            'patientName'     => $r['full_name'],
            'mrn'             => $r['mrn'],
            'nid'             => $r['national_id'],
            'dob'             => mc_iso($r['dob']),
            'phone'           => $r['phone'],
            'resident'        => ((int)$r['is_resident'] === 1 ? 'yes' : 'no'),
            'doctorName'      => $r['doctor_name'],
            'colIndex'        => (int)$r['col_index'],
            'date'            => mc_iso($r['appt_date']),
            'startHour'       => (int)$r['start_hour'],
            'startMinute'     => (int)$r['start_minute'],
            'duration'        => (int)$r['duration_min'],
            'bookedDuration'  => isset($r['booked_duration_min']) && $r['booked_duration_min'] !== null ? (int)$r['booked_duration_min'] : null,
            'reason'          => $r['reason'],
            'status'          => $r['status'],
            'confirmStatus'   => ($r['confirm_status'] === '' ? null : $r['confirm_status']),
            'overdue'         => $r['overdue_amount'] !== null ? (float)$r['overdue_amount'] : 0,
            'createdDate'     => $r['created_date'],
            'modifiedDate'    => $r['modified_date'],
            'sentToDoctor'    => !empty($r['sent_to_doctor']),
            'portalAppointmentId' => isset($r['portal_appointment_id']) && $r['portal_appointment_id'] !== null ? (int)$r['portal_appointment_id'] : null,
            'clinicalProfile' => $clinicalProfile,
            'invoice'         => $invoice,
            'consents'        => $consents,
        ];
    }
    return $out;
}

function mc_save_appointments($pdo, $arr)
{
    mc_ensure_flow_columns($pdo);   // before the transaction (ALTER auto-commits)
    $pdo->beginTransaction();

    // Wipe appointment-owned data. Deleting appointments cascades to
    // vitals, invoices->invoice_lines and appointment_consents.
    // Patient clinical children are patient-scoped but sourced only
    // from clinicalProfile, so they are rebuilt from scratch.
    $pdo->exec("DELETE FROM appointments");
    $pdo->exec("DELETE FROM patient_allergies");
    $pdo->exec("DELETE FROM patient_conditions");
    $pdo->exec("DELETE FROM patient_packages");
    $pdo->exec("DELETE FROM encounters");
    $pdo->exec("DELETE FROM dispensed_items");

    $insAppt = $pdo->prepare(
        "INSERT INTO appointments
         (id, patient_id, doctor_id, appt_date, start_hour, start_minute, duration_min,
          reason, status, confirm_status, overdue_amount, created_date, modified_date,
          sent_to_doctor, portal_appointment_id, booked_duration_min)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    );
    $insAll = $pdo->prepare("INSERT INTO patient_allergies (patient_id, allergen) VALUES (?,?)");
    $insCon = $pdo->prepare("INSERT INTO patient_conditions (patient_id, condition_name) VALUES (?,?)");
    $insPkg = $pdo->prepare("INSERT INTO patient_packages (patient_id, plan_id, plan_name, activation_date, expiry_date, usage_note, status) VALUES (?,?,?,?,?,?,?)");
    $insEnc = $pdo->prepare("INSERT INTO encounters (patient_id, encounter_date, diagnosis, status, doctor_label, dept_label) VALUES (?,?,?,?,?,?)");
    $insItm = $pdo->prepare("INSERT INTO dispensed_items (patient_id, treatment_id, item_date, description, quantity, dept_label) VALUES (?,?,?,?,?,?)");
    $insVit = $pdo->prepare("INSERT INTO vitals (appointment_id, recorded_on, blood_pressure, heart_rate, weight) VALUES (?,?,?,?,?)");
    $insInv = $pdo->prepare("INSERT INTO invoices (invoice_no, appointment_id, issue_date, payment_method, amount_paid, is_paid) VALUES (?,?,?,?,?,?)");
    $insLin = $pdo->prepare("INSERT INTO invoice_lines (invoice_id, treatment_id, code, description, qty, gross, discount, nett, vat, line_total) VALUES (?,?,?,?,?,?,?,?,?,?)");
    $insCns = $pdo->prepare("INSERT INTO appointment_consents (appointment_id, consent_form_id, relation_type, relation_name, signed_by_patient, accepted, patient_signature, doctor_signature, signed, status, signed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");

    $planByName = [];      // name -> insurance_plans.id (cache)
    $treatByCode = [];     // code -> treatment_catalog.id (cache)
    $seenProfile = [];     // patient ids whose clinical children are written

    $findPlan = function ($name) use ($pdo, &$planByName) {
        if ($name === null || $name === '') return null;
        if (array_key_exists($name, $planByName)) return $planByName[$name];
        $q = $pdo->prepare("SELECT id FROM insurance_plans WHERE name = ?");
        $q->execute([$name]);
        $id = $q->fetchColumn();
        return $planByName[$name] = ($id === false ? null : (int)$id);
    };
    $findTreat = function ($code) use ($pdo, &$treatByCode) {
        if ($code === null || $code === '') return null;
        if (array_key_exists($code, $treatByCode)) return $treatByCode[$code];
        $q = $pdo->prepare("SELECT id FROM treatment_catalog WHERE code = ?");
        $q->execute([$code]);
        $id = $q->fetchColumn();
        return $treatByCode[$code] = ($id === false ? null : (int)$id);
    };

    foreach ($arr as $a) {
        $cp = (isset($a['clinicalProfile']) && is_array($a['clinicalProfile'])) ? $a['clinicalProfile'] : null;

        $pid = mc_upsert_patient($pdo, [
            'mrn'         => $a['mrn'] ?? '',
            'full_name'   => $a['patientName'] ?? '',
            'national_id' => $a['nid'] ?? null,
            'dob'         => mc_to_date($a['dob'] ?? null),
            'phone'       => $a['phone'] ?? null,
            'is_resident' => (($a['resident'] ?? 'yes') === 'no') ? 0 : 1,
            'blood_group' => $cp['bloodGroup'] ?? null,
        ]);

        $did = mc_lookup_doctor($pdo, $a['doctorName'] ?? '');

        $apptId = $a['id'] ?? uniqid('app-');
        $insAppt->execute([
            $apptId,
            $pid,
            $did,
            mc_to_date($a['date'] ?? null),
            $a['startHour'] ?? 0,
            $a['startMinute'] ?? 0,
            $a['duration'] ?? 0,
            $a['reason'] ?? '',
            $a['status'] ?? 'scheduled',
            $a['confirmStatus'] ?? null,
            isset($a['overdue']) ? $a['overdue'] : 0,
            $a['createdDate'] ?? null,
            $a['modifiedDate'] ?? null,
            !empty($a['sentToDoctor']) ? 1 : 0,
            isset($a['portalAppointmentId']) ? $a['portalAppointmentId'] : null,
            isset($a['bookedDuration']) ? $a['bookedDuration'] : null,
        ]);

        // Patient-scoped clinical data: write once per patient.
        if ($cp && !isset($seenProfile[$pid])) {
            $seenProfile[$pid] = true;

            foreach (($cp['allergies'] ?? []) as $al) {
                if ($al !== '') $insAll->execute([$pid, $al]);
            }
            foreach (($cp['conditions'] ?? []) as $co) {
                if ($co !== '') $insCon->execute([$pid, $co]);
            }
            foreach (($cp['packages'] ?? []) as $pk) {
                $insPkg->execute([
                    $pid,
                    $findPlan($pk['name'] ?? null),
                    $pk['name'] ?? '',
                    mc_to_date($pk['activationDate'] ?? null),
                    mc_to_date($pk['expiryDate'] ?? null),
                    $pk['usage'] ?? null,
                    $pk['status'] ?? 'Active',
                ]);
            }
            foreach (($cp['encounters'] ?? []) as $en) {
                $insEnc->execute([
                    $pid,
                    mc_to_date($en['date'] ?? null),
                    $en['diagnosis'] ?? null,
                    $en['status'] ?? null,
                    $en['doctor'] ?? null,
                    $en['dept'] ?? null,
                ]);
            }
            foreach (($cp['items'] ?? []) as $it) {
                $insItm->execute([
                    $pid,
                    null,
                    mc_to_date($it['date'] ?? null),
                    $it['description'] ?? '',
                    $it['qty'] ?? null,
                    $it['dept'] ?? null,
                ]);
            }
        }

        // Visit-scoped vitals.
        if ($cp && isset($cp['vitals']) && is_array($cp['vitals'])) {
            $v = $cp['vitals'];
            $insVit->execute([
                $apptId,
                mc_to_date($v['date'] ?? null),
                $v['bp'] ?? null,
                $v['hr'] ?? null,
                $v['weight'] ?? null,
            ]);
        }

        // Invoice + lines.
        if (isset($a['invoice']) && is_array($a['invoice'])) {
            $inv = $a['invoice'];
            $insInv->execute([
                $inv['no'] ?? ('INV-' . substr($apptId, -6)),
                $apptId,
                mc_to_date($inv['date'] ?? null),
                $inv['paymentMethod'] ?? null,
                $inv['amountPaid'] ?? 0,
                !empty($inv['paid']) ? 1 : 0,
            ]);
            $invId = (int)$pdo->lastInsertId();
            foreach (($inv['lines'] ?? []) as $l) {
                $insLin->execute([
                    $invId,
                    $findTreat($l['code'] ?? null),
                    $l['code'] ?? null,
                    $l['desc'] ?? '',
                    $l['qty'] ?? 1,
                    $l['gross'] ?? 0,
                    $l['disc'] ?? 0,
                    $l['nett'] ?? 0,
                    $l['vat'] ?? 0,
                    $l['total'] ?? 0,
                ]);
            }
        }

        // Consents.
        if (isset($a['consents']) && is_array($a['consents'])) {
            foreach ($a['consents'] as $formId => $c) {
                if (!is_array($c)) continue;
                $insCns->execute([
                    $apptId,
                    (int)$formId,
                    $c['relation'] ?? null,
                    $c['relationName'] ?? null,
                    !empty($c['signedByPatient']) ? 1 : 0,
                    !empty($c['accepted']) ? 1 : 0,
                    $c['patientSig'] ?? null,
                    $c['doctorSig'] ?? null,
                    !empty($c['signed']) ? 1 : 0,
                    $c['status'] ?? 'Awaiting',
                    $c['date'] ?? null,
                ]);
            }
        }
    }

    $pdo->commit();
}

/* ---------- PAYMENTS ---------- */
function mc_get_payments($pdo)
{
    $sql = "SELECT pay.*, p.mrn, p.full_name
            FROM payments pay
            LEFT JOIN patients p ON pay.patient_id = p.id
            ORDER BY pay.id ASC";
    $rows = $pdo->query($sql)->fetchAll();
    $out = [];
    foreach ($rows as $r) {
        $out[] = [
            'invoiceNo'   => $r['invoice_no'],
            'patientName' => $r['full_name'],
            'mrn'         => $r['mrn'],
            'doctor'      => $r['doctor_label'],
            'dept'        => $r['dept_label'],
            'amount'      => (float)$r['amount'],
            'method'      => $r['method'],
            'collectedBy' => $r['collected_by'],
            'date'        => $r['paid_at'],
            'visitDate'   => $r['visit_date'],
        ];
    }
    return $out;
}

function mc_save_payments($pdo, $arr)
{
    $pdo->beginTransaction();
    $pdo->exec("DELETE FROM payments");
    $findInv = $pdo->prepare("SELECT id FROM invoices WHERE invoice_no = ?");
    $ins = $pdo->prepare(
        "INSERT INTO payments
         (invoice_no, invoice_id, patient_id, doctor_label, dept_label, amount, method, collected_by, paid_at, visit_date)
         VALUES (?,?,?,?,?,?,?,?,?,?)"
    );
    foreach ($arr as $p) {
        $pid = mc_upsert_patient($pdo, [
            'mrn'       => $p['mrn'] ?? '',
            'full_name' => $p['patientName'] ?? '',
        ]);
        $invNo = $p['invoiceNo'] ?? '';
        $invId = null;
        if ($invNo !== '') {
            $findInv->execute([$invNo]);
            $f = $findInv->fetchColumn();
            $invId = ($f === false ? null : (int)$f);
        }
        $ins->execute([
            $invNo,
            $invId,
            $pid,
            $p['doctor'] ?? '',
            $p['dept'] ?? '',
            $p['amount'] ?? 0,
            $p['method'] ?? '',
            $p['collectedBy'] ?? 'System Admin',
            $p['date'] ?? '',
            $p['visitDate'] ?? '',
        ]);
    }
    $pdo->commit();
}

/* ---------- LIVE QUEUE ---------- */
/**
 * Drop live-queue entries left over from previous days. A patient leaves the
 * queue only when discharged (payment collected); anyone still in it at end of
 * day would otherwise carry over forever with a runaway wait time. The queue is
 * a "today" board, so prune anything checked in before today.
 *
 * checked_in_at is an ISO timestamp string; comparing its YYYY-MM-DD prefix to
 * CURDATE() is safe within clinic hours (UTC date == local date 8 AM–11 PM).
 */
function mc_purge_stale_queue($pdo)
{
    mc_ensure_flow_columns($pdo);
    $pdo->exec("DELETE FROM live_queue WHERE checked_in_at IS NOT NULL AND checked_in_at <> '' AND LEFT(checked_in_at, 10) < CURDATE()");
}

function mc_get_queue($pdo)
{
    mc_ensure_flow_columns($pdo);
    $sql = "SELECT lq.*, p.mrn, p.full_name
            FROM live_queue lq
            LEFT JOIN patients p ON lq.patient_id = p.id
            ORDER BY lq.id ASC";
    $rows = $pdo->query($sql)->fetchAll();
    $out = [];
    foreach ($rows as $r) {
        $out[] = [
            'id'               => $r['appt_id'] ?? null,
            'mrn'              => $r['mrn'],
            'patientName'      => $r['full_name'],
            'doctor'           => $r['doctor_label'],
            'reason'           => $r['reason'],
            'checkedInAt'      => $r['checked_in_at'],
            'stage'            => $r['stage'] ?? 'waiting',
            'consultStartedAt' => $r['consult_started_at'] ?? null,
        ];
    }
    return $out;
}

function mc_save_queue($pdo, $arr)
{
    mc_ensure_flow_columns($pdo);   // before the transaction (ALTER auto-commits)
    $pdo->beginTransaction();
    $pdo->exec("DELETE FROM live_queue");
    $ins = $pdo->prepare(
        "INSERT INTO live_queue (patient_id, doctor_label, reason, checked_in_at, stage, consult_started_at, appt_id) VALUES (?,?,?,?,?,?,?)"
    );
    foreach ($arr as $q) {
        $pid = mc_upsert_patient($pdo, [
            'mrn'       => $q['mrn'] ?? '',
            'full_name' => $q['patientName'] ?? '',
        ]);
        $ins->execute([
            $pid,
            $q['doctor'] ?? '',
            $q['reason'] ?? '',
            $q['checkedInAt'] ?? '',
            $q['stage'] ?? 'waiting',
            $q['consultStartedAt'] ?? null,
            $q['id'] ?? null,
        ]);
    }
    $pdo->commit();
}

/* ---------- ACTIVITY LOG ---------- */
function mc_get_activity($pdo)
{
    $rows = $pdo->query("SELECT * FROM activity_log ORDER BY id ASC")->fetchAll();
    $out = [];
    foreach ($rows as $r) {
        $out[] = [
            'time'   => $r['log_time'],
            'text'   => $r['message'],
            'author' => $r['author'],
        ];
    }
    return $out;
}

function mc_save_activity($pdo, $arr)
{
    $pdo->beginTransaction();
    $pdo->exec("DELETE FROM activity_log");
    $stmt = $pdo->prepare("INSERT INTO activity_log (log_time, message, author) VALUES (?,?,?)");
    foreach ($arr as $l) {
        $stmt->execute([
            $l['time'] ?? '',
            $l['text'] ?? '',
            $l['author'] ?? '',
        ]);
    }
    $pdo->commit();
}

/* ============================================================
   DASHBOARD (Reception Shift Control) — server-computed state
   These power api/dashboard/summary.php, api/walkin.php and
   api/activity/clear.php. Everything is derived live from the
   database; the front-end no longer reads localStorage.
   ============================================================ */

// Today's appointment metrics. A patient physically sitting in the
// live queue counts as checked-in even if the appointment status lags
// (mirrors the old client-side updateMetricCounts logic).
function mc_dashboard_metrics($pdo, $date = null)
{
    // Resolve the target day (defaults to the clinic's local today).
    $date = ($date && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) ? $date : $pdo->query("SELECT CURDATE()")->fetchColumn();
    $isToday = ($date === $pdo->query("SELECT CURDATE()")->fetchColumn());

    // The live-queue "in_queue" flag only makes sense for today's board.
    $stmt = $pdo->prepare(
        "SELECT a.status AS status,
                (" . ($isToday ? "lq.patient_id IS NOT NULL" : "0") . ") AS in_queue
         FROM appointments a
         LEFT JOIN (SELECT DISTINCT patient_id FROM live_queue) lq
                ON lq.patient_id = a.patient_id
         WHERE a.appt_date = ?"
    );
    $stmt->execute([$date]);
    $rows = $stmt->fetchAll();

    $c = ['total' => 0, 'checkedin' => 0, 'pending' => 0, 'cancelled' => 0, 'completed' => 0];
    foreach ($rows as $r) {
        $c['total']++;
        $s = strtolower((string)$r['status']);
        if ($s === 'cancelled') {
            $c['cancelled']++;
        } elseif ($s === 'completed' || $s === 'past') {
            $c['completed']++;
        } elseif ($s === 'arrived' || (int)$r['in_queue'] === 1) {
            $c['checkedin']++;
        } else {
            $c['pending']++;
        }
    }

    // Walk-in/queue entries with no matching appointment today (today only).
    if ($isToday) {
        $extra = (int)$pdo->query(
            "SELECT COUNT(DISTINCT lq.patient_id)
             FROM live_queue lq
             WHERE lq.patient_id IS NOT NULL
               AND lq.patient_id NOT IN
                   (SELECT patient_id FROM appointments WHERE appt_date = CURDATE())"
        )->fetchColumn();
        $c['total']    += $extra;
        $c['checkedin'] += $extra;
    }

    return $c;
}

/**
 * Appointments scheduled on a given day (used as the dashboard's "list" when
 * viewing a past date, where the live waiting room doesn't apply). Shaped like
 * mc_next_up so the same renderer can show it.
 */
function mc_appointments_on($pdo, $date)
{
    $stmt = $pdo->prepare(
        "SELECT p.full_name AS patient_name, d.full_name AS doctor_name,
                a.start_hour, a.start_minute, a.status
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         JOIN doctors  d ON a.doctor_id  = d.id
         WHERE a.appt_date = ?
         ORDER BY a.start_hour, a.start_minute, a.id"
    );
    $stmt->execute([$date]);
    $out = [];
    foreach ($stmt->fetchAll() as $r) {
        $h = (int)$r['start_hour']; $m = (int)$r['start_minute'];
        $ampm = $h >= 12 ? 'PM' : 'AM'; $h12 = ($h % 12) ?: 12;
        $out[] = [
            'patient_name' => $r['patient_name'],
            'doctor_name'  => $r['doctor_name'],
            'time_label'   => sprintf('%d:%02d %s', $h12, $m, $ampm),
            'status'       => $r['status'],
        ];
    }
    return $out;
}

// Real-time provider board derived from doctors + today's appointments
// + live queue. Replaces the client-side getRealTimeProviderStatus().
// Clinic hours assumed 08:00–17:00 (Gulf time; see config.php).
function mc_provider_status($pdo)
{
    mc_ensure_flow_columns($pdo);
    $nowHour = (int)$pdo->query("SELECT HOUR(NOW())")->fetchColumn();

    $docs = $pdo->query(
        "SELECT d.id, d.full_name, dep.name AS dept, d.manual_status
         FROM doctors d
         JOIN departments dep ON d.department_id = dep.id
         WHERE d.is_active = 1
         ORDER BY d.col_index, d.id"
    )->fetchAll();

    // A doctor is "In Consultation" when a patient has been sent to them and is
    // sitting in the Consultation lane of the live queue (stage = 'consultation').
    // This is the single, synced source of truth shared with the scheduler header
    // and the Live Clinic Queue, so every surface agrees.
    $inConsult = [];
    foreach ($pdo->query("SELECT DISTINCT doctor_label FROM live_queue WHERE stage = 'consultation'")->fetchAll() as $q) {
        if (!empty($q['doctor_label'])) $inConsult[$q['doctor_label']] = true;
    }

    $out = [];
    foreach ($docs as $d) {
        $manual = trim((string)($d['manual_status'] ?? ''));
        if ($manual !== '') {
            $status = $manual;
        } elseif (isset($inConsult[$d['full_name']])) {
            $status = 'In Consultation';
        } elseif ($nowHour < 8 || $nowHour >= 23) {   // clinic day: 8 AM → 11 PM
            $status = 'Off-Shift';
        } else {
            $status = 'Available';
        }
        $out[] = [
            'name'   => $d['full_name'],
            'dept'   => $d['dept'],
            'status' => $status,
        ];
    }
    return $out;
}

// Waiting-room list ordered by longest wait, with server-computed minutes.
function mc_next_up($pdo, $limit = 5)
{
    $limit = max(1, (int)$limit);
    $rows = $pdo->query(
        "SELECT p.full_name AS patient_name, q.doctor_label AS doctor_name, q.checked_in_at
         FROM live_queue q
         JOIN patients p ON q.patient_id = p.id
         WHERE LEFT(q.checked_in_at, 10) = CURDATE()
         ORDER BY q.checked_in_at ASC
         LIMIT $limit"
    )->fetchAll();

    $now = time();
    $out = [];
    foreach ($rows as $r) {
        $t = $r['checked_in_at'] ? strtotime($r['checked_in_at']) : 0;
        $mins = $t ? (int)floor(($now - $t) / 60) : 0;
        if ($mins < 0) $mins = 0;
        $out[] = [
            'patient_name'      => $r['patient_name'],
            'doctor_name'       => $r['doctor_name'],
            'wait_time_minutes' => $mins,
        ];
    }
    return $out;
}

// Lightweight list of today's appointments for the metric drill-down
// modal. Includes an in_queue flag so "Checked-In" can include patients
// physically waiting even if their status lags.
function mc_today_appointments($pdo, $date = null)
{
    $date = ($date && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) ? $date : $pdo->query("SELECT CURDATE()")->fetchColumn();
    $stmt = $pdo->prepare(
        "SELECT a.id,
                p.full_name AS patientName,
                p.mrn,
                d.full_name AS doctorName,
                a.start_hour   AS startHour,
                a.start_minute AS startMinute,
                a.status,
                (lq.patient_id IS NOT NULL) AS inQueue
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         JOIN doctors  d ON a.doctor_id  = d.id
         LEFT JOIN (SELECT DISTINCT patient_id FROM live_queue) lq
                ON lq.patient_id = a.patient_id
         WHERE a.appt_date = ?
         ORDER BY a.start_hour, a.start_minute, a.id"
    );
    $stmt->execute([$date]);
    $rows = $stmt->fetchAll();

    return array_map(function ($r) {
        return [
            'patientName' => $r['patientName'],
            'mrn'         => $r['mrn'],
            'doctorName'  => $r['doctorName'],
            'startHour'   => (int)$r['startHour'],
            'startMinute' => (int)$r['startMinute'],
            'status'      => $r['status'],
            'inQueue'     => (int)$r['inQueue'] === 1,
        ];
    }, $rows);
}

// Append one event to the activity log (UAE-stamped display time).
function mc_log_event($pdo, $message, $author = 'Reception', $type = null)
{
    $stmt = $pdo->prepare(
        "INSERT INTO activity_log (log_time, message, author, event_type)
         VALUES (DATE_FORMAT(NOW(), '%l:%i %p'), ?, ?, ?)"
    );
    $stmt->execute([$message, $author, $type]);
}

// Latest events, newest first.
function mc_recent_activity($pdo, $limit = 20)
{
    $limit = max(1, (int)$limit);
    $rows = $pdo->query(
        "SELECT log_time AS time, message AS text, author, event_type
         FROM activity_log
         ORDER BY created_at DESC, id DESC
         LIMIT $limit"
    )->fetchAll();
    return $rows;
}
