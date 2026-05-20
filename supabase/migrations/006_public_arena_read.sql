-- Публичная арена: гости (anon) могут читать сражения, участников и события.

CREATE POLICY "Anyone can view sessions"
  ON sessions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can view battle participants"
  ON battle_participants FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can view score events"
  ON score_events FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anon can view profiles"
  ON profiles FOR SELECT
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_sessions_active_global
  ON sessions (started_at DESC NULLS LAST)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_sessions_ended_global
  ON sessions (ended_at DESC NULLS LAST, created_at DESC)
  WHERE status = 'ended';
