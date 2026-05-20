-- Каталог друзей / участников (как user_games)

CREATE TABLE user_friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 1),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX user_friends_user_name_lower
  ON user_friends (user_id, lower(trim(name)));

CREATE INDEX idx_user_friends_user ON user_friends(user_id, sort_order);

ALTER TABLE user_friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own friends"
  ON user_friends FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
