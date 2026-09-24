# Biblioteca Virtus — Virtus Mind

Biblioteca digital premium de wallpapers e widgets para dispositivos móveis.

> **SEU AMBIENTE. SUA MENTE. SEU PROPÓSITO.**
> Wallpapers e widgets criados para transformar o ambiente que acompanha você todos os dias.

Conceito de comunicação: *"Seu ambiente também fala com você."*

---

## Estado atual

Três camadas, na ordem em que foram construídas:

| Pasta | O que é |
| --- | --- |
| `app/` | **A aplicação.** React + TypeScript + Vite com Supabase (Postgres, Auth, Storage). É o produto. |
| `supabase/` | Esquema, RLS, funções e buckets — a migração que dá vida ao `app/`. |
| `design/` | Canvas de design: 8 artboards com as telas e o design system. |
| `site/` | Protótipo estático inicial, mantido como referência visual. |

Para rodar a aplicação, veja [`app/README.md`](app/README.md).

### Páginas

Home · Biblioteca · Widgets · Login · Cadastro · Recuperar acesso · Perfil ·
Favoritos · Meus downloads · Admin (painel, envio individual, envio em massa).

### O que já funciona de ponta a ponta

- Acesso exclusivo de quem comprou: a Cakto avisa o site a cada compra
  aprovada, reembolso ou chargeback, e o banco libera ou revoga pelo e-mail.
- Autenticação real (Supabase Auth): criar conta, entrar, sair, sessão
  persistente com refresh de token, recuperação de senha, edição do nome.
- Biblioteca e Widgets com busca, paginação por rolagem, estados de carregando,
  vazio e erro com nova tentativa.
- Favoritos e downloads gravados no banco, por usuário.
- Contador de downloads incrementado no servidor, dentro de uma transação.
- Detalhe com fundo desfocado a partir da própria imagem, proporção preservada e
  restauração exata do scroll ao fechar.
- Admin protegido por RLS com painel de números reais, envio individual e envio
  em massa de até 35 arquivos por operação, com progresso por arquivo, progresso
  geral, deduplicação por SHA-256, identificação de erro e retry.

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

**Exceção deliberada** — a vitrine de Recém-adicionados avança sozinha a cada 3s.
É movimento constante, e é intencional: ali o conteúdo é o produto, e mostrá-lo
tem função. A rotação fica parada enquanto o ponteiro estiver sobre a seção,
para fora da tela e em segundo plano, recua por alguns segundos depois de
qualquer gesto da pessoa (e depois retoma), e não existe para quem pediu
`prefers-reduced-motion`. Fora deste caso, a regra acima continua valendo.

### Copy

Premium, minimalista, emocional, direta, contemplativa. Frases curtas e muito espaço.
Sem copy agressiva, promessas milagrosas, excesso de gatilhos ou linguagem de infoproduto.

Sensação desejada: *"Eu quero isso porque combina comigo."*

---

## Pendências

- Criar o projeto Supabase, rodar as migrações e publicar a função da Cakto
  (instruções em `app/README.md`)
- Subir os wallpapers e widgets reais pela área administrativa
- Nenhuma prova social, número, depoimento, bônus, order bump, upsell ou escassez foi criado —
  esses elementos não existem hoje e não devem ser inventados

## Testar no ar (depois da Vercel)

Coisas que só dão para conferir com o site publicado, num aparelho de verdade:

- **iPhone — salvar nas Fotos:** abrir um wallpaper, tocar em Baixar. Deve abrir o
  menu de compartilhar com "Salvar imagem"; conferir que a imagem chega às Fotos em
  resolução original. Testar no Safari **e** no Chrome. Se o menu não abrir, o botão
  cai no download comum (app Arquivos) — nada quebra, mas vale anotar em qual navegador.
- **iPhone — fechar o menu sem salvar:** o contador de downloads não deve subir.
- **Instalar como app:** iPhone (Safari → compartilhar → Adicionar à Tela de Início) e
  Android (Chrome → ⋮ → Instalar app). Conferir ícone, nome "Virtus" e abertura em
  tela cheia; entrar com e-mail e senha na primeira vez.
- **Android e PC:** Baixar deve continuar baixando o arquivo direto.
- **Guia "Como aplicar":** revisar os textos com o que você já orienta aos compradores.
- **Prévia do link:** colar o endereço do site numa conversa do WhatsApp e conferir
  imagem, título e descrição (com `VITE_SITE_URL` configurado na Vercel). O WhatsApp
  guarda a prévia por um tempo; para testar de novo depois de mudar, use o endereço
  com `?v=2` no fim.
