# Mejia 美家官網

澳洲房產仲介 Mejia 美家的新官網，取代現有 WordPress 站（mejia.au）。
設計起點是 `~/Downloads/澳洲美家官網改版建議/2_首頁示意稿/index.html`。

## 技術架構
- Astro 5 產生靜態網站，部署到 Cloudflare Workers 靜態資產（即新版 Cloudflare Pages，名稱 `mejia-website`，設定在 `wrangler.jsonc`）
- 不要加 `@astrojs/cloudflare` adapter；`wrangler pages ...` 指令已被 Cloudflare 導向 Workers，一律用 `wrangler deploy`
- 後端：`worker/index.ts` 只處理 `/api/*`（`run_worker_first`），其餘由 `dist/` 靜態服務
  - `POST /api/lead`：Turnstile 驗證 → 寫入 D1 `mejia-leads` 的 `leads` 表（schema 在 `migrations/`）→ Resend 寄信、LINE 推播
  - 設定在 `wrangler.jsonc` 的 `vars`（NOTIFY_EMAIL、MAIL_FROM、LINE_TO）；金鑰用 `npx wrangler secret put`（TURNSTILE_SECRET、RESEND_API_KEY、LINE_CHANNEL_TOKEN）。Turnstile 的公開 site key 填在 `src/data/site.ts`
  - 本機測試：`.dev.vars` 寫 `ALLOW_NO_TURNSTILE=1`，`npx wrangler d1 migrations apply mejia-leads --local`，`npm run build && npx wrangler dev`
  - 改了 `wrangler.jsonc` 要重跑 `npx wrangler types worker/worker-configuration.d.ts`
- 大量圖片與樓書 PDF 之後放 Cloudflare R2
- 不使用 CSS 框架；樣式集中在 `src/styles/global.css`

## 常用指令
- `npm run dev`：本機預覽 http://localhost:4321
- `npm run build`：建置到 `dist/`
- `npm run sync`：從 Notion 同步建案（需要 `.env` 的 `NOTION_TOKEN`），產生 `src/data/projects.generated.json` 與 `public/img/projects/`
- `npm run deploy`：同步 Notion → 建置 → 部署到 Cloudflare
- `npm run market`：從 Cotality 月報更新房價數據（`src/data/market.generated.json`）；與上期差距 >15% 會以代碼 2 結束、不更新
- `npm run monthly`：每月排程用，`market` + `deploy`（Cotality PDF 以發布月命名，OCT＝9/30 數據）

## 目錄
- `src/data/`：所有內容（公司資訊、選單、城市、建案、步驟、團隊、文章）。改內容先改這裡，不要寫死在頁面裡
- `src/components/`：共用元件（Header、Footer、AiChat、PropertyCard、Process、Calculator、ContactSection、PageHead、ServicePage）
- `src/layouts/BaseLayout.astro`：所有頁面的外框與 SEO meta
- `src/scripts/ui.ts`：`$`、`$$`、`toast` 小工具
- `src/data/market.ts`：印花稅級距、利率、匯率（手動維護）；房價中位數與漲跌讀 `market.generated.json`（自動）
- `文章/`：房產新聞與指南，一篇一個 .md；只有「狀態：已核准」且發布日期已到才會上正式站，`npm run dev` 會連草稿顯示
- `src/data/team.ts`：顧問資料；有 `profile` 才產生 `/team/<slug>/` 個人頁
- `src/scripts/favorites.ts`：加入最愛（localStorage，`[data-fav]` 按鈕自動同步）
- `public/img/`：圖片

## 設計規範（不要偏離）
- 色票定義在 `global.css` 的 `:root`：深墨 `--ink #16242b`、品牌青綠 `--teal #24a6b5`、沙色底 `--sand #f6f2ec`、點綴金 `--gold`
- 字體：中文標題 Noto Serif TC（`--serif`），內文 Noto Sans TC（`--sans`），英文與數字 Poppins（`--latin`）
- 區塊結構：`<section>` → `.wrap` → `.sec-head`（`.eyebrow` 英文小標 + `h2` 中文標題 + `.lead`）
- 圓角 `--radius: 14px`，按鈕全圓角（`.btn-primary` / `.btn-line` / `.btn-ghost`）
- 深色區塊（`.process`、`.contact`、`.stats`）與沙色區塊（`.cities`、`.news`）交錯，避免連續兩個同色區塊
- 捲動淡入加 `.rv`；每個版面都要有手機版（斷點 1024px、760px）
- 文案用繁體中文、台灣用語，全形標點

## 建案資料來源（Notion）
- Notion「澳洲房地產建案資料庫」：https://app.notion.com/p/13280ab9d400417ba12125a3d9c2d0d7
- 網站只顯示「網站上架」或「首頁精選」有勾、且「禁止公開」**沒有勾**的建案（邏輯在 `scripts/sync-notion.mjs`）。**「禁止公開」優先於一切**：勾了就絕對不能出現在任何頁面、sitemap、搜尋結果或 AI 顧問回答裡（目前為 ORIA Spring Hill、100 Leichhardt、Greenview）
- 只讀這些欄位：建案名、城市、區域、建物型態、銷售狀態、房型用途、網站起價、網站簡介、封面照、圖庫、首頁精選、開發商、預計完工、地址（地址轉座標存在 `scripts/geocode-cache.json`）
- 不讀「價格帶」、「Drive連結」與頁面內文第 7 節（競品比較）、第 8 節（銷售輔助區）——這些是內部資料

## 子頁面規劃
| 網址 | 內容 |
|---|---|
| `/projects/`、`/projects/[slug]/` | 建案列表（篩選）＋建案內頁，資料來自 `src/data/projects.ts` |
| `/cities/[city]/` | 五個城市頁 |
| `/process/` | 購房流程細節、FIRB、交易成本 |
| `/calculator/` | 房貸＋總成本試算 |
| `/insights/`、`/insights/[slug]/` | 文章列表與內頁 |
| `/faq/` | FAQ |
| `/about/`、`/team/[name]/` | 關於美家、顧問個人頁 |
| `/services/leasing/`、`/services/valuation/` | 代租代管、免費估價 |
| `/contact/`、`/privacy/`、404 | 聯絡、隱私權政策 |

以上子頁面都已完成。標「初稿」（`draft-flag`）的頁面文字上線前要請顧問與律師確認：`/process/` 的 FIRB 說明、`/faq/`（`content.ts` 的 `faqDraft`）、`/services/*`、`/privacy/`。

## 上線前檢查
- `src/data/site.ts` 的 `noindex` 改成 `false`，`public/robots.txt` 改成允許收錄並加 `Sitemap: https://mejia.au/sitemap-index.xml`（sitemap 已由 `@astrojs/sitemap` 產生）
- 舊站網址全部在 `public/_redirects` 設 301 轉址
- 表單接上後端並實測收到通知
