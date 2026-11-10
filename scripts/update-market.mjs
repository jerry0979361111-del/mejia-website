// 每月自動更新房價數據：下載 Cotality Home Value Index 月報 PDF，讀出各城市中位價與漲跌幅，
// 寫入 src/data/market.generated.json。首頁「五座城市」的中位價、稅費初算、漲跌與市場短評都讀這個檔。
//
// 用法：npm run market            （有新數據才更新）
//       npm run market -- --force （同一期也重寫）
// 結束代碼：0 已更新或已是最新；2 數字異常（與上期差距過大），未更新，需人工確認；1 其他錯誤
//
// 注意：Cotality 的 PDF 以「發布月份」命名，例如 10 月初發布的「OCT」是 9 月 30 日的數據。
import { readFile, writeFile } from 'node:fs/promises';
import { extractText, getDocumentProxy } from 'unpdf';

const OUT = 'src/data/market.generated.json';
const MAX_JUMP = 0.15; // 中位價與上期相差超過 15% 視為讀取異常
const CITIES = ['sydney', 'melbourne', 'brisbane', 'adelaide', 'perth']; // 月報表格前五欄的順序
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const force = process.argv.includes('--force');

async function findReport() {
  const now = new Date();
  // 先試本月發布的，再試上個月
  for (const back of [0, 1]) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const name = `COTALITY HVI ${MONTHS[d.getMonth()]} ${d.getFullYear()} FINAL`;
    // Cotality 有時放在 hubfs/Article-Reports/，有時直接放在 hubfs/（例如 2026 年 11 月號）
    for (const [dir, suffix] of ['Article-Reports/', ''].flatMap((d) => ['', ' (1)', ' (2)'].map((s) => [d, s]))) {
      const url = `https://discover.cotality.com/hubfs/${dir}${encodeURIComponent(name + suffix)}.pdf`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (MejiaWebsite market update)' } });
      if (res.ok && (res.headers.get('content-type') ?? '').includes('pdf')) return { url, buf: new Uint8Array(await res.arrayBuffer()) };
    }
  }
  throw new Error('找不到 Cotality 月報 PDF（可能檔名規則改了）');
}

const pct = (s) => (s === 'na' ? null : Number(s.replace('%', '')));
const money = (s) => (s === 'na' ? null : Number(s.replace(/[$,]/g, '')));

function parse(text) {
  const asAt = text.match(/results as at (\d{1,2} \w+ \d{4})/i)?.[1];
  if (!asAt) throw new Error('讀不到月報日期（results as at …）');
  const header = text.match(/Region\s+Sydney\s+Melbourne\s+Brisbane\s+Adelaide\s+Perth/);
  if (!header) throw new Error('表格欄位順序和預期不同（Sydney Melbourne Brisbane Adelaide Perth）');
  const table = text.slice(header.index);
  const block = (label, next) => {
    const start = table.indexOf(`\n${label}\n`) >= 0 ? table.indexOf(`\n${label}\n`) : table.indexOf(label);
    const end = next ? table.indexOf(next, start + label.length) : table.length;
    return table.slice(start, end);
  };
  const row = (blk, name) => {
    const line = blk.split('\n').find((l) => l.startsWith(name));
    if (!line) throw new Error(`找不到「${name}」這一列`);
    return line.slice(name.length).trim().split(/\s+/);
  };
  const dw = block('Dwellings', 'Houses');
  const ho = block('Houses', 'Units');
  const un = block('Units', 'Media enquiries');
  const dMonth = row(dw, 'Month'), dAnnual = row(dw, 'Annual'), hMed = row(ho, 'Median value'), uMed = row(un, 'Median value');
  const cities = {};
  CITIES.forEach((c, i) => {
    cities[c] = { house: money(hMed[i]), unit: money(uMed[i]), month: pct(dMonth[i]), annual: pct(dAnnual[i]) };
  });
  const last = dMonth.length - 1; // 最後一欄是全國
  return { asAt, national: { month: pct(dMonth[last]), annual: pct(dAnnual[last]) }, cities };
}

const prev = JSON.parse(await readFile(OUT, 'utf8').catch(() => 'null'));
const { url, buf } = await findReport();
const { text } = await extractText(await getDocumentProxy(buf), { mergePages: true });
const data = parse(text);

if (prev && prev.asAt === data.asAt && !force) {
  console.log(`已是最新（${data.asAt}），不需更新`);
  process.exit(0);
}

// 異常檢查：任何城市中位價與上期相差超過 15%，就不更新
if (prev) {
  for (const c of CITIES) {
    for (const k of ['house', 'unit']) {
      const a = prev.cities[c]?.[k], b = data.cities[c]?.[k];
      if (!b || (a && Math.abs(b - a) / a > MAX_JUMP)) {
        console.error(`數字異常：${c} ${k} 上期 ${a} → 本期 ${b}，未更新，請人工確認 ${url}`);
        process.exit(2);
      }
    }
  }
}

const out = { asAt: data.asAt, source: 'Cotality Home Value Index', sourceUrl: url, updated: new Date().toISOString().slice(0, 10), national: data.national, cities: data.cities };
await writeFile(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`已更新：${data.asAt}｜全國月變動 ${data.national.month}%、年變動 ${data.national.annual}%`);
for (const c of CITIES) console.log(`  ${c}：獨棟 ${data.cities[c].house}、公寓 ${data.cities[c].unit}、月 ${data.cities[c].month}%、年 ${data.cities[c].annual}%`);
