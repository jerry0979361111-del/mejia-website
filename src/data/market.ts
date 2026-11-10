// 市場數據：房價中位數、印花稅級距、利率、匯率。
// 每月更新一次：改這個檔的數字與日期即可，首頁城市區塊與試算工具會自動跟著變。
import type { CityId } from './cities';

import gen from './market.generated.json';

// 房價數據由 `npm run market` 每月自動從 Cotality 月報更新（market.generated.json）；
// 利率、匯率、印花稅級距仍在本檔手動維護。
export const marketUpdated = gen.updated;

// ── 住宅中位價與漲跌（Cotality Home Value Index）──
// 黃金海岸：Cotality 月報未單獨列出，確認來源前不顯示
type CityStat = { house: number; unit: number; month: number | null; annual: number | null };
const g = gen.cities as Record<string, CityStat>;
export const medians: Record<CityId, CityStat | null> = {
  sydney: g.sydney, melbourne: g.melbourne, brisbane: g.brisbane, goldcoast: null, perth: g.perth,
};

const MONTH_ZH: Record<string, number> = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };
const [dd, mon, yyyy] = gen.asAt.split(' ');
export const asAtZh = `${yyyy} 年 ${MONTH_ZH[mon]} 月 ${Number(dd)} 日`;
export const medianSource = { name: gen.source, period: `截至 ${asAtZh}`, url: gen.sourceUrl };

/** 依月報數字自動產生的中文市場短評 */
export function marketSummary(names: Record<string, string>): string {
  const sign = (n: number | null) => (n === null ? '—' : `${n > 0 ? '+' : ''}${n}%`);
  const n = gen.national;
  // 只比較網站上有顯示的城市（例如珀斯隱藏時不列入）
  const ranked = (Object.entries(medians).filter(([id, v]) => v && v.annual !== null && names[id]) as [CityId, CityStat][])
    .sort((a, b) => b[1].annual! - a[1].annual!);
  const [top] = ranked, bottom = ranked[ranked.length - 1];
  const dir = n.month! < 0 ? '下跌' : n.month! > 0 ? '上漲' : '持平';
  const yr = n.annual === 0 ? '與去年同期持平' : `近 12 個月 ${sign(n.annual)}`;
  return `截至 ${asAtZh}，全國住宅價值單月${dir} ${Math.abs(n.month!)}%、${yr}。`
    + `近一年表現最好的是${names[top[0]]}（${sign(top[1].annual)}），${names[bottom[0]]}相對較弱（${sign(bottom[1].annual)}）。`;
}

// ── 印花稅（一般稅率，不含首購／自住優惠）──
// 每段：from 門檻、base 基本稅額、per100 超過門檻部分每 $100（或不足 $100）的稅額
type Band = { from: number; base: number; per100: number };
type DutyTable = { bands: Band[]; flat?: { from: number; rate: number }[]; foreign: number; source: string };

export const stateOf: Record<CityId, 'NSW' | 'VIC' | 'QLD' | 'WA'> = {
  sydney: 'NSW', melbourne: 'VIC', brisbane: 'QLD', goldcoast: 'QLD', perth: 'WA',
};

export const duty: Record<'NSW' | 'VIC' | 'QLD' | 'WA', DutyTable> = {
  // Revenue NSW，2026/7/1–2027/6/30；海外買家附加印花稅 9%
  NSW: {
    bands: [
      { from: 0, base: 0, per100: 1.25 },
      { from: 18_000, base: 225, per100: 1.5 },
      { from: 38_000, base: 525, per100: 1.75 },
      { from: 103_000, base: 1_662, per100: 3.5 },
      { from: 387_000, base: 11_602, per100: 4.5 },
      { from: 1_290_000, base: 52_237, per100: 5.5 },
    ],
    foreign: 0.09,
    source: 'Revenue NSW',
  },
  // SRO Victoria 一般稅率（非自住）；96 萬–200 萬改以總價 5.5% 計；海外買家附加稅 8%
  VIC: {
    bands: [
      { from: 0, base: 0, per100: 1.4 },
      { from: 25_000, base: 350, per100: 2.4 },
      { from: 130_000, base: 2_870, per100: 6 },
      { from: 2_000_000, base: 110_000, per100: 6.5 },
    ],
    flat: [{ from: 960_000, rate: 0.055 }],
    foreign: 0.08,
    source: 'State Revenue Office Victoria',
  },
  // Queensland Revenue Office；海外買家附加稅 AFAD 8%
  QLD: {
    bands: [
      { from: 0, base: 0, per100: 0 },
      { from: 5_000, base: 0, per100: 1.5 },
      { from: 75_000, base: 1_050, per100: 3.5 },
      { from: 540_000, base: 17_325, per100: 4.5 },
      { from: 1_000_000, base: 38_025, per100: 5.75 },
    ],
    foreign: 0.08,
    source: 'Queensland Revenue Office',
  },
  // WA Department of Treasury and Finance；海外買家附加稅 7%
  WA: {
    bands: [
      { from: 0, base: 0, per100: 1.9 },
      { from: 120_000, base: 2_280, per100: 2.85 },
      { from: 150_000, base: 3_135, per100: 3.8 },
      { from: 360_000, base: 11_115, per100: 4.75 },
      { from: 725_000, base: 28_453, per100: 5.15 },
    ],
    foreign: 0.07,
    source: 'WA Department of Treasury and Finance',
  },
};

/** 一般印花稅（每 $100 或不足 $100 計） */
export function stampDuty(state: keyof typeof duty, value: number): number {
  const t = duty[state];
  const flat = t.flat?.find((f) => value > f.from && value <= 2_000_000);
  if (flat) return Math.round(value * flat.rate);
  const band = [...t.bands].reverse().find((b) => value > b.from) ?? t.bands[0];
  return Math.round(band.base + Math.ceil((value - band.from) / 100) * band.per100);
}

/** 海外買家：一般印花稅 + 海外附加稅 */
export function foreignDuty(city: CityId, value: number) {
  const s = stateOf[city];
  const base = stampDuty(s, value);
  const surcharge = Math.round(value * duty[s].foreign);
  return { base, surcharge, total: base + surcharge, rate: duty[s].foreign };
}

// ── 利率與匯率 ──
export const rates = {
  rba: { value: 4.6, date: '2026/9/29', label: '澳洲央行現金利率' },
  presets: [
    { key: 'au-foreign', label: '澳洲｜海外買家貸款', value: 7.5, note: '估算：一般浮動利率再加約 1%，依銀行而定' },
    { key: 'au-owner', label: '澳洲｜一般浮動利率', value: 6.5, note: '央行 4.60% 後市場平均約 6.5%' },
    { key: 'tw', label: '台灣｜五大銀行房貸', value: 2.16, note: '央行統計 2026 年 6 月 2.155%' },
  ],
  fx: { value: 22.2, date: '2026/9/30' },
};

/** 金額顯示為「A$xxx.x 萬」 */
export const wan = (n: number) => `A$${(n / 10_000).toFixed(1).replace(/\.0$/, '')} 萬`;
