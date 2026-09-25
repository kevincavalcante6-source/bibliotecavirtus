// Prévia do link (1200 × 630) com 5 mockups reais em leque.
// Uso: node gerar-previa-mockups.mjs <fundo> <saida.png> [posicao-do-fundo-css]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
const [bgPath, out, bgPos = 'center'] = process.argv.slice(2);
const R = '/home/user/bibliotecavirtus/design/instagram/insumos/recortes';
const uri = (p, t) => `data:${t};base64,` + readFileSync(p).toString('base64');
const font = uri('/home/user/bibliotecavirtus/design/brand/fonts/inter-latin.woff2', 'font/woff2');
const logo = uri('/home/user/bibliotecavirtus/design/brand/virtusmind-simbolo-branco.png', 'image/png');
const bg = uri(bgPath, bgPath.endsWith('.webp') ? 'image/webp' : 'image/png');
// Esquerda → direita. Brancos nas pontas, vermelhos no meio, o azul em destaque.
const phones = [
  ['mockup-06', 290, 686, 0.62, 1],
  ['mockup-02', 350, 772, 0.8, 2],
  ['mockup-01', 430, 898, 1, 3],
  ['mockup-10', 350, 1024, 0.8, 2],
  ['mockup-04', 290, 1110, 0.62, 1],
];
const html = `<!doctype html><html><head><style>
@font-face{font-family:Inter;src:url(${font}) format('woff2');font-weight:100 900}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;background:#050505;font-family:Inter,sans-serif;color:#F5F5F0;position:relative}
.bg{position:absolute;inset:0;background:url(${bg}) ${bgPos}/cover}
.shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,5,5,.93) 0%,rgba(5,5,5,.72) 36%,rgba(5,5,5,0) 60%)}
.copy{position:absolute;left:76px;top:0;bottom:0;width:520px;display:flex;flex-direction:column;justify-content:center}
.brand{display:flex;align-items:center;gap:16px}
.brand img{height:54px}
.brand b{display:block;font-size:15px;font-weight:600;letter-spacing:.24em}
.brand span{display:block;margin-top:5px;font-size:11px;font-weight:500;letter-spacing:.26em;color:#A8A8A2}
h1{margin-top:44px;font-size:50px;line-height:1.06;font-weight:700;letter-spacing:-.02em}
p{margin-top:26px;font-size:18px;line-height:1.5;color:#A8A8A2;max-width:460px}
.rule{width:44px;height:1px;background:#6F6F69;margin-top:30px}
.ph{position:absolute;top:50%;filter:drop-shadow(0 28px 40px rgba(0,0,0,.7))}
.ph img{display:block;height:100%;width:auto}
</style></head><body>
<div class="bg"></div><div class="shade"></div>
${phones.map(([f, h, cx, light, z]) => `<div class="ph" style="height:${h}px;left:${cx}px;transform:translate(-50%,-50%);z-index:${z};${light < 1 ? `filter:drop-shadow(0 28px 40px rgba(0,0,0,.7)) brightness(${light})` : ''}"><img src="${uri(`${R}/${f}.png`, 'image/png')}"></div>`).join('')}
<div class="copy">
  <div class="brand"><img src="${logo}"><div><b>BIBLIOTECA VIRTUS</b><span>VIRTUS MIND</span></div></div>
  <h1>SEU AMBIENTE.<br>SUA MENTE.<br>SEU PROPÓSITO.</h1>
  <div class="rule"></div>
  <p>Wallpapers e widgets criados para transformar o ambiente que acompanha você todos os dias.</p>
</div>
</body></html>`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
const edges = await page.$$eval('.ph', (els) => els.map((e) => { const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.right), Math.round(b.top), Math.round(b.bottom)]; }));
await page.screenshot({ path: out });
await page.screenshot({ path: out.replace(/\.png$/, '.jpg'), type: 'jpeg', quality: 86 });
console.log(out, JSON.stringify(edges));
await browser.close();
