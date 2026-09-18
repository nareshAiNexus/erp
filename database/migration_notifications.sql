-- Migration: Notifications system
-- Run: Get-Content database/migration_notifications.sql | docker exec -i erp_db psql -U postgres -d erp

CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id  UUID REFERENCES employees(id) ON DELETE CASCADE,
  type         VARCHAR(60)  NOT NULL,          -- 'new_ticket' | 'ticket_update' | 'leave_request'
  message      TEXT         NOT NULL,
  is_read      BOOLEAN      DEFAULT FALSE,
  related_id   UUID,                           -- support_tickets.id or leave_requests.id
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_employee ON notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread   ON notifications(employee_id, is_read);
