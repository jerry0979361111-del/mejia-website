// 從建案 PDF（樓書、示意圖）抓出最適合當封面的建案圖。
// 做法：讀前幾頁內嵌的圖片，挑面積最大、比例像照片的那張（避開 logo、圖示、細長的平面圖）。
import { extractImages, getDocumentProxy } from 'unpdf';
import sharp from 'sharp';

const MAX_PAGES = 8;
const MIN_WIDTH = 800;

/** @returns {Promise<Buffer|null>} 找到就回傳原尺寸 PNG，找不到回傳 null */
export async function coverFromPdf(buf) {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  let best = null;
  for (let page = 1; page <= Math.min(pdf.numPages, MAX_PAGES); page++) {
    const images = await extractImages(pdf, page).catch(() => []);
    for (const img of images) {
      const ratio = img.width / img.height;
      if (img.width < MIN_WIDTH || ratio < 0.6 || ratio > 2.4) continue;
      if (!best || img.width * img.height > best.width * best.height) best = img;
    }
    // 第一張夠大的橫幅圖通常就是封面效果圖，不用再往後找
    if (best && best.width >= 1600 && best.width / best.height > 1.2) break;
  }
  await pdf.cleanup?.();
  if (!best) return null;
  return sharp(Buffer.from(best.data), { raw: { width: best.width, height: best.height, channels: best.channels } }).png().toBuffer();
}
