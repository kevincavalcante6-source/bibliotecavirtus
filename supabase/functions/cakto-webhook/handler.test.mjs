// Testes da lógica do webhook, sem Deno e sem Supabase.
// Rodar a partir da pasta app/:  npm run test:webhook
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { handleCaktoWebhook } from "./handler.build.mjs";

const SECRET = "segredo-de-teste";

function fakeStore({ failGrant = false } = {}) {
  const events = new Map();
  const access = new Map();
  const calls = { grant: 0, revoke: 0, forget: 0 };
  return {
    events,
    access,
    calls,
    store: {
      async logEvent(record) {
        if (events.has(record.dedupeKey)) return "duplicate";
        events.set(record.dedupeKey, { ...record, outcome: null });
        return "inserted";
      },
      async setOutcome(key, outcome) {
        events.get(key).outcome = outcome;
      },
      async forget(key) {
        calls.forget += 1;
        events.delete(key);
      },
      async grant({ email }) {
        calls.grant += 1;
        if (failGrant) throw new Error("banco fora do ar");
        access.set(email, "active");
      },
      async revoke(email) {
        calls.revoke += 1;
        if (!access.has(email)) return false;
        access.set(email, "revoked");
        return true;
      },
    },
  };
}

const deps = (store, extra = {}) => ({
  secret: SECRET,
  productIds: [],
  store,
  sha256: async (text) => createHash("sha256").update(text).digest("hex"),
  ...extra,
});

const body = (event, data, secret = SECRET) => JSON.stringify({ event, secret, data });

test("segredo errado é recusado e nada é registrado", async () => {
  const s = fakeStore();
  const r = await handleCaktoWebhook(body("purchase_approved", { customer: { email: "a@b.com" } }, "outro"), deps(s.store));
  assert.equal(r.status, 401);
  assert.equal(s.events.size, 0);
});

test("sem segredo configurado no servidor, recusa tudo", async () => {
  const s = fakeStore();
  const r = await handleCaktoWebhook(body("purchase_approved", {}), deps(s.store, { secret: "" }));
  assert.equal(r.status, 500);
});

test("corpo que não é JSON devolve 400", async () => {
  const s = fakeStore();
  const r = await handleCaktoWebhook("não é json", deps(s.store));
  assert.equal(r.status, 400);
});

test("compra aprovada libera o e-mail, normalizado, e não guarda o segredo", async () => {
  const s = fakeStore();
  const r = await handleCaktoWebhook(
    body("purchase_approved", { id: "ord_1", customer: { email: "  Maria@Mail.COM " } }),
    deps(s.store),
  );
  assert.equal(r.status, 200);
  assert.equal(r.body.outcome, "granted");
  assert.equal(s.access.get("maria@mail.com"), "active");
  const [saved] = [...s.events.values()];
  assert.equal(saved.payload.secret, undefined);
  assert.equal(saved.orderId, "ord_1");
});

test("o mesmo evento reenviado não é processado duas vezes", async () => {
  const s = fakeStore();
  const payload = body("purchase_approved", { id: "ord_2", customer: { email: "joao@mail.com" } });
  await handleCaktoWebhook(payload, deps(s.store));
  const again = await handleCaktoWebhook(payload, deps(s.store));
  assert.equal(again.status, 200);
  assert.equal(again.body.duplicate, true);
  assert.equal(s.calls.grant, 1);
});

test("reembolso revoga", async () => {
  const s = fakeStore();
  await handleCaktoWebhook(body("purchase_approved", { id: "o3", customer: { email: "ana@mail.com" } }), deps(s.store));
  const r = await handleCaktoWebhook(body("refund", { id: "o3", customer: { email: "ana@mail.com" } }), deps(s.store));
  assert.equal(r.body.outcome, "revoked");
  assert.equal(s.access.get("ana@mail.com"), "revoked");
});

test("chargeback de quem nunca teve acesso fica registrado como tal", async () => {
  const s = fakeStore();
  const r = await handleCaktoWebhook(body("chargeback", { id: "o4", customer: { email: "x@mail.com" } }), deps(s.store));
  assert.equal(r.body.outcome, "revoke_without_access");
});

test("compra sem e-mail identificável não libera ninguém", async () => {
  const s = fakeStore();
  const r = await handleCaktoWebhook(body("purchase_approved", { id: "o5" }), deps(s.store));
  assert.equal(r.body.outcome, "no_email");
  assert.equal(s.calls.grant, 0);
});

test("outros eventos são registrados e ignorados", async () => {
  const s = fakeStore();
  const r = await handleCaktoWebhook(body("purchase_refused", { id: "o6", customer: { email: "y@mail.com" } }), deps(s.store));
  assert.equal(r.body.outcome, "ignored_event");
  assert.equal(s.calls.grant, 0);
  assert.equal(s.events.size, 1);
});

test("com filtro de produto, só o produto certo libera", async () => {
  const s = fakeStore();
  const d = deps(s.store, { productIds: ["prod_virtus"] });
  const outro = await handleCaktoWebhook(
    body("purchase_approved", { id: "o7", product: { id: "prod_outro" }, customer: { email: "z@mail.com" } }),
    d,
  );
  const certo = await handleCaktoWebhook(
    body("purchase_approved", { id: "o8", product: { id: "prod_virtus" }, customer: { email: "z@mail.com" } }),
    d,
  );
  assert.equal(outro.body.outcome, "other_product");
  assert.equal(certo.body.outcome, "granted");
});

test("falha no meio desfaz o registro, para o reenvio ser processado", async () => {
  const s = fakeStore({ failGrant: true });
  const payload = body("purchase_approved", { id: "o9", customer: { email: "w@mail.com" } });
  const r = await handleCaktoWebhook(payload, deps(s.store));
  assert.equal(r.status, 500);
  assert.equal(s.calls.forget, 1);
  assert.equal(s.events.size, 0);
});

test("aceita o e-mail em caminho alternativo", async () => {
  const s = fakeStore();
  const r = await handleCaktoWebhook(body("purchase_approved", { id: "o10", customer_email: "alt@mail.com" }), deps(s.store));
  assert.equal(r.body.outcome, "granted");
  assert.equal(s.access.get("alt@mail.com"), "active");
});
