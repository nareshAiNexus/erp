-- Migration: Support Tickets system
-- Run: Get-Content database/migration_tickets.sql | docker exec -i erp_db psql -U postgres -d erp

CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_no   SERIAL,                           -- human-readable #1, #2, ...
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  category    VARCHAR(100) NOT NULL DEFAULT 'general',
  priority    VARCHAR(20)  NOT NULL DEFAULT 'medium',  -- low | medium | high | critical
  status      VARCHAR(30)  NOT NULL DEFAULT 'new',     -- new | open | pending | resolved | closed
  admin_notes TEXT,                              -- admin can add notes when acting on ticket
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-update updated_at on every change
CREATE OR REPLACE FUNCTION update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON support_tickets;
CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_ticket_timestamp();

-- Index for fast employee lookups
CREATE INDEX IF NOT EXISTS idx_tickets_employee ON support_tickets(employee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status   ON support_tickets(status);
