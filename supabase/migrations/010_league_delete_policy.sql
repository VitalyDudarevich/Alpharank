-- Владелец может удалить лигу (каскадом удалятся участники, игры, сессии и т.д.)

DROP POLICY IF EXISTS "Owners can delete leagues" ON leagues;

CREATE POLICY "Owners can delete leagues"
  ON leagues FOR DELETE
  USING (is_league_owner(id));
