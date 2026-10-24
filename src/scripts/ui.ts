// 全站共用的小工具：選取元素與底部提示訊息。
export const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s)!;
export const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];

let timer: number | undefined;
export function toast(text: string) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(timer);
  timer = window.setTimeout(() => el.classList.remove('show'), 3600);
}
