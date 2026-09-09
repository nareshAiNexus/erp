/*
# Create ERP Database Schema

## Overview
This migration creates the complete schema for a minimal ERP system covering
employee management, attendance, inventory, payroll, leave tracking, and
company policies. The app is single-tenant (no sign-in), so all policies
allow anon + authenticated access.

## New Tables

1. **employees** - Core employee records
   - id (uuid, PK)
   - first_name (text, not null)
   - last_name (text, not null)
   - email (text, unique)
   - phone (text)
   - department (text)
   - role (text)
   - employment_type (text: full_time | part_time | contractor)
   - salary (numeric, annual salary)
   - hire_date (date)
   - status (text: active | on_leave | terminated)
   - avatar_url (text, nullable)
   - address (text, nullable)
   - created_at (timestamptz)

2. **attendance** - Daily attendance check-in/check-out records
   - id (uuid, PK)
   - employee_id (uuid, FK to employees)
   - date (date, not null)
   - check_in (timestamptz, nullable)
   - check_out (timestamptz, nullable)
   - status (text: present | absent | late | half_day | remote)
   - notes (text, nullable)
   - created_at (timestamptz)

3. **inventory_items** - Inventory/stock items
   - id (uuid, PK)
   - name (text, not null)
   - sku (text, unique)
   - category (text)
   - quantity (integer, default 0)
   - unit_price (numeric, default 0)
   - reorder_level (integer, default 10)
   - supplier (text, nullable)
   - location (text, nullable)
   - created_at (timestamptz)

4. **payroll_records** - Monthly payroll records per employee
   - id (uuid, PK)
   - employee_id (uuid, FK to employees)
   - pay_period_month (text, e.g. "2026-09")
   - base_salary (numeric)
   - bonuses (numeric, default 0)
   - deductions (numeric, default 0)
   - tax (numeric, default 0)
   - net_pay (numeric)
   - status (text: pending | processed | paid)
   - created_at (timestamptz)

5. **leave_requests** - Leave time-off requests
   - id (uuid, PK)
   - employee_id (uuid, FK to employees)
   - leave_type (text: annual | sick | personal | unpaid | maternity | paternity)
   - start_date (date, not null)
   - end_date (date, not null)
   - days (integer)
   - reason (text, nullable)
   - status (text: pending | approved | rejected | cancelled)
   - created_at (timestamptz)

6. **policies** - Company policy documents
   - id (uuid, PK)
   - title (text, not null)
   - category (text: hr | it | finance | operations | security | general)
   - content (text, full policy text)
   - version (text, default "1.0")
   - effective_date (date)
   - last_updated (timestamptz)
   - created_at (timestamptz)

## Security
- RLS enabled on all tables.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a single-tenant app with no sign-in — the data is intentionally shared.
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE).
*/

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text UNIQUE,
  phone text,
  department text DEFAULT 'General',
  role text,
  employment_type text DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contractor')),
  salary numeric DEFAULT 0,
  hire_date date,
  status text DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated')),
  avatar_url text,
  address text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_employees" ON employees;
CREATE POLICY "anon_select_employees" ON employees FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_employees" ON employees;
CREATE POLICY "anon_insert_employees" ON employees FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_employees" ON employees;
CREATE POLICY "anon_update_employees" ON employees FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_employees" ON employees;
CREATE POLICY "anon_delete_employees" ON employees FOR DELETE
  TO anon, authenticated USING (true);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in timestamptz,
  check_out timestamptz,
  status text DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'remote')),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_attendance" ON attendance;
CREATE POLICY "anon_select_attendance" ON attendance FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_attendance" ON attendance;
CREATE POLICY "anon_insert_attendance" ON attendance FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_attendance" ON attendance;
CREATE POLICY "anon_update_attendance" ON attendance FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_attendance" ON attendance;
CREATE POLICY "anon_delete_attendance" ON attendance FOR DELETE
  TO anon, authenticated USING (true);

-- Inventory items
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text UNIQUE,
  category text DEFAULT 'General',
  quantity integer DEFAULT 0,
  unit_price numeric DEFAULT 0,
  reorder_level integer DEFAULT 10,
  supplier text,
  location text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_inventory" ON inventory_items;
CREATE POLICY "anon_select_inventory" ON inventory_items FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_inventory" ON inventory_items;
CREATE POLICY "anon_insert_inventory" ON inventory_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_inventory" ON inventory_items;
CREATE POLICY "anon_update_inventory" ON inventory_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_inventory" ON inventory_items;
CREATE POLICY "anon_delete_inventory" ON inventory_items FOR DELETE
  TO anon, authenticated USING (true);

-- Payroll records
CREATE TABLE IF NOT EXISTS payroll_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  pay_period_month text NOT NULL,
  base_salary numeric DEFAULT 0,
  bonuses numeric DEFAULT 0,
  deductions numeric DEFAULT 0,
  tax numeric DEFAULT 0,
  net_pay numeric DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_payroll" ON payroll_records;
CREATE POLICY "anon_select_payroll" ON payroll_records FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_payroll" ON payroll_records;
CREATE POLICY "anon_insert_payroll" ON payroll_records FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_payroll" ON payroll_records;
CREATE POLICY "anon_update_payroll" ON payroll_records FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_payroll" ON payroll_records;
CREATE POLICY "anon_delete_payroll" ON payroll_records FOR DELETE
  TO anon, authenticated USING (true);

-- Leave requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type text DEFAULT 'annual' CHECK (leave_type IN ('annual', 'sick', 'personal', 'unpaid', 'maternity', 'paternity')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  days integer DEFAULT 1,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_leave" ON leave_requests;
CREATE POLICY "anon_select_leave" ON leave_requests FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_leave" ON leave_requests;
CREATE POLICY "anon_insert_leave" ON leave_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_leave" ON leave_requests;
CREATE POLICY "anon_update_leave" ON leave_requests FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_leave" ON leave_requests;
CREATE POLICY "anon_delete_leave" ON leave_requests FOR DELETE
  TO anon, authenticated USING (true);

-- Policies
CREATE TABLE IF NOT EXISTS policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text DEFAULT 'general' CHECK (category IN ('hr', 'it', 'finance', 'operations', 'security', 'general')),
  content text,
  version text DEFAULT '1.0',
  effective_date date,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_policies" ON policies;
CREATE POLICY "anon_select_policies" ON policies FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_policies" ON policies;
CREATE POLICY "anon_insert_policies" ON policies FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_policies" ON policies;
CREATE POLICY "anon_update_policies" ON policies FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_policies" ON policies;
CREATE POLICY "anon_delete_policies" ON policies FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll_records(pay_period_month);
CREATE INDEX IF NOT EXISTS idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
