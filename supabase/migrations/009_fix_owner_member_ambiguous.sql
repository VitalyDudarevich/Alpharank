-- Fix: RETURNS TABLE (user_id ...) затеняет league_members.user_id в теле функции

CREATE OR REPLACE FUNCTION insert_league_owner_member(
  p_league_id UUID,
  p_display_name TEXT
)
RETURNS TABLE (
  member_id UUID,
  user_id UUID,
  display_name TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_member_id UUID;
  v_out_user_id UUID;
  v_out_name TEXT := btrim(p_display_name);
  v_out_role TEXT := 'owner';
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_out_name IS NULL OR v_out_name = '' THEN
    RAISE EXCEPTION 'no_display_name';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM leagues l
    WHERE l.id = p_league_id AND l.created_by = v_uid
  ) THEN
    RAISE EXCEPTION 'not_league_creator';
  END IF;

  IF EXISTS (
    SELECT 1 FROM league_members lm
    WHERE lm.league_id = p_league_id AND lm.user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'already_member';
  END IF;

  INSERT INTO league_members AS lm (league_id, user_id, display_name, role)
  VALUES (p_league_id, v_uid, v_out_name, v_out_role)
  RETURNING lm.id, lm.user_id, lm.display_name, lm.role
  INTO v_member_id, v_out_user_id, v_out_name, v_out_role;

  member_id := v_member_id;
  user_id := v_out_user_id;
  display_name := v_out_name;
  role := v_out_role;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_league_owner_member(UUID, TEXT) TO authenticated;
