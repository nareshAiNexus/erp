-- ─────────────────────────────────────────────────────────────────────────────
-- Chat / Messaging Schema (plain Postgres compatible — no Supabase RLS roles)
-- ─────────────────────────────────────────────────────────────────────────────

-- conversation type enum
DO $$ BEGIN
  CREATE TYPE conv_type AS ENUM ('dm', 'group');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- socket presence enum
DO $$ BEGIN
  CREATE TYPE socket_status AS ENUM ('online', 'offline');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- conversations
CREATE TABLE IF NOT EXISTS conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        conv_type NOT NULL DEFAULT 'dm',
  name        text,
  created_by  uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- conversation_members
CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id      uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id              uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  joined_at            timestamptz NOT NULL DEFAULT now(),
  last_read_message_id uuid,
  PRIMARY KEY (conversation_id, user_id)
);

-- messages
CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  body            text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  edited_at       timestamptz
);

-- presence_state
CREATE TABLE IF NOT EXISTS presence_state (
  user_id       uuid PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  socket_status socket_status NOT NULL DEFAULT 'offline',
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conv      ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender    ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_user  ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_conv  ON conversation_members(conversation_id);
