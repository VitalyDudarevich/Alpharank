-- Любой авторизованный пользователь может вести счёт в активных сражениях.

CREATE POLICY "Authenticated can insert score on active sessions"
  ON score_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id AND s.status = 'active'
    )
  );

CREATE POLICY "Authenticated can update score on active sessions"
  ON score_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = session_id AND s.status = 'active'
    )
  );

CREATE POLICY "Authenticated can update active sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (status = 'active')
  WITH CHECK (status IN ('active', 'ended'));
