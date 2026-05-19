-- alphaRank initial schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Leagues
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  year INT,
  elo_enabled BOOLEAN NOT NULL DEFAULT false,
  elo_k INT NOT NULL DEFAULT 32,
  invite_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- League members
CREATE TABLE league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (league_id, user_id)
);

-- Games
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessions (game days)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (league_id, session_date)
);

-- Session participants
CREATE TABLE session_participants (
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES league_members(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, member_id)
);

-- Score events
CREATE TABLE score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  winner_member_id UUID NOT NULL REFERENCES league_members(id) ON DELETE CASCADE,
  participant_ids UUID[] NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ELO ratings (game_id NULL = overall)
CREATE TABLE elo_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES league_members(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  rating NUMERIC(8,2) NOT NULL DEFAULT 1500,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX elo_ratings_overall ON elo_ratings (member_id) WHERE game_id IS NULL;
CREATE UNIQUE INDEX elo_ratings_per_game ON elo_ratings (member_id, game_id) WHERE game_id IS NOT NULL;

-- Indexes
CREATE INDEX idx_league_members_league ON league_members(league_id);
CREATE INDEX idx_league_members_user ON league_members(user_id);
CREATE INDEX idx_games_league ON games(league_id);
CREATE INDEX idx_sessions_league_date ON sessions(league_id, session_date);
CREATE INDEX idx_score_events_league ON score_events(league_id, created_at);
CREATE INDEX idx_score_events_session ON score_events(session_id);
CREATE INDEX idx_audit_logs_league ON audit_logs(league_id, created_at DESC);

-- Helper: is league member
CREATE OR REPLACE FUNCTION is_league_member(p_league_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM league_members
    WHERE league_id = p_league_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: is league owner
CREATE OR REPLACE FUNCTION is_league_owner(p_league_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM league_members
    WHERE league_id = p_league_id AND user_id = auth.uid() AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE elo_ratings ENABLE ROW LEVEL SECURITY;

-- Leagues policies
CREATE POLICY "Members and creators can view leagues"
  ON leagues FOR SELECT
  USING (is_league_member(id) OR created_by = auth.uid());

CREATE POLICY "Users can create leagues"
  ON leagues FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update leagues"
  ON leagues FOR UPDATE
  USING (is_league_owner(id));

-- League members policies
CREATE POLICY "Members can view league members"
  ON league_members FOR SELECT
  USING (is_league_member(league_id));

CREATE POLICY "Users can join via insert"
  ON league_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can update own profile"
  ON league_members FOR UPDATE
  USING (user_id = auth.uid());

-- Games policies
CREATE POLICY "Members can view games"
  ON games FOR SELECT USING (is_league_member(league_id));

CREATE POLICY "Members can manage games"
  ON games FOR ALL USING (is_league_member(league_id));

-- Sessions policies
CREATE POLICY "Members can view sessions"
  ON sessions FOR SELECT USING (is_league_member(league_id));

CREATE POLICY "Members can manage sessions"
  ON sessions FOR ALL USING (is_league_member(league_id));

-- Session participants
CREATE POLICY "Members can view participants"
  ON session_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id AND is_league_member(s.league_id)
    )
  );

CREATE POLICY "Members can manage participants"
  ON session_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id AND is_league_member(s.league_id)
    )
  );

-- Score events
CREATE POLICY "Members can view score events"
  ON score_events FOR SELECT USING (is_league_member(league_id));

CREATE POLICY "Members can insert score events"
  ON score_events FOR INSERT WITH CHECK (is_league_member(league_id));

CREATE POLICY "Members can update score events"
  ON score_events FOR UPDATE USING (is_league_member(league_id));

-- Audit logs
CREATE POLICY "Members can view audit logs"
  ON audit_logs FOR SELECT USING (is_league_member(league_id));

CREATE POLICY "Members can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (
    is_league_member(league_id)
    OR EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = league_id AND l.created_by = auth.uid()
    )
  );

-- ELO ratings
CREATE POLICY "Members can view elo"
  ON elo_ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members lm
      WHERE lm.id = member_id AND is_league_member(lm.league_id)
    )
  );

CREATE POLICY "Members can upsert elo"
  ON elo_ratings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM league_members lm
      WHERE lm.id = member_id AND is_league_member(lm.league_id)
    )
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE score_events;
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;

-- RPC: get stats with filters
CREATE OR REPLACE FUNCTION get_league_stats(
  p_league_id UUID,
  p_game_id UUID DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_player_count INT DEFAULT NULL,
  p_roster_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  member_id UUID,
  display_name TEXT,
  wins BIGINT,
  games_played BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_events AS (
    SELECT se.*
    FROM score_events se
    JOIN sessions s ON s.id = se.session_id
    WHERE se.league_id = p_league_id
      AND se.deleted_at IS NULL
      AND (p_game_id IS NULL OR se.game_id = p_game_id)
      AND (p_date_from IS NULL OR s.session_date >= p_date_from)
      AND (p_date_to IS NULL OR s.session_date <= p_date_to)
      AND (p_player_count IS NULL OR array_length(se.participant_ids, 1) = p_player_count)
      AND (
        p_roster_ids IS NULL
        OR (
          array_length(se.participant_ids, 1) = array_length(p_roster_ids, 1)
          AND se.participant_ids @> p_roster_ids
          AND se.participant_ids <@ p_roster_ids
        )
      )
  ),
  member_wins AS (
    SELECT winner_member_id AS mid, COUNT(*)::BIGINT AS w
    FROM filtered_events
    GROUP BY winner_member_id
  ),
  member_played AS (
    SELECT unnest(participant_ids) AS mid, COUNT(*)::BIGINT AS g
    FROM filtered_events
    GROUP BY unnest(participant_ids)
  )
  SELECT
    lm.id,
    lm.display_name,
    COALESCE(mw.w, 0),
    COALESCE(mp.g, 0)
  FROM league_members lm
  LEFT JOIN member_wins mw ON mw.mid = lm.id
  LEFT JOIN member_played mp ON mp.mid = lm.id
  WHERE lm.league_id = p_league_id
    AND (COALESCE(mw.w, 0) > 0 OR COALESCE(mp.g, 0) > 0)
  ORDER BY COALESCE(mw.w, 0) DESC, COALESCE(mp.g, 0) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_league_stats TO authenticated;

-- Invite lookup (limited fields)
CREATE OR REPLACE FUNCTION get_league_by_invite(p_token TEXT)
RETURNS TABLE (id UUID, name TEXT, year INT) AS $$
  SELECT l.id, l.name, l.year
  FROM leagues l
  WHERE l.invite_token = p_token;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_league_by_invite TO anon, authenticated;
