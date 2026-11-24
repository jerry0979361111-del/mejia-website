-- AI 對話框提問紀錄（worker/chat.ts 第一次寫入時也會自動建立；IP 只存雜湊）
CREATE TABLE IF NOT EXISTS chat_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_hash TEXT NOT NULL,
  question TEXT NOT NULL,
  answered INTEGER NOT NULL DEFAULT 0,
  sources TEXT,
  page TEXT
);
CREATE INDEX IF NOT EXISTS chat_log_created ON chat_log (created_at);
