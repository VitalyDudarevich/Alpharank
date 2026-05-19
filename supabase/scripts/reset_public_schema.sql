-- Сброс схемы alphaRank без CLI (Supabase Dashboard → SQL Editor)
-- ВНИМАНИЕ: удаляет все данные приложения в public.

-- 1) Таблицы (CASCADE снимает policies, индексы, FK)
DROP TABLE IF EXISTS score_events CASCADE;
DROP TABLE IF EXISTS battle_participants CASCADE;
DROP TABLE IF EXISTS session_participants CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS elo_ratings CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS league_members CASCADE;
DROP TABLE IF EXISTS leagues CASCADE;
DROP TABLE IF EXISTS user_games CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 2) Функции (после таблиц зависимостей обычно нет)
DROP FUNCTION IF EXISTS add_arena_player_by_name(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS add_known_member_to_league(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS insert_league_owner_member(UUID, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_league_by_invite(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_league_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_league_owner(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_league_member(UUID) CASCADE;

-- 3) Профиль при регистрации
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_profile() CASCADE;
