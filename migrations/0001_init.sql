-- Owner-editable site state: key 'site' holds the SiteSettings JSON, key
-- 'appearance' the Appearance JSON. A missing row means the defaults.
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- First-party analytics. No client ids, cookies, raw IPs or user agents:
-- visitor is a hash that changes every UTC day (see salts).
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  day TEXT NOT NULL,
  visitor TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('view', 'engage', 'event')),
  path TEXT NOT NULL,
  name TEXT,
  target TEXT,
  referrer TEXT,
  source TEXT,
  country TEXT,
  device TEXT NOT NULL,
  browser TEXT NOT NULL,
  engaged_ms INTEGER
);

-- Range reports filter by day and kind; the live window and the retention
-- prune filter by ts.
CREATE INDEX events_day_kind ON events (day, kind);
CREATE INDEX events_ts ON events (ts);

-- One random salt per UTC day, deleted by the daily prune once the day is
-- over, so yesterday's visitor hashes can no longer be reproduced.
CREATE TABLE salts (
  day TEXT PRIMARY KEY,
  salt TEXT NOT NULL
);
