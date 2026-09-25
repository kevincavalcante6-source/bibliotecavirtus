# Post de CTA (Instagram, 4:5)

Última imagem do carrossel: grade de celulares com wallpapers **reais** da
coleção, título e a chamada "Acesse pelo link na bio".

```bash
node design/instagram/gerar-cta.mjs <pasta-com-wallpapers> <fundo.png ou -> <saida.png> [TITULO] design/brand/fonts/inter-latin.woff2
```

- Usa até 18 wallpapers da pasta (6 × 3), em ordem alfabética do nome do arquivo.
- As artes aparecem inteiras (9:16), sem corte; o relógio fica escuro sozinho
  quando o topo da arte é claro, como no iPhone.
- `-` no lugar do fundo usa um degradê escuro provisório.
- Título: use `\n` para quebrar linha (ex.: `'+250\nWALLPAPERS'`); as linhas ficam com o
  mesmo tamanho, o maior que couber. Número só se for o total real da coleção.
- A grade (6 × 3) se ajusta sozinha ao espaço entre o título e a chamada.

## Com mockups prontos (celulares já montados, fundo preto)

```bash
# 1. recorta cada celular do fundo preto (fica transparente)
node design/instagram/recortar-mockups.mjs design/instagram/insumos/wallpapers design/instagram/insumos/recortes
# 2. gera o post usando os recortes como estão
MOCKUPS=1 node design/instagram/gerar-cta.mjs design/instagram/insumos/recortes design/instagram/insumos/fundo.webp design/instagram/cta-final.png '+250\nWALLPAPERS' design/brand/fonts/inter-latin.woff2
```

A ordem da grade está em `insumos/recortes/ordem.txt` (um arquivo por linha).
