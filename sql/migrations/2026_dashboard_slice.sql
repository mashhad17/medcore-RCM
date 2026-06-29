-- ============================================================
--  MedCore HMS — Migration: Dashboard Slice (MySQL)
--  Upgrades the activity feed into a real append-only event log
--  and adds an optional manual provider status override.
--  Run once in phpMyAdmin (SQL tab) against database `medcore_db`.
-- ============================================================
USE medcore_db;

-- ── Activity log: real append-only chronological event feed ──
-- The old model stored only a display-string `log_time`. We add a
-- machine timestamp (for correct ordering) and an event_type so the
-- feed can be filtered/labelled later.
ALTER TABLE activity_log
    ADD COLUMN event_type VARCHAR(40) NULL AFTER author,
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER event_type;

CREATE INDEX idx_activity_created ON activity_log (created_at);

-- ── OPTIONAL: provider "On Break" / manual override ──
-- Provider status is otherwise DERIVED (Available / In Consultation /
-- Off-Shift). "On Break" cannot be derived from data, so it needs a
-- manual toggle. NULL = derive automatically.
ALTER TABLE doctors
    ADD COLUMN manual_status VARCHAR(20) NULL AFTER is_active;  -- 'On Break' | 'Off-Shift' | NULL

-- ============================================================
--  ROLLBACK  (run only to undo this migration)
-- ============================================================
-- USE medcore_db;
-- DROP INDEX idx_activity_created ON activity_log;
-- ALTER TABLE activity_log DROP COLUMN created_at, DROP COLUMN event_type;
-- ALTER TABLE doctors DROP COLUMN manual_status;
