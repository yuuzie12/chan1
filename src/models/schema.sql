CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  discord_id TEXT,
  discord_verified INTEGER DEFAULT 0,
  discord_code TEXT,
  twofa_secret TEXT,
  banned INTEGER DEFAULT 0,
  ban_reason TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL,
  subject TEXT DEFAULT '',
  body TEXT NOT NULL,
  image TEXT,
  user_id INTEGER,
  is_pinned INTEGER DEFAULT 0,
  is_locked INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  bumped_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY(board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  image TEXT,
  user_id INTEGER,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY(thread_id) REFERENCES threads(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  thread_id INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  UNIQUE(user_id, thread_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(thread_id) REFERENCES threads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reporter_id INTEGER,
  resolved INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS admin_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER,
  action TEXT NOT NULL,
  details TEXT,
  ip TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS bans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  ip TEXT,
  reason TEXT,
  admin_id INTEGER,
  expires_at INTEGER,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_threads_board ON threads(board_id, bumped_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_thread ON posts(thread_id, created_at);
