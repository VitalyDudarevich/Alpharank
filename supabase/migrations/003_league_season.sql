-- Season limits and league conclusion

ALTER TABLE leagues
  ADD COLUMN ends_at DATE,
  ADD COLUMN target_wins INT CHECK (target_wins IS NULL OR target_wins > 0),
  ADD COLUMN concluded_at TIMESTAMPTZ;

ALTER TABLE games
  ADD COLUMN target_wins INT CHECK (target_wins IS NULL OR target_wins > 0),
  ADD COLUMN ends_at DATE;

COMMENT ON COLUMN leagues.ends_at IS 'Last day of the league (inclusive)';
COMMENT ON COLUMN leagues.target_wins IS 'League ends when any member reaches this many total wins';
COMMENT ON COLUMN leagues.concluded_at IS 'When set, no new results; standings are final until continued';
COMMENT ON COLUMN games.target_wins IS 'Game locks when total wins recorded for this game reach this';
COMMENT ON COLUMN games.ends_at IS 'Last day for this game (inclusive)';
