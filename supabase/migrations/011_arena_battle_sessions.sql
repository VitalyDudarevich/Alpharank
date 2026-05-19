-- Arena battles: sessions with lifecycle (active / ended), optional game lock

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_league_id_session_date_key;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

UPDATE sessions
SET
  status = COALESCE(status, 'ended'),
  ended_at = COALESCE(ended_at, created_at),
  started_at = COALESCE(started_at, created_at)
WHERE status IS NULL OR ended_at IS NULL OR started_at IS NULL;

ALTER TABLE sessions
  ALTER COLUMN status SET DEFAULT 'ended',
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE sessions
  ADD CONSTRAINT sessions_status_check CHECK (status IN ('active', 'ended'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_one_active_per_league
  ON sessions (league_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_sessions_league_status_ended
  ON sessions (league_id, status, ended_at DESC NULLS LAST);
