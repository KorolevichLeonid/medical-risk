-- Migration: Make severity_score, probability_score, and risk_score nullable
-- Date: 2025-10-19
-- Description: Changes NOT NULL constraint to allow NULL for risk score fields

-- Step 1: Create backup table
CREATE TABLE IF NOT EXISTS risk_factors_backup AS SELECT * FROM risk_factors;

-- Step 2: Create new table with correct schema
CREATE TABLE risk_factors_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id INTEGER NOT NULL,
    lifecycle_stage VARCHAR NOT NULL,
    hazard_name VARCHAR NOT NULL,
    hazardous_situation TEXT NOT NULL,
    sequence_of_events TEXT NOT NULL,
    harm TEXT NOT NULL,
    hazard_category VARCHAR NOT NULL,
    severity_score INTEGER,
    probability_score INTEGER,
    risk_score INTEGER,
    control_measures TEXT,
    residual_risk_score INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    FOREIGN KEY(analysis_id) REFERENCES risk_analyses(id)
);

-- Step 3: Copy all data from old table to new table
INSERT INTO risk_factors_new 
SELECT * FROM risk_factors;

-- Step 4: Drop old table
DROP TABLE risk_factors;

-- Step 5: Rename new table to original name
ALTER TABLE risk_factors_new RENAME TO risk_factors;

-- Verify migration
SELECT 'Migration completed. Total rows: ' || COUNT(*) FROM risk_factors;

