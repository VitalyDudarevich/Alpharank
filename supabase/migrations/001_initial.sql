-- alphaRank: arena-only schema (sessions, participants, score events, user games)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Sessions (battles)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  game_name TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ended' CHECK (status IN ('active', 'ended')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_active_by_user
  ON sessions (created_by, started_at DESC NULLS LAST)
  WHERE status = 'active';

CREATE INDEX idx_sessions_user_history
  ON sessions (created_by, status, ended_at DESC NULLS LAST);

-- Battle participants (per session)
CREATE TABLE battle_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) >= 1),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_battle_participants_session ON battle_participants(session_id);

-- Score events
CREATE TABLE score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  winner_participant_id UUID NOT NULL REFERENCES battle_participants(id) ON DELETE RESTRICT,
  participant_ids UUID[] NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_score_events_session ON score_events(session_id);
CREATE INDEX idx_score_events_created ON score_events(created_at);

-- Personal game catalog
CREATE TABLE user_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 1),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX user_games_user_name_lower
  ON user_games (user_id, lower(trim(name)));

CREATE INDEX idx_user_games_user ON user_games(user_id, sort_order);

-- RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator can view own sessions"
  ON sessions FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Creator can insert own sessions"
  ON sessions FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator can update own sessions"
  ON sessions FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Creator can delete own sessions"
  ON sessions FOR DELETE
  USING (created_by = auth.uid());

CREATE POLICY "Session owner can manage battle participants"
  ON battle_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id AND s.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Creator can view own score events"
  ON score_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Creator can insert own score events"
  ON score_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Creator can update own score events"
  ON score_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id AND s.created_by = auth.uid()
    )
  );

CREATE POLICY "Users manage own games"
  ON user_games FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
