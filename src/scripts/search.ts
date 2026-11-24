// 站內搜尋（瀏覽器的 AI 對話框與 worker 的 /api/chat 共用）。
// 索引由 scripts/build-search-index.mjs 在建置後產生（dist/search-index.json），只含正式公開的內容。
// 中文沒有空白分詞：用「兩字一組」比對，另外認得城市、物件類型、銷售狀態與價格條件（例如「墨爾本 80 萬以下公寓」）。

export type DocType = 'project' | 'article' | 'faq' | 'page';
export type Doc = {
  type: DocType;
  title: string;
  url: string;
  desc: string; // 卡片用短描述
  text: string; // 給 AI 參考的內容（已截短）
  img?: string;
  city?: string; // 建案：sydney / melbourne / brisbane / goldcoast / perth
  loc?: string; // 建案：城市 · 區域
  price?: string; // 建案：顯示用價格
  priceNum?: number; // 建案：起價（澳幣萬元）
  ptype?: 'apt' | 'town' | 'house';
  stage?: 'pre' | 'now';
  date?: string; // 文章發布日期
};

export const typeName: Record<DocType, string> = { project: '建案', article: '文章', faq: '常見問題', page: '頁面' };

const CITY: [string, RegExp][] = [
  ['sydney', /雪梨|悉尼|sydney/],
  ['melbourne', /墨爾本|墨尔本|melbourne/],
  ['brisbane', /布里斯本|布里斯班|布里斯本|brisbane/],
  ['goldcoast', /黃金海岸|黄金海岸|gold\s*coast|goldcoast/],
  ['perth', /珀斯|伯斯|perth/],
];
const PTYPE: [Doc['ptype'], RegExp][] = [
  ['apt', /公寓|apartment|condo|unit/],
  ['town', /連排|聯排|联排|townhouse|town\s*house|排屋/],
  ['house', /獨棟|独栋|別墅|别墅|house|土地\s*\+\s*房|house\s*and\s*land/],
];
const STAGE: [Doc['stage'], RegExp][] = [
  ['pre', /預售|预售|期房|樓花|楼花|off.?the.?plan/],
  ['now', /現房|现房|準現房|成屋|即可入住|ready/],
];

// 全形轉半形、轉小寫
export function norm(s: string): string {
  return s.replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/　/g, ' ').toLowerCase();
}

// 問句裡常見、對搜尋沒有幫助的字
const STOP = /(請問|想問|想要|我想|我要|可以|有沒有|有哪些|哪些|哪裡|什麼|怎麼|如何|多少|一下|推薦|介紹|幫我|你們|請|嗎|呢|吧|的|了|是|在|有|和|跟|與|及|或|我|你|嗎|？|\?|，|,|。|！|!|、)/g;

export type Query = { words: string[]; grams: string[]; city?: string; ptype?: Doc['ptype']; stage?: Doc['stage']; min?: number; max?: number };

export function parseQuery(raw: string): Query {
  let s = norm(raw);
  const q: Query = { words: [], grams: [] };
  for (const [id, re] of CITY) if (re.test(s)) { q.city = id; s = s.replace(re, ' '); break; }
  for (const [id, re] of PTYPE) if (re.test(s)) { q.ptype = id; s = s.replace(re, ' '); break; }
  for (const [id, re] of STAGE) if (re.test(s)) { q.stage = id; s = s.replace(re, ' '); break; }

  // 價格：80 萬以下、100-150 萬、預算 80 萬、800k、$800,000（單位一律換成澳幣萬元）
  const toWan = (n: string, unit: string) => {
    const v = parseFloat(n.replace(/,/g, ''));
    return /k/.test(unit) ? v / 10 : /m|百萬/.test(unit) ? v * 100 : /萬|万|w/.test(unit) ? v : v >= 10000 ? v / 10000 : v;
  };
  const range = s.match(/\$?\s*([\d.,]+)\s*(萬|万|w|k|m|百萬)?\s*(?:-|~|到|至)\s*\$?\s*([\d.,]+)\s*(萬|万|w|k|m|百萬)/);
  if (range) {
    q.min = toWan(range[1], range[2] || range[4]);
    q.max = toWan(range[3], range[4]);
    s = s.replace(range[0], ' ');
  } else {
    const one = s.match(/\$?\s*([\d.,]+)\s*(萬|万|w|k|m|百萬)\s*(以下|以內|以内|內|内|左右|上下|以上|起)?|(?:預算|预算|budget)\s*\$?\s*([\d.,]+)\s*(萬|万|w|k|m|百萬)?/);
    if (one) {
      const n = one[1] ?? one[4], unit = one[2] ?? one[5] ?? '';
      const v = toWan(n, unit);
      const how = one[3] ?? '';
      if (/以上/.test(how)) q.min = v;
      else if (/左右|上下/.test(how)) { q.min = v * 0.8; q.max = v * 1.2; }
      else q.max = v;
      s = s.replace(one[0], ' ');
    }
  }

  s = s.replace(STOP, ' ');
  q.words = [...new Set(s.match(/[a-z0-9][a-z0-9'.-]*/g) ?? [])].filter((w) => w.length > 1 || /\d/.test(w));
  for (const run of s.match(/[㐀-鿿]+/g) ?? []) {
    if (run.length === 1) q.grams.push(run);
    for (let i = 0; i + 1 < run.length; i++) q.grams.push(run.slice(i, i + 2));
  }
  q.grams = [...new Set(q.grams)];
  return q;
}

type Prepared = Doc & { _t: string; _m: string; _x: string };
const cache = new WeakMap<Doc[], Prepared[]>();
function prepare(docs: Doc[]): Prepared[] {
  let p = cache.get(docs);
  if (!p) {
    p = docs.map((d) => ({ ...d, _t: norm(d.title), _m: norm(`${d.loc ?? ''} ${d.price ?? ''} ${d.desc}`), _x: norm(d.text) }));
    cache.set(docs, p);
  }
  return p;
}

export function hasFilters(q: Query) {
  return !!(q.city || q.ptype || q.stage || q.min !== undefined || q.max !== undefined);
}

export function search(docs: Doc[], raw: string, limit = 8): Doc[] {
  const q = parseQuery(raw);
  const terms = [...q.words, ...q.grams];
  const filtered = hasFilters(q);
  const out: { d: Prepared; s: number; i: number }[] = [];
  prepare(docs).forEach((d, i) => {
    // 條件只套用在建案上；有條件而文件不是建案時，必須有關鍵字命中才列出
    if (d.type === 'project') {
      if (q.city && d.city !== q.city) return;
      if (q.ptype && d.ptype !== q.ptype) return;
      if (q.stage && d.stage !== q.stage) return;
      if ((q.min !== undefined || q.max !== undefined) && d.priceNum === undefined) return;
      if (q.min !== undefined && d.priceNum! < q.min) return;
      if (q.max !== undefined && d.priceNum! > q.max) return;
    }
    let s = 0;
    for (const t of terms) {
      const w = t.length >= 3 ? 2 : t.length === 2 ? 1 : 0.3;
      if (d._t.includes(t)) s += 6 * w;
      else if (d._m.includes(t)) s += 3 * w;
      else if (d._x.includes(t)) s += 1 * w;
    }
    if (terms.length) {
      const whole = norm(raw).trim();
      if (whole.length >= 2 && d._t.includes(whole)) s += 10;
      if (s === 0) return;
    } else if (!filtered || d.type !== 'project') return;
    else s = 1; // 只有條件（例如「布里斯本 公寓」）：列出符合的建案，維持原本的新舊順序
    if (filtered && d.type === 'project') s += 4;
    out.push({ d, s, i });
  });
  out.sort((a, b) => b.s - a.s || a.i - b.i);
  return out.slice(0, limit).map(({ d }) => {
    const { _t, _m, _x, ...doc } = d;
    return doc;
  });
}
