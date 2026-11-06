/**
 * Mejia 美家官網｜表單名單收件程式（Google Apps Script）
 *
 * 官網每收到一筆名單，就會把資料送到這裡：
 *   1. 在「名單」分頁新增一列
 *   2. 用這個 Google 帳號的 Gmail 寄通知信給「設定」分頁 B1 的信箱（多個用逗號分隔）
 *
 * 安裝方式見同資料夾的「讀我.md」。改收件人只要改「設定」分頁，不用改程式。
 */

const SHEET_LEADS = '名單';
const SHEET_SETTINGS = '設定';
const DEFAULT_NOTIFY = 'jerry0979361111@gmail.com';
const HEADERS = ['編號', '收到時間（台灣）', '姓名', '電話／LINE', 'Email', '有興趣城市', '置產目的', '詢問建案', '指定顧問',
  '接收更新通知', '來源頁面', '聯絡狀態', '負責顧問', '備註'];

/** 官網送來的名單（POST JSON） */
function doPost(e) {
  let lead;
  try {
    lead = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply({ ok: false, error: 'bad_json' });
  }
  if (!lead || !lead.name || !lead.tel || !lead.id) return reply({ ok: false, error: 'required' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = leadsSheet();
    const time = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm');
    sheet.appendRow([
      lead.id, time, safe(lead.name), safe(lead.tel), safe(lead.email), safe(lead.cities), safe(lead.goal),
      safe(lead.project), safe(lead.agent), lead.updates ? '是' : '否', safe(lead.page), '未聯絡', '', '',
    ]);
  } finally {
    lock.releaseLock();
  }

  try {
    notify(lead);
  } catch (err) {
    console.error('寄通知信失敗', err);
  }
  return reply({ ok: true });
}

/** 寄通知信 */
function notify(lead) {
  const to = notifyTo();
  if (!to) return;
  const tag = lead.project ? `（${lead.project}）` : lead.agent ? `（指定 ${lead.agent}）` : '';
  const lines = [
    `官網收到新名單 #${lead.id}`,
    '',
    `姓名：${lead.name}`,
    `電話／LINE：${lead.tel}`,
    lead.email ? `Email：${lead.email}` : null,
    lead.project ? `詢問建案：${lead.project}` : null,
    lead.agent ? `指定顧問：${lead.agent}` : null,
    lead.cities ? `有興趣城市：${lead.cities}` : null,
    lead.goal ? `置產目的：${lead.goal}` : null,
    `接收更新通知：${lead.updates ? '是' : '否'}`,
    lead.page ? `來源頁面：https://mejia.au${lead.page}` : null,
    '',
    `名單試算表：${SpreadsheetApp.getActiveSpreadsheet().getUrl()}`,
  ].filter((x) => x !== null);
  const options = { name: 'Mejia 美家官網' };
  if (lead.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) options.replyTo = lead.email;
  MailApp.sendEmail(to, `官網新名單：${lead.name}${tag}`, lines.join('\n'), options);
}

/** 第一次安裝時執行：建立分頁、授權 Gmail，並寄一封測試信 */
function 初始化() {
  leadsSheet();
  notifyTo();
  MailApp.sendEmail(notifyTo(), 'Mejia 美家官網：名單通知設定完成',
    '這是測試信。之後官網每收到一筆名單，就會寄一封通知到這個信箱，並寫進試算表的「名單」分頁。\n\n' +
    SpreadsheetApp.getActiveSpreadsheet().getUrl(), { name: 'Mejia 美家官網' });
}

function leadsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_LEADS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_LEADS, 0);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#F3E6C4');
    sheet.setColumnWidths(1, HEADERS.length, 130);
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(['未聯絡', '已聯絡', '已約看', '已成交', '無效'], true).build();
    sheet.getRange(2, 12, 1000, 1).setDataValidation(rule);
  }
  return sheet;
}

function notifyTo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SETTINGS);
    sheet.getRange('A1:B1').setValues([['通知信箱（多個用逗號分隔）', DEFAULT_NOTIFY]]);
    sheet.setColumnWidth(1, 240).setColumnWidth(2, 360);
  }
  return String(sheet.getRange('B1').getValue() || '').trim();
}

/** 防止試算表公式注入：以 = + - @ 開頭的內容前面加單引號 */
function safe(v) {
  const s = v == null ? '' : String(v).slice(0, 500);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
