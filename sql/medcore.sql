-- ============================================================
--  MedCore HMS — Database Schema
--  Run this once in phpMyAdmin (Import or SQL tab) to create the DB.
-- ============================================================

CREATE DATABASE IF NOT EXISTS medcore
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medcore;

-- ----------------------------------------------------------
--  Reference: doctors
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctors (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    department  VARCHAR(80)  NOT NULL,
    col_index   INT          NOT NULL DEFAULT 0
);

INSERT INTO doctors (name, department, col_index) VALUES
    ('Dr. Mohammed (General Practice)', 'General Practice', 0),
    ('Dr. Fatima (Dental Surgery)',     'Dental Surgery',   1),
    ('Dr. Roger (Dermatology)',         'Dermatology',      2),
    ('Dr. Sarah (Pediatrics)',          'Pediatrics',       3),
    ('Dr. Ali (Orthopedics)',           'Orthopedics',      4);

-- ----------------------------------------------------------
--  Reference: consent_forms
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS consent_forms (
    id    INT PRIMARY KEY,
    name  VARCHAR(120) NOT NULL
);

INSERT INTO consent_forms (id, name) VALUES
    (1, 'General Consent form'),
    (2, 'Dermal Filler Consent Form'),
    (3, 'BOTOX CONSENT FORM NEW - edited'),
    (4, 'Adult Psychotherapy Consent Form'),
    (5, 'Informed Consent Form');

-- ----------------------------------------------------------
--  Appointments (core records). Deeply-nested clinical data,
--  invoice line items and consent records are kept as JSON text
--  so the existing front-end object shape is preserved exactly.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
    id               VARCHAR(40) PRIMARY KEY,
    patient_name     VARCHAR(150),
    mrn              VARCHAR(40),
    nid              VARCHAR(60),
    dob              VARCHAR(20),
    phone            VARCHAR(40),
    resident         VARCHAR(10),
    doctor_name      VARCHAR(120),
    col_index        INT,
    appt_date        VARCHAR(20),
    start_hour       INT,
    start_minute     INT,
    duration         INT,
    reason           TEXT,
    status           VARCHAR(30),
    confirm_status   VARCHAR(30),
    overdue          DECIMAL(12,2) DEFAULT 0,
    created_date     VARCHAR(40),
    modified_date    VARCHAR(40),
    clinical_profile LONGTEXT,
    invoice          LONGTEXT,
    consents         LONGTEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mrn (mrn),
    INDEX idx_date (appt_date)
);

-- ----------------------------------------------------------
--  Payments ledger (one row per collected invoice)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    invoice_no    VARCHAR(40),
    patient_name  VARCHAR(150),
    mrn           VARCHAR(40),
    doctor        VARCHAR(120),
    dept          VARCHAR(80),
    amount        DECIMAL(12,2),
    method        VARCHAR(60),
    collected_by  VARCHAR(80),
    paid_at       VARCHAR(40),
    visit_date    VARCHAR(40),
    INDEX idx_mrn (mrn),
    INDEX idx_doctor (doctor)
);

-- ----------------------------------------------------------
--  Live waiting-room queue
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS live_queue (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    mrn            VARCHAR(40),
    patient_name   VARCHAR(150),
    doctor         VARCHAR(120),
    reason         TEXT,
    checked_in_at  VARCHAR(40)
);

-- ----------------------------------------------------------
--  Activity ledger
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_log (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    log_time   VARCHAR(20),
    text       VARCHAR(255),
    author     VARCHAR(80)
);
