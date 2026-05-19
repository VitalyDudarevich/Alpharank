-- Разрешить несколько активных сражений у одного пользователя
DROP INDEX IF EXISTS idx_sessions_one_active_per_user;

CREATE INDEX IF NOT EXISTS idx_sessions_active_by_user
  ON sessions (created_by, started_at DESC NULLS LAST)
  WHERE status = 'active';
