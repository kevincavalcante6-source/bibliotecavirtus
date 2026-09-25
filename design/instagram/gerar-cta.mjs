// Gera o post de CTA (1080 × 1350, 4:5) com wallpapers reais em celulares.
// Uso: node gerar-cta.mjs <pasta-com-wallpapers> <fundo.png|-> <saida.png> [titulo] [fonte.woff2]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';

const [dir, bgPath, out, headline = 'WALLPAPERS', fontPath] = process.argv.slice(2);
const mime = (p) => ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' })[extname(p).toLowerCase()];
const uri = (p) => `data:${mime(p) ?? 'font/woff2'};base64,` + readFileSync(p).toString('base64');
// ordem.txt (um arquivo por linha) define a sequência da grade; sem ele, ordem alfabética.
const orderFile = join(dir, 'ordem.txt');
const names = existsSync(orderFile)
  ? readFileSync(orderFile, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  : readdirSync(dir).filter((f) => mime(f)).sort();
const files = names.map((f) => join(dir, f));
// MOCKUPS=1: as imagens já são celulares recortados (fundo transparente) —
// entram como estão, sem moldura nem relógio desenhados por cima.
const MOCKUPS = process.env.MOCKUPS === '1';
const MOCK_RATIO = 0.48;
const COLS = 6, ROWS = 3, N = COLS * ROWS;
const walls = Array.from({ length: N }, (_, i) => uri(files[i % files.length]));
const logo = uri('/home/user/bibliotecavirtus/design/brand/virtusmind-simbolo-branco.png');
const bg = bgPath && bgPath !== '-' ? `url(${uri(bgPath)}) center/cover` : 'radial-gradient(120% 60% at 50% 0%, #2a2a2a 0%, #0e0e0e 45%, #050505 100%)';
const font = fontPath ? `@font-face{font-family:Inter;src:url(${uri(fontPath)}) format('woff2');font-weight:100 900}` : '';

const html = `<!doctype html><html><head><style>${font}
*{box-sizing:border-box;margin:0}
body{width:1080px;height:1350px;overflow:hidden;background:#050505;font-family:Inter,sans-serif;color:#F5F5F0;position:relative}
.bg{position:absolute;inset:0;background:${bg}}
.grain{position:absolute;inset:0;opacity:.09;mix-blend-mode:overlay;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>")}
.top{position:absolute;left:64px;right:64px;top:58px;display:flex;justify-content:space-between;align-items:center}
.brand{display:flex;align-items:center;gap:14px}
.brand img{height:40px}
.brand b{font-size:15px;font-weight:600;letter-spacing:.26em}
.top span{font-size:13px;letter-spacing:.28em;color:#A8A8A2}
h1{position:absolute;left:58px;right:58px;top:112px;font-weight:800;letter-spacing:-.05em;text-align:center}
h1 span{display:block;width:max-content;margin:0 auto;line-height:.88;white-space:nowrap}
.sub{position:absolute;left:0;right:0;top:0;text-align:center;font-size:17px;font-weight:600;letter-spacing:.42em;color:#A8A8A2}
.grid{position:absolute;left:0;top:0;display:grid;grid-template-columns:repeat(${COLS},var(--pw));gap:var(--gy) var(--gx)}
.mock{position:relative;aspect-ratio:${MOCK_RATIO};filter:drop-shadow(0 18px 26px rgba(0,0,0,.65))}
.mock img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.phone{position:relative;border-radius:24px;padding:5px;background:#0b0b0b;border:1px solid rgba(255,255,255,.18);box-shadow:0 18px 40px rgba(0,0,0,.6)}
.screen{position:relative;aspect-ratio:9/16;border-radius:19px;overflow:hidden;background:#000}
.screen img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.island{position:absolute;top:7px;left:50%;transform:translateX(-50%);width:36%;height:10px;border-radius:10px;background:#000}
.clock{position:absolute;top:20px;left:0;right:0;text-align:center;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.45)}
.screen.is-light .clock{color:#141414;text-shadow:none}
.screen.is-light .bar{background:rgba(0,0,0,.7)}
.clock small{display:block;font-size:7.5px;font-weight:600;opacity:.9}
.clock b{display:block;font-size:34px;font-weight:600;letter-spacing:-.02em;line-height:1.05}
.bar{position:absolute;bottom:6px;left:50%;transform:translateX(-50%);width:38%;height:3px;border-radius:3px;background:rgba(255,255,255,.85)}
.cta{position:absolute;left:0;right:0;bottom:62px;text-align:center;font-size:62px;font-weight:800;letter-spacing:-.03em}
.cta .mark{position:relative;display:inline-block;padding:0 6px;margin:0 16px}
.cta svg{position:absolute;left:-26px;top:-20px;width:calc(100% + 52px);height:calc(100% + 40px);overflow:visible}
</style></head><body>
<div class="bg"></div><div class="grain"></div>
<div class="top"><div class="brand"><img src="${logo}"><b>BIBLIOTECA VIRTUS</b></div><span>VIRTUS MIND</span></div>
<h1>${headline.split('\\n').map((l) => `<span>${l}</span>`).join('')}</h1>
<div class="sub">E WIDGETS PARA O SEU CELULAR</div>
<div class="grid">${walls.map((w) => MOCKUPS ? `<div class="mock"><img src="${w}"></div>` : `<div class="phone"><div class="screen"><img src="${w}"><div class="island"></div><div class="clock"><small>quinta-feira, 24 de setembro</small><b>9:41</b></div><div class="bar"></div></div></div>`).join('')}</div>
<div class="cta">ACESSE PELO <span class="mark">LINK<svg viewBox="0 0 200 100" preserveAspectRatio="none"><path d="M18 58 C 14 22, 88 8, 142 14 C 196 20, 204 66, 150 84 C 96 100, 22 92, 12 62 C 6 44, 40 26, 70 22" fill="none" stroke="#F5F5F0" stroke-width="3.2" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg></span> NA BIO.</div>
</body></html>`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
// Layout: cada linha do título ocupa a largura (até 170px de fonte); a grade
// ocupa o espaço entre o subtítulo e a chamada, sempre com as artes em 9:16.
await page.evaluate(({ COLS, ROWS, MOCKUPS, MOCK_RATIO }) => {
  const W = 1080, MAX_W = 950;
  // Todas as linhas com o mesmo corpo: o maior em que a linha mais longa cabe.
  const lines = [...document.querySelectorAll('h1 span')];
  lines.forEach((line) => (line.style.fontSize = '100px'));
  const size = Math.min(170, ...lines.map((line) => (100 * MAX_W) / line.getBoundingClientRect().width));
  lines.forEach((line) => (line.style.fontSize = size + 'px'));
  const h1 = document.querySelector('h1').getBoundingClientRect();
  const sub = document.querySelector('.sub');
  sub.style.top = h1.bottom + 22 + 'px';
  const top = sub.getBoundingClientRect().bottom + 40;
  const bottom = document.querySelector('.cta').getBoundingClientRect().top - 44;
  const gy = 16, gx = 14, chrome = 12;
  let ph = (bottom - top - gy * (ROWS - 1)) / ROWS;
  const widthOf = (h) => (MOCKUPS ? h * MOCK_RATIO : (h - chrome) * 9 / 16 + chrome);
  const heightOf = (w) => (MOCKUPS ? w / MOCK_RATIO : (w - chrome) * 16 / 9 + chrome);
  let pw = widthOf(ph);
  const maxPw = (W - 2 * 60 - gx * (COLS - 1)) / COLS;
  if (pw > maxPw) { pw = maxPw; ph = heightOf(pw); }
  const grid = document.querySelector('.grid');
  grid.style.setProperty('--pw', pw + 'px'); grid.style.setProperty('--gx', gx + 'px'); grid.style.setProperty('--gy', gy + 'px');
  const gridW = COLS * pw + gx * (COLS - 1), gridH = ROWS * ph + gy * (ROWS - 1);
  grid.style.left = (W - gridW) / 2 + 'px';
  grid.style.top = top + (bottom - top - gridH) / 2 + 'px';
  const scale = pw / 160;
  for (const c of document.querySelectorAll('.clock b')) c.style.fontSize = 34 * scale + 'px';
  for (const c of document.querySelectorAll('.clock small')) c.style.fontSize = 7.5 * scale + 'px';
}, { COLS, ROWS, MOCKUPS, MOCK_RATIO });
// Como no iPhone: relógio escuro quando o topo da arte é claro.
await page.evaluate(async () => {
  for (const img of document.querySelectorAll('.screen img')) {
    await img.decode();
    const c = document.createElement('canvas'); c.width = 60; c.height = 30;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight * 0.3, 0, 0, 60, 30);
    const d = x.getImageData(0, 0, 60, 30).data; let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (sum / (d.length / 4) > 170) img.parentElement.classList.add('is-light');
  }
});
await page.waitForTimeout(300);
const fit = await page.evaluate(() => { const g = document.querySelector('.grid').getBoundingClientRect(); const c = document.querySelector('.cta').getBoundingClientRect(); const h = document.querySelector('h1'); return { gridBottom: Math.round(g.bottom), ctaTop: Math.round(c.top), headlineOverflow: h.scrollWidth > h.clientWidth }; });
await page.screenshot({ path: out });
console.log(out, JSON.stringify(fit), `${files.length} wallpaper(s) distintos para ${N} celulares`);
await browser.close();
