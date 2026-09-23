// Roda com: npm run test:share (esbuild gera tests/.build/shareToPhotos.mjs)
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { shareToPhotos } from "./.build/shareToPhotos.mjs";

let calls;
function mockNavigator({ canShare = true, share = async () => {} } = {}) {
  calls = [];
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      canShare: (data) => canShare,
      share: async (data) => {
        calls.push(data);
        return share(data);
      },
    },
  });
}
const image = () => new File([new Uint8Array([1, 2, 3])], "x.jpg", { type: "image/jpeg" });

beforeEach(() => mockNavigator());

test("sem arquivo preparado → download comum assume", async () => {
  assert.equal(await shareToPhotos(null, "virtus-ore.jpg"), "unavailable");
  assert.equal(calls.length, 0);
});

test("navegador não aceita compartilhar arquivos → download comum", async () => {
  mockNavigator({ canShare: false });
  assert.equal(await shareToPhotos(image(), "virtus-ore.jpg"), "unavailable");
  assert.equal(calls.length, 0);
});

test("menu aberto e ação escolhida → shared, com o nome e o tipo certos", async () => {
  assert.equal(await shareToPhotos(image(), "virtus-ore.jpg"), "shared");
  const [file] = calls[0].files;
  assert.equal(file.name, "virtus-ore.jpg");
  assert.equal(file.type, "image/jpeg");
  assert.equal(file.size, 3);
  assert.equal(calls[0].url, undefined, "só o arquivo — sem link junto, para aparecer “Salvar imagem”");
});

test("pessoa fecha o menu → cancelled (não conta download)", async () => {
  mockNavigator({ share: async () => { throw Object.assign(new Error("x"), { name: "AbortError" }); } });
  assert.equal(await shareToPhotos(image(), "a.jpg"), "cancelled");
});

test("sistema recusa (toque expirou) → download comum assume", async () => {
  mockNavigator({ share: async () => { throw Object.assign(new Error("x"), { name: "NotAllowedError" }); } });
  assert.equal(await shareToPhotos(image(), "a.jpg"), "unavailable");
});

test("erro qualquer → download comum assume", async () => {
  mockNavigator({ share: async () => { throw new TypeError("boom"); } });
  assert.equal(await shareToPhotos(image(), "a.jpg"), "unavailable");
});
