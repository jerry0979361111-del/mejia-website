// 文章（房產新聞與指南）：檔案放在專案根目錄的「文章/」，檔名以日期開頭，例如 2026-10-06-rba-rate-hike.md
// 只有「狀態：已核准」且發布日期已到的文章會出現在正式網站；本機開發（npm run dev）會連草稿一起顯示，方便審稿。
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const categories = ['市場觀點', '買家指南', '政策稅務', '建案動態', '城市生活'] as const;

const insights = defineCollection({
  loader: glob({ pattern: '[0-9]*.md', base: './文章' }),
  schema: z.object({
    標題: z.string(),
    狀態: z.enum(['草稿', '需修改', '已核准']),
    分類: z.enum(categories),
    摘要: z.string(),
    發布日期: z.coerce.date(),
    封面照: z.string().optional(),
    參考來源: z.array(z.object({ 名稱: z.string(), 網址: z.string().url().optional() })).default([]),
    審稿意見: z.string().optional(),
  }),
});

export const collections = { insights };
