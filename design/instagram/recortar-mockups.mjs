// Recorta o celular de cada mockup (fundo preto → transparente).
// Uso: node recortar-mockups.mjs <pasta-mockups> <pasta-saida>
// A borda do aparelho é achada pela luminância: o aro metálico é claro, o
// fundo é preto e o brilho colorido embaixo de alguns celulares é escuro
// demais em luminância para ser confundido com ele.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const [inDir, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const files = readdirSync(inDir).filter((f) => /\.(webp|png|jpe?g)$/i.test(f)).sort();
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
const report = [];
for (const f of files) {
  const src = `data:image/webp;base64,` + readFileSync(join(inDir, f)).toString('base64');
  const res = await page.evaluate(async (src) => {
    const img = new Image(); img.src = src; await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, W, H).data;
    const lum = (px, py) => { const i = (py * W + px) * 4; return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; };
    const T = 60;
    // Esquerda/direita: linha do meio (o aparelho atravessa o centro).
    const my = Math.round(H / 2);
    let left = 0; while (left < W && lum(left, my) < T) left++;
    let right = W - 1; while (right > 0 && lum(right, my) < T) right--;
    // Topo/base: colunas a 25% e 75% da largura (fora da ilha e do brilho central).
    const cols = [left + (right - left) * 0.25, left + (right - left) * 0.75].map(Math.round);
    let top = H, bottom = 0;
    for (const cx of cols) {
      let t = 0; while (t < H && lum(cx, t) < T) t++;
      let b = H - 1; while (b > 0 && lum(cx, b) < T) b--;
      top = Math.min(top, t); bottom = Math.max(bottom, b);
    }
    const w = right - left + 1, h = bottom - top + 1;
    // Recorte com cantos arredondados como os do aparelho.
    const o = document.createElement('canvas'); o.width = w; o.height = h;
    const ox = o.getContext('2d');
    ox.beginPath(); ox.roundRect(0, 0, w, h, w * 0.155); ox.clip();
    ox.drawImage(img, left, top, w, h, 0, 0, w, h);
    return { box: [left, top, w, h, +(w / h).toFixed(3)], png: o.toDataURL('image/png').split(',')[1] };
  }, src);
  writeFileSync(join(outDir, basename(f, extname(f)) + '.png'), Buffer.from(res.png, 'base64'));
  report.push(`${f}: x${res.box[0]} y${res.box[1]} ${res.box[2]}×${res.box[3]} (proporção ${res.box[4]})`);
}
await browser.close();
console.log(report.join('\n'));
