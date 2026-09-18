-- Migration: Add authentication columns to employees table
-- Run once against your postgres instance:
--   docker exec -i erp_db psql -U postgres -d erp < database/migration_auth.sql

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS auth_role VARCHAR(20) NOT NULL DEFAULT 'user';

-- Create index for fast email lookups during login
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
