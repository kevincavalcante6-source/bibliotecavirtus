# Biblioteca Virtus — Virtus Mind

Biblioteca digital premium de wallpapers e widgets para dispositivos móveis.

> **SEU AMBIENTE. SUA MENTE. SEU PROPÓSITO.**
> Uma biblioteca digital para transformar o ambiente que acompanha você todos os dias.

Conceito de comunicação: *"Seu ambiente também fala com você."*

---

## Estado atual

Design do produto (canvas de artboards navegáveis), publicado como Design Artifact.
Nada de código de aplicação foi implementado ainda.

Telas desenhadas:

| Arquivo | Tela |
| --- | --- |
| `design/project/Main.dc.html` | Home desktop — Hero + Recém-adicionados + pilares + fecho |
| `design/project/Biblioteca.dc.html` | Biblioteca desktop — busca, filtros, grid 4 colunas, estado de hover |
| `design/project/Detalhe.dc.html` | Wallpaper detail — fundo ampliado/desfocado, imagem original nítida |
| `design/project/Acesso.dc.html` | Acesso / oferta — R$14,90, o que está incluído, objeções |
| `design/project/Mobile-Home.dc.html` | Início mobile (390×844 base) |
| `design/project/Mobile-Biblioteca.dc.html` | Biblioteca mobile — grid 2 colunas, tab bar |
| `design/project/Mobile-Detalhe.dc.html` | Wallpaper detail mobile |
| `design/project/Sistema.dc.html` | Design System — cores, tipografia, espaçamento, componentes |

`design/project/canvas.json` é o índice do canvas (posições, títulos, anotações).

---

## Design System oficial

### Direção

Minimalismo premium + tecnologia + propósito. **Menos elementos, mais intenção.**
Toda decisão visual responde: *isso torna a experiência mais clara, bonita ou significativa?*
Se não, não entra.

### Cores

| Token | Valor |
| --- | --- |
| Background | `#050505` |
| Near black | `#0A0A0A` |
| Dark | `#111111` |
| Dark 2 | `#171717` |
| Texto primário | `#F5F5F0` |
| Secundário | `#A8A8A2` |
| Muted | `#6F6F69` |
| Disabled | `#454541` |
| Accent champagne | `#C8A96A` |
| Gold soft | `#B89A60` |
| Gold dark | `#806B42` |
| Borda | `rgba(255,255,255,0.08)` |
| Borda hover | `rgba(255,255,255,0.14)` |

O champagne é usado com extrema moderação: labels de seção e detalhes pontuais.

### Tipografia

Inter — pesos 400, 500, 600, 700. Família única.

| Nível | Desktop | Mobile |
| --- | --- | --- |
| Hero | 64–80px | 40–48px |
| H1 | 48–64px | — |
| H2 | 36–48px | — |
| H3 | 24–30px | — |
| Body | 16–18px, line-height 1.5–1.7 | 16px |
| Label | 11–12px, uppercase, letter-spacing 0.2–0.24em | idem |

### Espaçamento

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 80 · 96 · 128 · 160`

### Grid

- Desktop: container 1200px, padding lateral 120px
- Tablet: padding 24px
- Mobile: padding 16–20px
- Wallpapers: 4 colunas (desktop) · 3 (tablet) · 2 (mobile)

### Componentes

- Raios: 8 / 12 / 16 / 20px — não arredondar tudo
- Botão primário: fundo `#F5F5F0`, texto `#050505`
- Botão secundário: transparente, borda `rgba(255,255,255,0.12)`, texto `#F5F5F0`
- Ícones: estilo Lucide, stroke 1.5, sem emoji
- Alvos de toque ≥ 44px

### Regras absolutas de imagem

- Nunca deformar, esticar ou cortar um wallpaper quando a intenção é mostrá-lo inteiro
- Proporção e resolução originais sempre preservadas
- Para preencher área: o próprio wallpaper ampliado + blur + overlay escuro no fundo,
  imagem original nítida na frente
- Sem barras pretas artificiais por proporção

### Animações

Somente microinterações, 150–300ms: fade, opacity, translate pequeno, scale muito sutil.

### Copy

Premium, minimalista, emocional, direta, contemplativa. Frases curtas e muito espaço.
Sem copy agressiva, promessas milagrosas, excesso de gatilhos ou linguagem de infoproduto.

Sensação desejada: *"Eu quero isso porque combina comigo."*

---

## Pendências marcadas no design

- Wallpapers reais (as áreas marcadas `IMAGEM` são placeholders)
- Modalidade de cobrança — marcada como `[DEFINIR MODALIDADE DE ACESSO]` na tela de Acesso
- Nenhuma prova social, número, depoimento, bônus, order bump, upsell ou escassez foi criado —
  esses elementos não existem hoje e não devem ser inventados
