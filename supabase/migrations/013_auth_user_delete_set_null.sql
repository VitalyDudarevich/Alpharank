-- Разрешить удаление пользователя из auth.users (Dashboard / Admin API).
-- score_events.created_by и audit_logs.actor_id ссылались без ON DELETE → блокировка.

ALTER TABLE score_events
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE audit_logs
  ALTER COLUMN actor_id DROP NOT NULL;

ALTER TABLE score_events
  DROP CONSTRAINT IF EXISTS score_events_created_by_fkey;

ALTER TABLE score_events
  ADD CONSTRAINT score_events_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;

ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
