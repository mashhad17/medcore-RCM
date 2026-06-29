-- ============================================================
--  MedCore HMS — One-time purge of seeded DEMO clinical data
--  ------------------------------------------------------------
--  Removes the fabricated demo patients (Kavya/Zain/Ameem/etc.)
--  and ALL transient/clinical/financial rows so the app reads
--  real / empty state instead of fake data.
--
--  PRESERVES reference + auth data:
--    departments, doctors, consent_forms, treatment_catalog,
--    insurance_plans, staff.
--
--  Run once in phpMyAdmin (SQL tab) against `medcore_db`.
--  Patient child rows (allergies, conditions, packages, encounters,
--  dispensed_items, appointments, vitals, invoices, invoice_lines,
--  consents, live_queue, payments) are removed via ON DELETE CASCADE
--  when their patient/appointment is deleted, but we also clear the
--  operational tables explicitly so nothing orphaned survives.
-- ============================================================
USE medcore_db;

SET FOREIGN_KEY_CHECKS = 0;

-- Operational / transient
TRUNCATE TABLE live_queue;
TRUNCATE TABLE activity_log;

-- Billing
TRUNCATE TABLE payments;
TRUNCATE TABLE invoice_lines;
TRUNCATE TABLE invoices;

-- Visit-scoped clinical
TRUNCATE TABLE appointment_consents;
TRUNCATE TABLE vitals;

-- Patient-scoped clinical
TRUNCATE TABLE dispensed_items;
TRUNCATE TABLE encounters;
TRUNCATE TABLE patient_packages;
TRUNCATE TABLE patient_conditions;
TRUNCATE TABLE patient_allergies;

-- Core
TRUNCATE TABLE appointments;
TRUNCATE TABLE patients;

SET FOREIGN_KEY_CHECKS = 1;
