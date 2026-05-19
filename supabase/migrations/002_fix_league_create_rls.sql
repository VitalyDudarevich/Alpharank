-- Fix: creator must read league right after INSERT (before league_members row exists)
-- Безопасно запускать повторно (идемпотентно)

DROP POLICY IF EXISTS "Members can view their leagues" ON leagues;
DROP POLICY IF EXISTS "Members and creators can view leagues" ON leagues;

CREATE POLICY "Members and creators can view leagues"
  ON leagues FOR SELECT
  USING (is_league_member(id) OR created_by = auth.uid());

DROP POLICY IF EXISTS "Members can insert audit logs" ON audit_logs;

CREATE POLICY "Members can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (
    is_league_member(league_id)
    OR EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = league_id AND l.created_by = auth.uid()
    )
  );
