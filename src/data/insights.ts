// 文章查詢工具：正式網站只出現「已核准」且發布日期已到的文章；本機開發連草稿一起顯示（方便審稿）。
import { getCollection, type CollectionEntry } from 'astro:content';

export type Insight = CollectionEntry<'insights'>;

// 沒放封面照時依分類用預設圖（澳洲城市照片，Pexels 免費授權，來源見 素材/圖片來源.md）
const fallback: Record<string, string> = {
  市場觀點: '/img/cover-market.webp', // 墨爾本 Yarra River 夜景
  買家指南: '/img/cover-guide.webp', // 雪梨住宅區與市景
  政策稅務: '/img/cover-policy.webp', // 雪梨港灣大橋
  建案動態: '/img/cover-project.webp', // 黃金海岸天際線
  城市生活: '/img/cover-city.webp', // 布里斯本 Story Bridge
};

export const isPublished = (a: Insight) => a.data.狀態 === '已核准' && a.data.發布日期 <= new Date();

export async function getInsights() {
  const all = await getCollection('insights', (a) => import.meta.env.DEV || isPublished(a));
  return all.sort((a, b) => b.data.發布日期.getTime() - a.data.發布日期.getTime());
}

// 檔名去掉開頭日期當網址：2026-10-06-rba-rate-hike → rba-rate-hike
export const insightSlug = (a: Insight) => a.id.replace(/^\d{4}-\d{2}-\d{2}-/, '');
export const insightUrl = (a: Insight) => `/insights/${insightSlug(a)}/`;
export const insightCover = (a: Insight) => (a.data.封面照 ? `/img/insights/${a.data.封面照.replace(/\.[^.]+$/, '.webp')}` : fallback[a.data.分類]);
export const fmtDate = (d: Date) => d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
