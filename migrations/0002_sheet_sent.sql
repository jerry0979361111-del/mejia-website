-- 名單是否已送到 Google 試算表（Apps Script 新增一列並寄 Gmail 通知）
ALTER TABLE leads ADD COLUMN sheet_sent INTEGER NOT NULL DEFAULT 0;
