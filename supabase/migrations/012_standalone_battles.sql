-- Standalone battles (no league): ad-hoc game name and participants

ALTER TABLE sessions
  ALTER COLUMN league_id DROP NOT NULL;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS game_name TEXT;

ALTER TABLE score_events
  ALTER COLUMN league_id DROP NOT NULL,
  ALTER COLUMN game_id DROP NOT NULL,
  ALTER COLUMN winner_member_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS battle_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) >= 1),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE score_events
  ADD COLUMN IF NOT EXISTS winner_participant_id UUID REFERENCES battle_participants(id) ON DELETE SET NULL;

ALTER TABLE score_events DROP CONSTRAINT IF EXISTS score_events_winner_check;
ALTER TABLE score_events
  ADD CONSTRAINT score_events_winner_check CHECK (
    (winner_member_id IS NOT NULL AND winner_participant_id IS NULL)
    OR (winner_member_id IS NULL AND winner_participant_id IS NOT NULL)
  );

DROP INDEX IF EXISTS idx_sessions_one_active_per_league;
CREATE UNIQUE INDEX idx_sessions_one_active_per_league
  ON sessions (league_id)
  WHERE status = 'active' AND league_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_one_active_standalone_per_user
  ON sessions (created_by)
  WHERE status = 'active' AND league_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_standalone_user
  ON sessions (created_by, status, ended_at DESC NULLS LAST)
  WHERE league_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_battle_participants_session
  ON battle_participants(session_id);

-- Sessions RLS: league + standalone
DROP POLICY IF EXISTS "Members can view sessions" ON sessions;
DROP POLICY IF EXISTS "Members can manage sessions" ON sessions;

CREATE POLICY "Members can view league sessions"
  ON sessions FOR SELECT
  USING (league_id IS NOT NULL AND is_league_member(league_id));

CREATE POLICY "Creator can view standalone sessions"
  ON sessions FOR SELECT
  USING (league_id IS NULL AND created_by = auth.uid());

CREATE POLICY "Members can insert league sessions"
  ON sessions FOR INSERT
  WITH CHECK (league_id IS NOT NULL AND is_league_member(league_id));

CREATE POLICY "Creator can insert standalone sessions"
  ON sessions FOR INSERT
  WITH CHECK (league_id IS NULL AND created_by = auth.uid());

CREATE POLICY "Members can update league sessions"
  ON sessions FOR UPDATE
  USING (league_id IS NOT NULL AND is_league_member(league_id));

CREATE POLICY "Creator can update standalone sessions"
  ON sessions FOR UPDATE
  USING (league_id IS NULL AND created_by = auth.uid());

CREATE POLICY "Members can delete league sessions"
  ON sessions FOR DELETE
  USING (league_id IS NOT NULL AND is_league_member(league_id));

CREATE POLICY "Creator can delete standalone sessions"
  ON sessions FOR DELETE
  USING (league_id IS NULL AND created_by = auth.uid());

-- Score events RLS
DROP POLICY IF EXISTS "Members can view score events" ON score_events;
DROP POLICY IF EXISTS "Members can insert score events" ON score_events;
DROP POLICY IF EXISTS "Members can update score events" ON score_events;

CREATE POLICY "Members can view league score events"
  ON score_events FOR SELECT
  USING (league_id IS NOT NULL AND is_league_member(league_id));

CREATE POLICY "Creator can view standalone score events"
  ON score_events FOR SELECT
  USING (
    league_id IS NULL
    AND EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id AND s.league_id IS NULL AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Members can insert league score events"
  ON score_events FOR INSERT
  WITH CHECK (league_id IS NOT NULL AND is_league_member(league_id));

CREATE POLICY "Creator can insert standalone score events"
  ON score_events FOR INSERT
  WITH CHECK (
    league_id IS NULL
    AND EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id AND s.league_id IS NULL AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Members can update league score events"
  ON score_events FOR UPDATE
  USING (league_id IS NOT NULL AND is_league_member(league_id));

CREATE POLICY "Creator can update standalone score events"
  ON score_events FOR UPDATE
  USING (
    league_id IS NULL
    AND EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id AND s.league_id IS NULL AND s.created_by = auth.uid()
    )
  );

-- Battle participants RLS
ALTER TABLE battle_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session viewers can manage battle participants"
  ON battle_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id
        AND (
          (s.league_id IS NOT NULL AND is_league_member(s.league_id))
          OR (s.league_id IS NULL AND s.created_by = auth.uid())
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id
        AND (
          (s.league_id IS NOT NULL AND is_league_member(s.league_id))
          OR (s.league_id IS NULL AND s.created_by = auth.uid())
        )
    )
  );
