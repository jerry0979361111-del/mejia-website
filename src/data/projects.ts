// 建案資料：由 `npm run sync` 從 Notion 產生 projects.generated.json，這裡只做型別與排序工具。
// 不要手動改 generated 檔；要改內容請改 Notion（規則見 CLAUDE.md「建案資料來源」）。
import type { CityId } from './cities';
import data from './projects.generated.json';

export type Project = {
  slug: string;
  name: string;
  city: CityId;
  suburb: string;
  type: 'apt' | 'town' | 'house';
  stage: 'pre' | 'now';
  use: string;
  price: string;
  desc: string;
  developer: string;
  address: string;
  completion: string;
  featured: boolean;
  image: string;
  landscape: boolean;
  geo: [number, number] | null; // [緯度, 經度]，sync 時由地址轉換
  gallery: { src: string; w: number; h: number }[]; // Notion「圖庫」欄位
};

export const typeLabel = { apt: '公寓', town: '連排別墅', house: '獨棟' } as const;
export const stageLabel = { pre: '預售', now: '現房' } as const;

export const projects = data as Project[];
export const projectUrl = (p: Project) => `/projects/${p.slug}/`;

// 首頁精選排版：橫幅照片當大卡，排成「大小 / 小大」交錯；不符合就全部用一般卡
export function featuredLayout(): { project: Project; wide: boolean }[] {
  const featured = projects.filter((p) => p.featured);
  const [a, b] = featured.filter((p) => p.landscape);
  if (featured.length === 4 && b) {
    const [c, d] = featured.filter((p) => p !== a && p !== b);
    return [
      { project: a, wide: true },
      { project: c, wide: false },
      { project: d, wide: false },
      { project: b, wide: true },
    ];
  }
  return featured.map((project) => ({ project, wide: false }));
}
