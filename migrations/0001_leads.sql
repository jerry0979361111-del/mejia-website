-- 表單名單（/api/lead 寫入）
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  name TEXT NOT NULL,
  tel TEXT NOT NULL,
  email TEXT,
  cities TEXT,          -- 有興趣的城市，以「、」分隔
  goal TEXT,            -- 置產目的
  project TEXT,         -- 從建案頁送出時的建案名
  agent TEXT,           -- 從顧問頁送出時的顧問名
  updates INTEGER NOT NULL DEFAULT 0, -- 是否同意接收更新通知
  page TEXT,            -- 送出表單的頁面
  ip TEXT,
  user_agent TEXT,
  email_sent INTEGER NOT NULL DEFAULT 0,
  line_sent INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS leads_created_at ON leads (created_at);
