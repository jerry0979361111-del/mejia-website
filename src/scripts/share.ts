// 一鍵分享：任何 [data-share-url] 按鈕（含動態產生的）。
// 支援系統分享的裝置（多數手機）叫出分享選單；不支援時複製連結並提示。
import { toast } from './ui';

async function copy(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // 舊瀏覽器：用暫時的輸入框複製
    const t = document.createElement('textarea');
    t.value = url;
    t.style.cssText = 'position:fixed;opacity:0';
    document.body.append(t);
    t.select();
    const ok = document.execCommand('copy');
    t.remove();
    return ok;
  }
}

export function initShare() {
  document.addEventListener('click', async (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-share-url]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    const { shareUrl: url = location.href, shareTitle: title = document.title, shareText: text = '', shareId: id = '' } = b.dataset;
    let method = 'copy';
    if (navigator.share) {
      try {
        await navigator.share({ title, text: text || title, url });
        method = 'native';
      } catch (err) {
        if ((err as Error).name === 'AbortError') return; // 使用者自己取消
        method = (await copy(url)) ? 'copy' : 'none';
      }
    } else {
      method = (await copy(url)) ? 'copy' : 'none';
    }
    if (method === 'copy') toast('已複製建案連結，貼到 LINE 或訊息就能分享');
    if (method === 'none') { toast('無法自動複製，請長按網址列手動複製'); return; }
    (window as any).gtag?.('event', 'share', { method, content_type: 'project', item_id: id || url });
  });
}
