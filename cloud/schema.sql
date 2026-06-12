-- FPT cloud sync — D1 schema (free tier). Model A + optimistic concurrency.
CREATE TABLE IF NOT EXISTS profiles (
  id         TEXT PRIMARY KEY,        -- "u_<funpayUserId>"
  bundle     TEXT NOT NULL,           -- base64(gzip(JSON {s:settings, t:fieldTs}))
  updated_at INTEGER NOT NULL,        -- client epoch ms (informational)
  bytes      INTEGER NOT NULL DEFAULT 0,
  version    INTEGER NOT NULL DEFAULT 0   -- monotonic; bumped on each accepted write (CAS)
);
-- Migration for an existing table created before versioning:
--   ALTER TABLE profiles ADD COLUMN version INTEGER NOT NULL DEFAULT 0;

-- Shared custom-nickname registry (epic nicknames visible to all extension users).
CREATE TABLE IF NOT EXISTS nicks (
  uid        TEXT PRIMARY KEY,        -- "u_<funpayUserId>" of the publisher
  nick       TEXT NOT NULL,           -- FunPay nickname this style applies to
  style      TEXT NOT NULL,           -- "FPT-STYLE-<base64 cfg>"
  updated_at INTEGER NOT NULL
);
