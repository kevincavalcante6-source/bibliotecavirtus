import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
const logo = 'data:image/png;base64,' + readFileSync('/home/user/bibliotecavirtus/design/brand/virtusmind-simbolo-branco.png').toString('base64');
const out = '/home/user/bibliotecavirtus/app/public';
// [arquivo, tamanho, cantos arredondados, altura da logo em fração do ícone]
// "maskable": o Android recorta em círculo/squircle — a logo fica dentro da zona segura (80%).
const specs = [
  ['icon-192.png', 192, true, 0.6], ['icon-512.png', 512, true, 0.6],
  ['icon-maskable-512.png', 512, false, 0.5], ['apple-touch-icon.png', 180, false, 0.58],
  ['favicon-32.png', 32, true, 0.74], ['favicon-16.png', 16, true, 0.8],
];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [name, size, rounded, frac] of specs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px;border-radius:${rounded ? Math.round(size * 0.22) : 0}px;background:#0A0A0A;display:grid;place-items:center"><img src="${logo}" style="height:${Math.round(size * frac)}px"></div></body>`);
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${out}/${name}`, omitBackground: true });
  await page.close();
}
await browser.close();
console.log('ícones gerados');
