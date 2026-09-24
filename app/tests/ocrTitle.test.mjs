// Roda com: npm run test:ocr — casos tirados da leitura real dos wallpapers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readingScore, titleFromWords } from "./.build/ocrTitle.mjs";

const w = (text, confidence) => ({ text, confidence });

test("Ore: frase inteira, ruído de baixa confiança descartado", () => {
  const words = [w("QUANDO", 97), w("LHE", 97), w("FALTAR", 96), w("FORÇA,", 95), w("ORE.", 93), w("MT", 71)];
  assert.equal(titleFromWords(words), "Quando lhe faltar força, ore");
});

test("Luta: Deus mantém a maiúscula; símbolos soltos descartados", () => {
  const words = [w("DEUS", 97), w("ESTÁ", 96), w("VENDO", 96), w("A", 92), w("SUA", 97), w("LUTA.", 95), w("1”", 84), w("|", 65)];
  assert.equal(titleFromWords(words), "Deus está vendo a sua luta");
});

test("Cristo no meio da frase continua com maiúscula", () => {
  assert.equal(titleFromWords([w("CONFIE", 95), w("EM", 96), w("CRISTO.", 94)]), "Confie em Cristo");
});

test("Traços e letras soltas de fundo não viram título", () => {
  assert.equal(titleFromWords([w("——", 95), w("E", 70), w("x", 90)]), null);
});

test("Imagem sem texto → null (fica o nome do arquivo)", () => {
  assert.equal(titleFromWords([]), null);
});

test("Pontuação colada e espaços normalizados", () => {
  assert.equal(titleFromWords([w("FOCO", 96), w(",", 90), w("DISCIPLINA", 95), w("...", 90)]), "Foco, disciplina");
});

test("A versão da imagem com mais texto confiável vence", () => {
  const escuro = [w("QUANDO", 97), w("LHE", 97), w("FALTAR", 96), w("FORÇA,", 95), w("ORE.", 93)];
  const claro = [w("PA", 64), w("7", 84)];
  assert.ok(readingScore(escuro) > readingScore(claro));
  assert.equal(readingScore(claro), 0);
});

test("Cristo: o C gigante lido como G é corrigido", () => {
  const words = [w("GRISTO", 90), w("É", 97), w("MINHA", 96), w("FORÇA.", 96), w("——", 65), w("E", 70)];
  assert.equal(titleFromWords(words), "Cristo é minha força");
});

test("Correção só vale para palavras da lista — palavra real não é mexida", () => {
  assert.equal(titleFromWords([w("GOSTO", 95), w("DE", 96), w("CAFÉ", 95)]), "Gosto de café");
  assert.equal(titleFromWords([w("QRDEM", 91)]), "Ordem");
  assert.equal(titleFromWords([w("GRUPO", 95)]), "Grupo");
});
