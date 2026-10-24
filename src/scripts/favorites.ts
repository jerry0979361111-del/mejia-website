// 加入最愛：存在使用者自己的瀏覽器（localStorage），不需要登入。
// 任何頁面上有 [data-fav="slug"] 的按鈕都會自動同步狀態；頁首 [data-fav-count] 顯示數量。
const KEY = 'mejia-favs';

export function getFavs(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; }
}

function setFavs(list: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* 無痕模式等情況存不了，就只在這次瀏覽有效 */ }
  document.dispatchEvent(new CustomEvent('favs:change', { detail: list }));
}

export function toggleFav(slug: string): boolean {
  const list = getFavs();
  const on = !list.includes(slug);
  setFavs(on ? [...list, slug] : list.filter((s) => s !== slug));
  return on;
}

/** 動態產生的按鈕（例如地圖清單）渲染後呼叫，同步愛心狀態 */
export function sync() {
  const list = getFavs();
  document.querySelectorAll<HTMLElement>('[data-fav]').forEach((b) => {
    const on = list.includes(b.dataset.fav!);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
    const label = b.querySelector('.fav-label');
    if (label) label.textContent = on ? '已加入最愛' : '加入最愛';
  });
  document.querySelectorAll<HTMLElement>('[data-fav-count]').forEach((c) => {
    c.textContent = String(list.length);
    c.hidden = list.length === 0;
  });
}

export function initFavs() {
  document.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-fav]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    toggleFav(b.dataset.fav!);
  });
  document.addEventListener('favs:change', sync);
  window.addEventListener('storage', (e) => { if (e.key === KEY) sync(); });
  sync();
}
