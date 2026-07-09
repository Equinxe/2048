-- 2048 Backend Database Schema (libSQL/SQLite)
-- Defines persistent storage for player profiles, game records, and rate limiting

-- Profiles table: player identities
CREATE TABLE profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (length(name) >= 1 AND length(name) <= 12)
);

-- Games table: completed game records per profile
CREATE TABLE games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  score INTEGER NOT NULL,
  played_at TEXT NOT NULL,
  result TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CHECK (score >= 0),
  CHECK (result IN ('win', 'loss'))
);

-- Rate limits table: fixed-window rate limiting per IP
CREATE TABLE rate_limits (
  ip TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (ip, window_start)
);

-- Index for game history query pattern: all games by profile, reverse chronological
CREATE INDEX idx_games_profile_id_played_at_desc
  ON games(profile_id, played_at DESC);

-- Index for leaderboard query pattern: top scores by profile, with recency tiebreak
CREATE INDEX idx_games_profile_id_score_desc_played_at_desc
  ON games(profile_id, score DESC, played_at DESC);
