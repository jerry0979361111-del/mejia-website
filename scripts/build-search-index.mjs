// 建置後產生站內搜尋索引 dist/search-index.json（AI 對話框與 /api/chat 共用）。
// 只收正式公開的內容：建案（projects.generated.json，已排除「禁止公開」）、已核准且發布日期已到的文章、FAQ，以及主要頁面。
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const DIST = 'dist';
const ARTICLES = '文章';
const TEXT_MAX = 1500;

const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&');
const strip = (html) => decode(html
  .replace(/<(script|style|svg|noscript|dialog|form|nav)\b[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<br\s*\/?>|<\/(p|li|h\d|div|tr|summary|details)>/gi, '\n')
  .replace(/<[^>]+>/g, ' '))
  .replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
const clip = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);
const oneLine = (s) => s.replace(/\s+/g, ' ').trim();

const docs = [];

// ── 建案 ──
const CITY_ZH = { sydney: '雪梨', melbourne: '墨爾本', brisbane: '布里斯本', goldcoast: '黃金海岸', perth: '珀斯' };
const TYPE_ZH = { apt: '公寓', town: '連排別墅', house: '獨棟' };
const STAGE_ZH = { pre: '預售', now: '現房' };
const projects = JSON.parse(await readFile('src/data/projects.generated.json', 'utf8'));
for (const p of projects) {
  const m = p.price.match(/([\d.]+)\s*萬/);
  const loc = `${CITY_ZH[p.city]} · ${p.suburb}`;
  const facts = [
    `城市：${loc}`, `類型：${TYPE_ZH[p.type]}`, `銷售狀態：${STAGE_ZH[p.stage]}`, p.use && `適合用途：${p.use}`,
    `價格：${p.price || '價格請洽顧問'}`, p.developer && `開發商：${p.developer}`, p.completion && `預計完工：${p.completion.slice(0, 7)}`,
    p.address && `地址：${p.address}`,
  ].filter(Boolean).join('\n');
  docs.push({
    type: 'project', title: p.name, url: `/projects/${p.slug}/`, desc: clip(oneLine(p.desc), 80),
    text: clip(`${facts}\n${p.desc}`, TEXT_MAX), img: p.image || undefined, city: p.city, loc,
    price: p.price || '價格請洽顧問', ...(m && { priceNum: +m[1] }), ptype: p.type, stage: p.stage,
  });
}

// ── 文章（與 src/data/insights.ts 相同規則：已核准且發布日期已到）──
const now = new Date();
for (const f of (await readdir(ARTICLES)).filter((f) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(f)).sort().reverse()) {
  const raw = await readFile(`${ARTICLES}/${f}`, 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fm) continue;
  const get = (k) => (fm[1].match(new RegExp(`^${k}:\\s*(.*)$`, 'm'))?.[1] ?? '').trim().replace(/^"(.*)"$/, '$1');
  const date = get('發布日期');
  if (get('狀態') !== '已核准' || !date || new Date(date) > now) continue;
  const body = fm[2]
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^>\s?/gm, '').replace(/[#*_`|]+/g, ' ').replace(/<[^>]+>/g, ' ');
  const slug = f.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
  const cover = get('封面照');
  docs.push({
    type: 'article', title: get('標題'), url: `/insights/${slug}/`, desc: clip(oneLine(get('摘要')), 80),
    text: clip(oneLine(`${get('摘要')}\n${body}`), TEXT_MAX), date,
    ...(cover && { img: `/img/insights/${cover.replace(/\.[^.]+$/, '.webp')}` }),
  });
}

// ── 從建置好的頁面取內容 ──
async function page(url) {
  const file = `${DIST}${url}index.html`;
  if (!existsSync(file)) return null;
  const html = await readFile(file, 'utf8');
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '').replace(/｜.*$/, '');
  const desc = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
  let main = html.match(/<main>([\s\S]*?)<\/main>/)?.[1] ?? '';
  main = main.split(/<section[^>]*class="contact/)[0]; // 頁尾的聯絡表單不收
  return { html, title, desc, text: strip(main) };
}

// FAQ：一題一筆
const faq = await page('/faq/');
for (const m of faq?.html.matchAll(/<details class="faq"><summary>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g) ?? []) {
  const q = strip(m[1]), a = strip(m[2]);
  docs.push({ type: 'faq', title: q, url: '/faq/', desc: clip(oneLine(a), 80), text: clip(`問：${q}\n答：${a}`, TEXT_MAX) });
}

// 主要頁面（城市頁、流程、試算、服務、關於、顧問、聯絡）
const pages = ['/process/', '/calculator/', '/services/leasing/', '/services/valuation/', '/about/', '/contact/', '/insights/', '/projects/'];
for (const c of Object.keys(CITY_ZH)) pages.push(`/cities/${c}/`);
if (existsSync(`${DIST}/team`)) for (const t of await readdir(`${DIST}/team`)) pages.push(`/team/${t}/`);
for (const url of pages) {
  const p = await page(url);
  if (!p) continue;
  docs.push({ type: 'page', title: p.title, url, desc: clip(oneLine(p.desc), 80), text: clip(p.text, TEXT_MAX) });
}

await writeFile(`${DIST}/search-index.json`, JSON.stringify(docs));
const count = (t) => docs.filter((d) => d.type === t).length;
console.log(`站內搜尋索引：建案 ${count('project')}、文章 ${count('article')}、FAQ ${count('faq')}、頁面 ${count('page')}`);
