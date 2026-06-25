-- ============================================================
--  MedCore HMS — Normalised Relational Schema (medcore_db)
-- ------------------------------------------------------------
--  A normalised design that the live app actually runs on
--  (config.php -> medcore_db). lib.php decomposes the front-end's
--  nested appointment objects into these tables on save and
--  reassembles them on read.
--
--  Design note on dates:
--    * Columns the UI stores as parseable dates ('YYYY-MM-DD' or
--      'Mon DD, YYYY') are real DATE columns.
--    * Free-form display timestamps (e.g. '24/06/2026 03:41 PM',
--      ISO strings) are kept as VARCHAR so they round-trip
--      byte-for-byte and the existing front-end keeps working.
--
--  Run once in phpMyAdmin (Import) or the SQL tab.
-- ============================================================

CREATE DATABASE IF NOT EXISTS medcore_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medcore_db;

-- Drop in reverse-dependency order so the script is re-runnable.
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS activity_log;
DROP TABLE IF EXISTS live_queue;
DROP TABLE IF EXISTS appointment_consents;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoice_lines;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS dispensed_items;
DROP TABLE IF EXISTS encounters;
DROP TABLE IF EXISTS vitals;
DROP TABLE IF EXISTS patient_conditions;
DROP TABLE IF EXISTS patient_allergies;
DROP TABLE IF EXISTS patient_packages;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS treatment_catalog;
DROP TABLE IF EXISTS insurance_plans;
DROP TABLE IF EXISTS consent_forms;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS departments;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
--  1. REFERENCE TABLES
-- ============================================================

CREATE TABLE departments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(80)  NOT NULL UNIQUE,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Doctors, each belonging to one department. col_index drives the
-- scheduler's column layout; full_name is the exact UI label.
CREATE TABLE doctors (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(120) NOT NULL UNIQUE,
    department_id INT          NOT NULL,
    col_index     INT          NOT NULL DEFAULT 0,
    is_active     TINYINT(1)   NOT NULL DEFAULT 1,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_doctor_dept FOREIGN KEY (department_id)
        REFERENCES departments(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_doctor_dept (department_id)
) ENGINE=InnoDB;

-- Catalogue of consent documents. Ids 1..5 match the front-end CONSENT_FORMS.
CREATE TABLE consent_forms (
    id    INT AUTO_INCREMENT PRIMARY KEY,
    name  VARCHAR(120) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- Billable treatments / consumables (the front-end TREATMENT_CATALOG).
CREATE TABLE treatment_catalog (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    code          VARCHAR(30)   NOT NULL UNIQUE,
    name          VARCHAR(150)  NOT NULL,
    unit_price    DECIMAL(12,2) NOT NULL DEFAULT 0,
    is_active     TINYINT(1)    NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- Insurance / membership plans a patient can hold.
CREATE TABLE insurance_plans (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    name      VARCHAR(150) NOT NULL UNIQUE,
    provider  VARCHAR(120)
) ENGINE=InnoDB;

-- ============================================================
--  2. PEOPLE
-- ============================================================

CREATE TABLE staff (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    full_name  VARCHAR(120) NOT NULL,
    role       VARCHAR(60)  NOT NULL DEFAULT 'Reception',
    email      VARCHAR(160) UNIQUE,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- One row per patient, keyed by the Medical Record Number (MRN).
-- Stable demographic + clinical attributes live here (3NF: blood
-- group depends on the patient, not on each visit).
CREATE TABLE patients (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    mrn           VARCHAR(40)  NOT NULL UNIQUE,
    full_name     VARCHAR(150) NOT NULL,
    national_id   VARCHAR(60),
    dob           DATE,
    phone         VARCHAR(40),
    is_resident   TINYINT(1)   NOT NULL DEFAULT 1,
    blood_group   VARCHAR(5),
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_patient_name (full_name)
) ENGINE=InnoDB;

-- Patient allergies (multi-valued → own table).
CREATE TABLE patient_allergies (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    patient_id  INT          NOT NULL,
    allergen    VARCHAR(120) NOT NULL,
    CONSTRAINT fk_allergy_patient FOREIGN KEY (patient_id)
        REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_allergy_patient (patient_id)
) ENGINE=InnoDB;

-- Chronic / ongoing conditions (multi-valued → own table).
CREATE TABLE patient_conditions (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    patient_id     INT          NOT NULL,
    condition_name VARCHAR(120) NOT NULL,
    CONSTRAINT fk_condition_patient FOREIGN KEY (patient_id)
        REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_condition_patient (patient_id)
) ENGINE=InnoDB;

-- Insurance packages held by a patient (clinicalProfile.packages).
CREATE TABLE patient_packages (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    patient_id      INT NOT NULL,
    plan_id         INT,
    plan_name       VARCHAR(150) NOT NULL,
    activation_date DATE,
    expiry_date     DATE,
    usage_note      VARCHAR(160),
    status          VARCHAR(20) DEFAULT 'Active',
    CONSTRAINT fk_pkg_patient FOREIGN KEY (patient_id)
        REFERENCES patients(id) ON DELETE CASCADE,
    CONSTRAINT fk_pkg_plan FOREIGN KEY (plan_id)
        REFERENCES insurance_plans(id) ON DELETE SET NULL,
    INDEX idx_pkg_patient (patient_id)
) ENGINE=InnoDB;

-- ============================================================
--  3. CLINICAL — APPOINTMENTS & ENCOUNTERS
-- ============================================================

CREATE TABLE appointments (
    id             VARCHAR(40) PRIMARY KEY,        -- e.g. 'app-1', 'app-<ts>'
    patient_id     INT         NOT NULL,
    doctor_id      INT         NOT NULL,
    appt_date      DATE,
    start_hour     TINYINT     NOT NULL DEFAULT 0, -- 0-23
    start_minute   TINYINT     NOT NULL DEFAULT 0, -- 0-59
    duration_min   INT         NOT NULL DEFAULT 30,
    reason         TEXT,
    status         VARCHAR(30) NOT NULL DEFAULT 'scheduled',
    confirm_status VARCHAR(30),
    overdue_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_date   VARCHAR(40),                    -- UI display stamp
    modified_date  VARCHAR(40),                    -- UI display stamp
    created_at     TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id)
        REFERENCES patients(id) ON DELETE CASCADE,
    CONSTRAINT fk_appt_doctor FOREIGN KEY (doctor_id)
        REFERENCES doctors(id) ON DELETE RESTRICT,
    INDEX idx_appt_date (appt_date),
    INDEX idx_appt_patient (patient_id),
    INDEX idx_appt_doctor (doctor_id)
) ENGINE=InnoDB;

-- Vitals captured at a visit.
CREATE TABLE vitals (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id  VARCHAR(40) NOT NULL,
    recorded_on     DATE,
    blood_pressure  VARCHAR(15),     -- '135/85'
    heart_rate      VARCHAR(15),     -- '82 bpm'
    weight          VARCHAR(15),     -- '88 kg'
    CONSTRAINT fk_vitals_appt FOREIGN KEY (appointment_id)
        REFERENCES appointments(id) ON DELETE CASCADE,
    INDEX idx_vitals_appt (appointment_id)
) ENGINE=InnoDB;

-- Historical clinical encounters / diagnoses on a patient's record.
CREATE TABLE encounters (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    patient_id     INT          NOT NULL,
    encounter_date DATE,
    diagnosis      VARCHAR(200),
    status         VARCHAR(60),     -- 'Resolved', 'Follow-up Reqd', ...
    doctor_label   VARCHAR(120),    -- short name as stored in UI ('Dr. Fatima')
    dept_label     VARCHAR(80),
    CONSTRAINT fk_enc_patient FOREIGN KEY (patient_id)
        REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_enc_patient (patient_id)
) ENGINE=InnoDB;

-- Items / consumables dispensed to the patient (clinicalProfile.items).
CREATE TABLE dispensed_items (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    patient_id    INT          NOT NULL,
    treatment_id  INT,
    item_date     DATE,
    description   VARCHAR(200) NOT NULL,
    quantity      VARCHAR(40),     -- '2 Vials', '3 Packs' (free-text)
    dept_label    VARCHAR(80),
    CONSTRAINT fk_item_patient FOREIGN KEY (patient_id)
        REFERENCES patients(id) ON DELETE CASCADE,
    CONSTRAINT fk_item_treatment FOREIGN KEY (treatment_id)
        REFERENCES treatment_catalog(id) ON DELETE SET NULL,
    INDEX idx_item_patient (patient_id)
) ENGINE=InnoDB;

-- ============================================================
--  4. BILLING
-- ============================================================

-- One invoice per appointment (header).
CREATE TABLE invoices (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    invoice_no     VARCHAR(40) NOT NULL UNIQUE,    -- 'INV-2026-1042'
    appointment_id VARCHAR(40),
    issue_date     DATE,
    payment_method VARCHAR(60),
    amount_paid    DECIMAL(12,2) NOT NULL DEFAULT 0,
    is_paid        TINYINT(1)    NOT NULL DEFAULT 0,
    created_at     TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inv_appt FOREIGN KEY (appointment_id)
        REFERENCES appointments(id) ON DELETE CASCADE,
    INDEX idx_inv_appt (appointment_id)
) ENGINE=InnoDB;

-- Invoice line items (gross/disc/nett/vat/total per line in the UI).
CREATE TABLE invoice_lines (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id    INT          NOT NULL,
    treatment_id  INT,
    code          VARCHAR(30),
    description   VARCHAR(200) NOT NULL,
    qty           INT          NOT NULL DEFAULT 1,
    gross         DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount      DECIMAL(12,2) NOT NULL DEFAULT 0,
    nett          DECIMAL(12,2) NOT NULL DEFAULT 0,
    vat           DECIMAL(12,2) NOT NULL DEFAULT 0,
    line_total    DECIMAL(12,2) NOT NULL DEFAULT 0,
    CONSTRAINT fk_line_invoice FOREIGN KEY (invoice_id)
        REFERENCES invoices(id) ON DELETE CASCADE,
    CONSTRAINT fk_line_treatment FOREIGN KEY (treatment_id)
        REFERENCES treatment_catalog(id) ON DELETE SET NULL,
    INDEX idx_line_invoice (invoice_id)
) ENGINE=InnoDB;

-- Payments ledger: one row per money received. Linked to a patient
-- (by MRN upsert) and best-effort to its invoice (by invoice_no).
-- doctor/dept kept as the short labels the UI shows.
CREATE TABLE payments (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    invoice_no    VARCHAR(40),
    invoice_id    INT,
    patient_id    INT,
    doctor_label  VARCHAR(120),
    dept_label    VARCHAR(80),
    amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
    method        VARCHAR(60),
    collected_by  VARCHAR(80),
    paid_at       VARCHAR(40),                     -- ISO string from UI
    visit_date    VARCHAR(40),
    CONSTRAINT fk_pay_invoice FOREIGN KEY (invoice_id)
        REFERENCES invoices(id) ON DELETE SET NULL,
    CONSTRAINT fk_pay_patient FOREIGN KEY (patient_id)
        REFERENCES patients(id) ON DELETE SET NULL,
    INDEX idx_pay_patient (patient_id),
    INDEX idx_pay_invoice_no (invoice_no)
) ENGINE=InnoDB;

-- ============================================================
--  5. CONSENT (junction: appointment <-> consent_form)
-- ============================================================
CREATE TABLE appointment_consents (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id   VARCHAR(40) NOT NULL,
    consent_form_id  INT         NOT NULL,
    relation_type    VARCHAR(60),                 -- 'Self', 'Guardian', ...
    relation_name    VARCHAR(120),
    signed_by_patient TINYINT(1) NOT NULL DEFAULT 0,
    accepted         TINYINT(1)  NOT NULL DEFAULT 0,
    patient_signature LONGTEXT,                   -- base64 PNG data URL
    doctor_signature  LONGTEXT,
    signed           TINYINT(1)  NOT NULL DEFAULT 0,
    status           VARCHAR(20) NOT NULL DEFAULT 'Awaiting',
    signed_at        VARCHAR(40),                 -- UI display stamp
    CONSTRAINT fk_consent_appt FOREIGN KEY (appointment_id)
        REFERENCES appointments(id) ON DELETE CASCADE,
    CONSTRAINT fk_consent_form FOREIGN KEY (consent_form_id)
        REFERENCES consent_forms(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_appt_form (appointment_id, consent_form_id)
) ENGINE=InnoDB;

-- ============================================================
--  6. OPERATIONS
-- ============================================================

-- Live waiting-room queue (transient).
CREATE TABLE live_queue (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    patient_id     INT,
    doctor_label   VARCHAR(120),                  -- app.doctorName (full label)
    reason         TEXT,
    checked_in_at  VARCHAR(40),                   -- ISO string from UI
    CONSTRAINT fk_queue_patient FOREIGN KEY (patient_id)
        REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_queue_patient (patient_id)
) ENGINE=InnoDB;

-- Audit / activity feed.
CREATE TABLE activity_log (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    log_time  VARCHAR(40),
    message   VARCHAR(255) NOT NULL,
    author    VARCHAR(80)
) ENGINE=InnoDB;

-- ============================================================
--  SEED REFERENCE DATA
-- ============================================================
INSERT INTO departments (name) VALUES
    ('General Practice'), ('Dental Surgery'), ('Dermatology'),
    ('Pediatrics'), ('Orthopedics');

INSERT INTO doctors (full_name, department_id, col_index) VALUES
    ('Dr. Mohammed (General Practice)', 1, 0),
    ('Dr. Fatima (Dental Surgery)',     2, 1),
    ('Dr. Roger (Dermatology)',         3, 2),
    ('Dr. Sarah (Pediatrics)',          4, 3),
    ('Dr. Ali (Orthopedics)',           5, 4);

INSERT INTO consent_forms (name) VALUES
    ('General Consent form'),
    ('Dermal Filler Consent Form'),
    ('BOTOX CONSENT FORM NEW - edited'),
    ('Adult Psychotherapy Consent Form'),
    ('Informed Consent Form');

INSERT INTO treatment_catalog (code, name, unit_price) VALUES
    ('CONS-GP-001',  'Consultation - General Practice',  164.00),
    ('CONS-DRM-002', 'Consultation - Dermatology',       250.00),
    ('CONS-DEN-003', 'Consultation - Dental Surgery',    300.00),
    ('CONS-PED-004', 'Consultation - Pediatrics',        200.00),
    ('CONS-ORT-005', 'Consultation - Orthopedics',       280.00),
    ('PKG-FAM-010',  'Family Consultation Package',    14300.00),
    ('FUP-007',      'Free Follow-up Consultation',        0.00),
    ('LIDO-2',       'Lidocaine Injection 2% (Anesthesia)',45.00),
    ('GAUZE-44',     'Sterile Gauze Pad 4x4',             12.00),
    ('HYDRO-1',      'Topical Hydrocortisone Cream 1%',   60.00),
    ('GLOVE-EXM',    'Disposable Examination Gloves',      8.00),
    ('BOTOX-U',      'Botox (per Unit)',                  40.00),
    ('FILLER-ML',    'Dermal Filler (per mL)',          1200.00);

INSERT INTO insurance_plans (name, provider) VALUES
    ('Sukoon Insurance - Silver Classic', 'Sukoon'),
    ('DHA Essential Benefits Plan (EBP)', 'DHA'),
    ('GIG Gulf Comprehensive Care',       'GIG Gulf'),
    ('Daman (Thiqa Plan)',                'Daman');

INSERT INTO staff (full_name, role, email) VALUES
    ('System Admin', 'Administrator', 'admin@medcore.local'),
    ('Reception',    'Reception',     'reception@medcore.local');
