// 從 Notion「澳洲房地產建案資料庫」同步建案到網站。
// 用法：npm run sync（.env 裡的 NOTION_TOKEN；沒有的話假設由外部代理注入 Notion 授權，例如雲端工作環境）
//
// 公開規則（見 CLAUDE.md）：
//   禁止公開沒有勾 → 全部寫進網站（「網站上架」不再作為條件；首頁精選只決定是否放首頁）
//   只讀公開欄位；價格帶、Drive連結、頁面內文都不讀
//
// 產出：src/data/projects.generated.json、public/img/projects/<slug>.webp
// 地圖座標：用 OpenStreetMap Nominatim 把地址轉成經緯度，結果存在 scripts/geocode-cache.json（要修正某個點就直接改這個檔）
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { coverFromPdf } from './pdf-cover.mjs';

const DATA_SOURCE_ID = '1804ad47-0ab1-4e95-ae97-3a95fb897d89';
const NOTION_VERSION = '2025-09-03';
const IMG_DIR = 'public/img/projects';
const OUT_FILE = 'src/data/projects.generated.json';
const GEO_CACHE = 'scripts/geocode-cache.json';
const PDF_CACHE = '.cache/pdf-covers'; // 從 PDF 抓出的封面（PDF 沒換就不重抓）
const STATE = { sydney: 'NSW', melbourne: 'VIC', brisbane: 'QLD', goldcoast: 'QLD', perth: 'WA' };

// 沒有 NOTION_TOKEN 時不中斷：送一個佔位值，讓會自動注入授權的代理接手；真的沒授權會在第一次查詢時報錯
const token = process.env.NOTION_TOKEN || 'proxy-injected';
if (!process.env.NOTION_TOKEN) console.warn('未設定 NOTION_TOKEN，改用代理注入的 Notion 授權');

const CITY = { 雪梨: 'sydney', 墨爾本: 'melbourne', 布里斯本: 'brisbane', 黃金海岸: 'goldcoast', 珀斯: 'perth' };
const TYPE = { 公寓: 'apt', 連排: 'town', 獨棟: 'house' };
const STAGE = { 預售: 'pre', 現房: 'now' };

async function queryAll() {
  const rows = [];
  let cursor;
  do {
    const res = await fetch(`https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_size: 100, ...(cursor && { start_cursor: cursor }) }),
    });
    const json = await res.json().catch(() => ({ code: res.status, message: res.statusText }));
    if (json.object !== 'list') throw new Error(`Notion API 錯誤：${json.code} ${json.message}`);
    rows.push(...json.results);
    cursor = json.has_more ? json.next_cursor : undefined;
  } while (cursor);
  return rows;
}

const text = (p) => (p?.title ?? p?.rich_text ?? []).map((t) => t.plain_text).join('').trim();
const select = (p) => p?.select?.name ?? '';
const checked = (p) => p?.checkbox === true;
// 去掉括號裡的內部備註，例如「DCF Property(建築:…;代理:…)」→「DCF Property」
const beforeParen = (s) => s.split(/[（(]/)[0].trim();
const slugify = (s) =>
  beforeParen(s).normalize('NFKD').replace(/[^\w\s-]/g, '').trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/-+/g, '-');

async function downloadImage(file, name, maxSize = 1600) {
  const url = file?.file?.url ?? file?.external?.url;
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`圖片下載失敗（${name}）：${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const info = await sharp(buf).rotate().resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(`${IMG_DIR}/${name}.webp`);
  return { src: `/img/projects/${name}.webp`, w: info.width, h: info.height };
}
async function downloadCover(files, slug) {
  const img = await downloadImage(files?.[0], slug);
  return img ? { src: img.src, landscape: img.w / img.h > 1.2 } : { src: '', landscape: false };
}
// 沒有「封面照」時，從「建案PDF」欄位的 PDF 抓建案圖當封面（PDF 沒換就用快取）
async function coverFromPdfFiles(files, slug) {
  for (const f of files ?? []) {
    const url = f?.file?.url ?? f?.external?.url;
    if (!url || !/\.pdf$/i.test(new URL(url).pathname)) continue;
    const key = createHash('sha1').update(new URL(url).pathname).digest('hex').slice(0, 16);
    const cached = `${PDF_CACHE}/${key}.png`;
    let png = await readFile(cached).catch(() => null);
    if (!png) {
      const res = await fetch(url);
      if (!res.ok) { console.warn(`PDF 下載失敗（${slug}）：${res.status}`); continue; }
      png = await coverFromPdf(Buffer.from(await res.arrayBuffer())).catch((e) => (console.warn(`PDF 讀取失敗（${slug}）：${e.message}`), null));
      if (!png) { console.warn(`PDF 裡找不到合適的建案圖：${slug}（${f.name}）`); continue; }
      await mkdir(PDF_CACHE, { recursive: true });
      await writeFile(cached, png);
    }
    const info = await sharp(png).resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(`${IMG_DIR}/${slug}.webp`);
    return { src: `/img/projects/${slug}.webp`, landscape: info.width / info.height > 1.2 };
  }
  return { src: '', landscape: false };
}
// 圖庫：Notion「圖庫」欄位可放多張照片，依上傳順序顯示（最多 24 張）
async function downloadGallery(files, slug) {
  const out = [];
  for (const [i, f] of (files ?? []).slice(0, 24).entries()) {
    const img = await downloadImage(f, `${slug}-${i + 1}`, 2000);
    if (img) out.push(img);
  }
  return out;
}


// 地址 → 經緯度（Nominatim 規定每秒最多 1 次、要註明來源）
const geoCache = JSON.parse(await readFile(GEO_CACHE, 'utf8').catch(() => '{}'));
let lastGeo = 0;
async function nominatim(q) {
  const wait = 1100 - (Date.now() - lastGeo);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeo = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=au&q=${encodeURIComponent(q)}`;
  // 連不到 Nominatim 時不中斷同步，該建案先不放地圖
  const res = await fetch(url, { headers: { 'User-Agent': 'MejiaWebsite/1.0 (admin@mejia.au)', 'Accept-Language': 'en' } }).catch(() => null);
  const [hit] = res?.ok ? await res.json() : [];
  return hit ? [Number(Number(hit.lat).toFixed(5)), Number(Number(hit.lon).toFixed(5))] : null;
}
async function geocode(address, suburb, city) {
  const key = address || `${suburb}, ${STATE[city]}`;
  if (geoCache[key]) return geoCache[key];
  const point = (address && (await nominatim(address))) || (suburb && (await nominatim(`${suburb} ${STATE[city]} Australia`)));
  if (point) geoCache[key] = point;
  else console.warn(`找不到座標：${key}（可手動加到 ${GEO_CACHE}）`);
  return point;
}

const rows = await queryAll();
const isPublic = (p) => !checked(p['禁止公開']);
const publicRows = rows.filter((r) => isPublic(r.properties));

await rm(IMG_DIR, { recursive: true, force: true });
await mkdir(IMG_DIR, { recursive: true });

const projects = [];
const seen = new Set();
for (const r of publicRows) {
  const p = r.properties;
  const fullName = text(p['建案名']);
  let slug = slugify(fullName) || r.id.slice(0, 8);
  while (seen.has(slug)) slug += '-2';
  seen.add(slug);
  const city = CITY[select(p['城市'])];
  if (!city) { console.warn(`略過（城市未設定）：${fullName}`); continue; }
  projects.push({
    slug,
    name: beforeParen(fullName),
    city,
    suburb: text(p['區域']),
    type: TYPE[select(p['建物型態'])] ?? 'apt',
    stage: STAGE[select(p['銷售狀態'])] ?? 'pre',
    use: select(p['房型用途']),
    price: text(p['網站起價']),
    desc: text(p['網站簡介']),
    developer: beforeParen(text(p['開發商'])),
    address: beforeParen(text(p['地址'])),
    geo: await geocode(beforeParen(text(p['地址'])), text(p['區域']), city),
    completion: p['預計完工']?.date?.start ?? '',
    featured: checked(p['首頁精選']),
    ...(await downloadCover(p['封面照']?.files, slug)
      .then((c) => (c.src ? c : coverFromPdfFiles(p['建案PDF']?.files, slug)))
      .then(({ src, landscape }) => ({ image: src, landscape }))),
    gallery: await downloadGallery(p['圖庫']?.files, slug),
    notionUpdated: r.last_edited_time,
  });
}

projects.sort((a, b) => Number(b.featured) - Number(a.featured) || a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
await writeFile(OUT_FILE, JSON.stringify(projects, null, 2) + '\n');
await writeFile(GEO_CACHE, JSON.stringify(geoCache, null, 2) + '\n');

const excluded = rows.filter((r) => checked(r.properties['禁止公開'])).length;
console.log(`同步完成：資料庫 ${rows.length} 筆，公開 ${projects.length} 筆（首頁精選 ${projects.filter((p) => p.featured).length}），禁止公開 ${excluded} 筆已排除`);
const noImage = projects.filter((p) => !p.image).map((p) => p.name);
if (noImage.length) console.warn(`缺封面照：${noImage.join('、')}`);
