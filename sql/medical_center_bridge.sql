-- ============================================================
--  MedCore HMS — Doctor Portal Bridge Schema (medical_center)
-- ------------------------------------------------------------
--  The reception app (this project) does NOT own this database — the
--  separate Doctor Portal app does. But two pieces of THIS project
--  talk to it directly:
--
--    send_to_doctor.php                -> writes doctors / patients /
--                                         appointments here
--    lib.php mc_sync_durations_from_portal()
--                                      -> reads appointments.ext_ref,
--                                         appointments.duration
--
--  Both self-heal the columns they need at runtime (portal_ensure_schema /
--  mc_ensure_flow_columns), so they work against the portal's own base
--  tables. This file defines exactly the shape those queries expect, so a
--  standalone MedCore install (no portal yet) still has a valid target.
--
--  Only the columns this project reads/writes are defined here. The real
--  Doctor Portal schema is a superset; importing this is safe (IF NOT
--  EXISTS) and additive only.
--
--  Run once in phpMyAdmin (SQL tab) if the portal app is not installed.
-- ============================================================

CREATE DATABASE IF NOT EXISTS medical_center
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medical_center;

-- ── doctors ──
--   send_to_doctor.php: SELECT doctor_id WHERE name = ?
--                       SELECT COUNT(*) WHERE email = ?
--                       INSERT (name, email, password_hash)
CREATE TABLE IF NOT EXISTS doctors (
    doctor_id     INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(160) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ── patients ──
--   send_to_doctor.php: SELECT patient_id WHERE mrn = ? / national_id = ?
--                       / (name = ? AND dob = ?)
--                       INSERT / UPDATE (name, dob, gender, mrn, phone,
--                                        national_id, email)
--   dob is NOT NULL on the portal; the bridge defaults missing dob to
--   '2000-01-01' before insert.
CREATE TABLE IF NOT EXISTS patients (
    patient_id  INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    dob         DATE NOT NULL,
    gender      ENUM('Male','Female','Other') NOT NULL DEFAULT 'Other',
    mrn         VARCHAR(40)  NULL,                 -- carried from reception
    phone       VARCHAR(40)  NULL,
    national_id VARCHAR(60)  NULL,
    email       VARCHAR(150) NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_portal_patient_mrn (mrn),
    INDEX idx_portal_patient_nid (national_id)
) ENGINE=InnoDB;

-- ── appointments ──
--   send_to_doctor.php: INSERT ... ON DUPLICATE KEY UPDATE (dedupe on ext_ref)
--                       SELECT appointment_id WHERE ext_ref = ?
--   mc_sync_durations_from_portal(): SELECT ext_ref, duration WHERE ext_ref <> ''
--   ext_ref = the reception appointments.id; the UNIQUE key makes the
--   ON DUPLICATE KEY upsert work so re-sending updates in place.
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id   INT AUTO_INCREMENT PRIMARY KEY,
    patient_id       INT NOT NULL,
    doctor_id        INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status           ENUM('Scheduled','Completed','Cancelled','No-Show')
                         NOT NULL DEFAULT 'Scheduled',
    source           VARCHAR(20) NOT NULL DEFAULT 'portal',  -- 'reception' from this bridge
    ext_ref          VARCHAR(64) NULL,                       -- reception appointment id
    chief_complaint  TEXT NULL,
    duration         INT NOT NULL DEFAULT 30,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_portal_appt_patient FOREIGN KEY (patient_id)
        REFERENCES patients(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_portal_appt_doctor FOREIGN KEY (doctor_id)
        REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    UNIQUE KEY uq_appt_ext_ref (ext_ref),
    INDEX idx_portal_appt_doctor (doctor_id),
    INDEX idx_portal_appt_date (appointment_date)
) ENGINE=InnoDB;
