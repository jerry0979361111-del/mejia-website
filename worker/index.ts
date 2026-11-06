// Cloudflare Worker：處理 /api/*，其餘請求由靜態資產（dist/）直接服務（wrangler.jsonc 的 run_worker_first）。
//
// POST /api/lead：表單名單
//   1. 驗證 Turnstile（防垃圾）
//   2. 寫入 D1（leads 資料表，schema 見 migrations/）
//   3. 送到 Google 試算表（Apps Script 會新增一列並寄 Gmail 通知）、Resend 寄通知信、LINE 推播
//      （有設定才會送；失敗不影響寫入，每筆送出結果記在 D1 的 sheet_sent／email_sent／line_sent）
//
// 設定（wrangler.jsonc 的 vars 或 `wrangler secret put`）：
//   TURNSTILE_SECRET   Turnstile 密鑰（secret）。未設定時拒絕送出，除非 ALLOW_NO_TURNSTILE=1（只用於本機測試）
//   RESEND_API_KEY     Resend 金鑰（secret）
//   NOTIFY_EMAIL       收件信箱，多個用逗號分隔（vars）
//   MAIL_FROM          寄件人，例如「Mejia 美家 <noreply@mejia.au>」，網域須先在 Resend 驗證（vars）
//   LINE_CHANNEL_TOKEN LINE Messaging API 的 Channel access token（secret）
//   LINE_TO            推播對象：群組 ID 或使用者 ID，多個用逗號分隔（vars）
//   SHEET_WEBHOOK_URL  Google 試算表 Apps Script 網頁應用程式網址（secret；程式在 scripts/google-sheet/）

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  TURNSTILE_SECRET?: string;
  ALLOW_NO_TURNSTILE?: string;
  RESEND_API_KEY?: string;
  NOTIFY_EMAIL?: string;
  MAIL_FROM?: string;
  LINE_CHANNEL_TOKEN?: string;
  SHEET_WEBHOOK_URL?: string;
  LINE_TO?: string;
}

type Lead = {
  name: string; tel: string; email: string; cities: string; goal: string;
  project: string; agent: string; updates: boolean; page: string;
};

const json = (data: unknown, status = 200) => Response.json(data, { status });
const list = (s?: string) => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean);
const clip = (v: File | string | null, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/lead') {
      if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
      return handleLead(request, env, ctx);
    }
    return json({ ok: false, error: 'not_found' }, 404);
  },
} satisfies ExportedHandler<Env>;

async function handleLead(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  let form: FormData;
  try { form = await request.formData(); } catch { return json({ ok: false, error: 'bad_request' }, 400); }

  // 隱藏欄位：真人看不到，機器人常會填
  if (clip(form.get('website'), 100)) return json({ ok: true });

  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (!(await verifyTurnstile(env, clip(form.get('cf-turnstile-response'), 2048), ip))) {
    return json({ ok: false, error: 'captcha' }, 400);
  }

  const lead: Lead = {
    name: clip(form.get('name'), 80),
    tel: clip(form.get('tel'), 80),
    email: clip(form.get('email'), 120),
    cities: form.getAll('c').map((c) => clip(c, 20)).filter(Boolean).slice(0, 10).join('、'),
    goal: clip(form.get('goal'), 40),
    project: clip(form.get('project'), 120),
    agent: clip(form.get('agent'), 60),
    updates: form.get('updates') === 'yes',
    page: clip(form.get('page'), 300),
  };
  if (!lead.name || !lead.tel) return json({ ok: false, error: 'required' }, 400);
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) return json({ ok: false, error: 'email' }, 400);

  const row = await env.DB.prepare(
    `INSERT INTO leads (name, tel, email, cities, goal, project, agent, updates, page, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
  ).bind(lead.name, lead.tel, lead.email, lead.cities, lead.goal, lead.project, lead.agent, lead.updates ? 1 : 0,
    lead.page, ip, (request.headers.get('User-Agent') ?? '').slice(0, 300)).first<{ id: number }>();
  const id = row!.id;

  // 通知在回應之後送出，不讓訪客等
  ctx.waitUntil(notify(env, id, lead));
  return json({ ok: true });
}

async function verifyTurnstile(env: Env, token: string, ip: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET) return env.ALLOW_NO_TURNSTILE === '1';
  if (!token) return false;
  const body = new FormData();
  body.append('secret', env.TURNSTILE_SECRET);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const out = await res.json<{ success: boolean }>();
  return out.success === true;
}

function summary(id: number, l: Lead): string {
  return [
    `【官網新名單 #${id}】`,
    `姓名：${l.name}`,
    `電話／LINE：${l.tel}`,
    l.email && `Email：${l.email}`,
    l.project && `詢問建案：${l.project}`,
    l.agent && `指定顧問：${l.agent}`,
    l.cities && `有興趣城市：${l.cities}`,
    l.goal && `置產目的：${l.goal}`,
    `接收更新通知：${l.updates ? '是' : '否'}`,
    l.page && `來源頁面：${l.page}`,
  ].filter(Boolean).join('\n');
}

async function notify(env: Env, id: number, lead: Lead) {
  const text = summary(id, lead);
  const [sheet, mail, line] = await Promise.all([sendSheet(env, id, lead), sendMail(env, lead, text), sendLine(env, text)]);
  try {
    await env.DB.prepare('UPDATE leads SET sheet_sent = ?, email_sent = ?, line_sent = ? WHERE id = ?')
      .bind(sheet ? 1 : 0, mail ? 1 : 0, line ? 1 : 0, id).run();
  } catch {
    // 尚未套用 migrations/0002_sheet_sent.sql 時沒有 sheet_sent 欄位，改用舊欄位記錄
    await env.DB.prepare('UPDATE leads SET email_sent = ?, line_sent = ? WHERE id = ?')
      .bind(mail || sheet ? 1 : 0, line ? 1 : 0, id).run();
  }
}

async function sendSheet(env: Env, id: number, lead: Lead): Promise<boolean> {
  if (!env.SHEET_WEBHOOK_URL) return false;
  try {
    // Apps Script 會先回 302 轉址到結果頁，fetch 預設會跟著轉址
    const res = await fetch(env.SHEET_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...lead, createdAt: new Date().toISOString() }),
    });
    const body = await res.text();
    const ok = res.ok && body.includes('"ok":true');
    if (!ok) console.error('Google 試算表寫入失敗', res.status, body.slice(0, 300));
    return ok;
  } catch (e) {
    console.error('Google 試算表寫入失敗', e);
    return false;
  }
}

async function sendMail(env: Env, lead: Lead, text: string): Promise<boolean> {
  const to = list(env.NOTIFY_EMAIL);
  if (!env.RESEND_API_KEY || !env.MAIL_FROM || !to.length) return false;
  const subject = `官網新名單：${lead.name}${lead.project ? `（${lead.project}）` : lead.agent ? `（指定 ${lead.agent}）` : ''}`;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM, to, subject, text, ...(lead.email && { reply_to: lead.email }) }),
    });
    if (!res.ok) console.error('Resend 寄信失敗', res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error('Resend 寄信失敗', e);
    return false;
  }
}

async function sendLine(env: Env, text: string): Promise<boolean> {
  const targets = list(env.LINE_TO);
  if (!env.LINE_CHANNEL_TOKEN || !targets.length) return false;
  const results = await Promise.all(targets.map(async (to) => {
    try {
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.LINE_CHANNEL_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
      });
      if (!res.ok) console.error('LINE 推播失敗', to, res.status, await res.text());
      return res.ok;
    } catch (e) {
      console.error('LINE 推播失敗', to, e);
      return false;
    }
  }));
  return results.every(Boolean);
}
