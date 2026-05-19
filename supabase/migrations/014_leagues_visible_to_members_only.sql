-- Лиги видны только участникам (членам league_members), не только создателю без членства.

DROP POLICY IF EXISTS "Members can view their leagues" ON leagues;
DROP POLICY IF EXISTS "Members and creators can view leagues" ON leagues;

CREATE POLICY "Members can view their leagues"
  ON leagues FOR SELECT
  USING (is_league_member(id));
