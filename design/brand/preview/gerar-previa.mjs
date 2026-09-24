import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
const D = '/home/user/bibliotecavirtus/design/brand';
const uri = (p, t) => `data:${t};base64,` + readFileSync(p).toString('base64');
const font = uri(process.argv[2] + '/inter-400-latin.woff2', 'font/woff2');
const bg = uri(D + '/preview/fundo-chatgpt.webp', 'image/webp');
const logo = uri(D + '/virtusmind-simbolo-branco.png', 'image/png');
const W = { cristo: uri(D + '/preview/wallpaper-cristo.webp', 'image/webp'), ore: uri(D + '/preview/wallpaper-ore.webp', 'image/webp'), luta: uri(D + '/preview/wallpaper-luta.webp', 'image/webp') };
const variant = process.argv[3] || 'a';
const order = variant === 'a' ? ['luta', 'cristo', 'ore'] : ['cristo', 'luta', 'ore'];
const html = `<!doctype html><html><head><style>
@font-face{font-family:Inter;src:url(${font}) format('woff2');font-weight:100 900}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;background:#050505;font-family:Inter,sans-serif;color:#F5F5F0}
.bg{position:absolute;left:0;top:-96px;width:1200px;height:800px;background:url(${bg}) center/cover}
.shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,5,5,.92) 0%,rgba(5,5,5,.7) 34%,rgba(5,5,5,0) 58%)}
.copy{position:absolute;left:76px;top:0;bottom:0;width:520px;display:flex;flex-direction:column;justify-content:center}
.brand{display:flex;align-items:center;gap:16px}
.brand img{height:54px}
.brand b{display:block;font-size:15px;font-weight:600;letter-spacing:.24em}
.brand span{display:block;margin-top:5px;font-size:11px;font-weight:500;letter-spacing:.26em;color:#A8A8A2}
h1{margin-top:44px;font-size:50px;line-height:1.06;font-weight:700;letter-spacing:-.02em}
p{margin-top:26px;font-size:18px;line-height:1.5;color:#A8A8A2;max-width:460px}
.rule{width:44px;height:1px;background:#806B42;margin-top:30px}
.phone{position:absolute;border-radius:26px;padding:5px;background:#0b0b0b;border:1px solid rgba(255,255,255,.16);box-shadow:0 40px 70px rgba(0,0,0,.7),0 0 0 1px rgba(0,0,0,.6)}
.phone img{display:block;width:100%;height:100%;object-fit:contain;border-radius:21px}
.floor{position:absolute;left:640px;width:520px;top:500px;height:40px;background:radial-gradient(ellipse at center,rgba(0,0,0,.75),rgba(0,0,0,0) 70%);filter:blur(6px)}
</style></head><body>
<div class="bg"></div><div class="shade"></div>
<div class="floor"></div>
${[[0, 668, 166, 180, 311], [2, 970, 166, 180, 311], [1, 792, 120, 224, 389]].map(([i, x, y, w, h]) => `<div class="phone" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;${i === 1 ? 'z-index:2' : 'filter:brightness(.82)'}"><img src="${W[order[i]]}"></div>`).join('')}
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
const dims = await page.$$eval('.phone img', els => els.map(e => e.naturalWidth + 'x' + e.naturalHeight));
await page.screenshot({ path: `${process.argv[2]}/og-${variant}.png` }); await page.screenshot({ path: `${process.argv[2]}/og-${variant}.jpg`, type: 'jpeg', quality: 86 });
console.log(variant, dims.join(' '));
await browser.close();
