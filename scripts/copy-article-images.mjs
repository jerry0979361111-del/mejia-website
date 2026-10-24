// 把「文章/圖片/」的封面照轉成 webp 放到 public/img/insights/（建置前自動執行）
import { mkdir, readdir, rm } from 'node:fs/promises';
import sharp from 'sharp';

const SRC = '文章/圖片';
const OUT = 'public/img/insights';
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
const files = (await readdir(SRC).catch(() => [])).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
for (const f of files) {
  await sharp(`${SRC}/${f}`).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(`${OUT}/${f.replace(/\.[^.]+$/, ".webp")}`);
}
console.log(`文章圖片：${files.length} 張`);
