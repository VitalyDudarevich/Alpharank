-- Fix: создание лиги и добавление участников через add_known_member_to_league
-- 1) SELECT после INSERT создателя (RETURNING) — создатель лиги ещё не «member» в is_league_member
-- 2) INSERT другого user_id из RPC — политика «join» только для auth.uid() = user_id

DROP POLICY IF EXISTS "Members can view league members" ON league_members;

CREATE POLICY "Members and creators can view league members"
  ON league_members FOR SELECT
  USING (
    is_league_member(league_id)
    OR EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = league_id AND l.created_by = auth.uid()
    )
  );

-- RPC вставляет участника от имени владельца; отключаем RLS внутри SECURITY DEFINER
CREATE OR REPLACE FUNCTION add_known_member_to_league(
  p_league_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  member_id UUID,
  display_name TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_display_name TEXT;
  v_member_id UUID;
  v_role TEXT := 'member';
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT is_league_owner(p_league_id) THEN
    RAISE EXCEPTION 'not_owner';
  END IF;

  IF p_user_id = v_caller THEN
    RAISE EXCEPTION 'cannot_add_self';
  END IF;

  IF EXISTS (
    SELECT 1 FROM league_members
    WHERE league_id = p_league_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'already_member';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM league_members lm_target
    JOIN league_members lm_caller ON lm_caller.league_id = lm_target.league_id
    WHERE lm_caller.user_id = v_caller
      AND lm_target.user_id = p_user_id
      AND lm_caller.league_id <> p_league_id
  ) THEN
    RAISE EXCEPTION 'not_in_network';
  END IF;

  SELECT p.display_name INTO v_display_name
  FROM profiles p
  WHERE p.id = p_user_id;

  IF v_display_name IS NULL OR btrim(v_display_name) = '' THEN
    SELECT lm_target.display_name INTO v_display_name
    FROM league_members lm_target
    JOIN league_members lm_caller ON lm_caller.league_id = lm_target.league_id
    WHERE lm_caller.user_id = v_caller
      AND lm_target.user_id = p_user_id
      AND lm_caller.league_id <> p_league_id
    ORDER BY lm_target.created_at DESC
    LIMIT 1;
  END IF;

  IF v_display_name IS NULL OR btrim(v_display_name) = '' THEN
    RAISE EXCEPTION 'no_display_name';
  END IF;

  INSERT INTO league_members (league_id, user_id, display_name, role)
  VALUES (p_league_id, p_user_id, btrim(v_display_name), v_role)
  RETURNING id, league_members.display_name, league_members.role
  INTO v_member_id, v_display_name, v_role;

  RETURN QUERY SELECT v_member_id, v_display_name, v_role;
END;
$$;

GRANT EXECUTE ON FUNCTION add_known_member_to_league(UUID, UUID) TO authenticated;
