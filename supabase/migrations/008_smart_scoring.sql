-- Умный подсчёт очков: режим у сражения + места участников за раунд.

-- Режим начисления: classic (как раньше, +1 победа) или smart (очки за место).
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS scoring_mode TEXT NOT NULL DEFAULT 'classic'
    CHECK (scoring_mode IN ('classic', 'smart'));

-- Число мест (= максимум очков за 1-е место) для умного режима. NULL для classic.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS participant_slots INT
    CHECK (participant_slots IS NULL OR participant_slots >= 2);

-- Места участников за раунд в умном режиме: { "<participant_id>": <place>, ... }.
-- NULL для обычных раундов. winner_participant_id в умном раунде = участник с 1-м местом
-- (сохраняет совместимость со счётом побед).
ALTER TABLE score_events
  ADD COLUMN IF NOT EXISTS placements JSONB;
