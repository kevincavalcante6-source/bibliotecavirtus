// =============================================================================
// BIBLIOTECA VIRTUS — função cakto-webhook (arquivo único, para o painel)
//
// Como usar: Supabase → Edge Functions → Deploy a new function → Via Editor.
// Nome da função: cakto-webhook. Apague o exemplo, cole TUDO, publique e
// desligue "Enforce JWT verification" nas configurações da função.
//
// Gerado automaticamente a partir de functions/cakto-webhook/ por
// gerar-funcao-painel.sh. Não edite aqui: edite a função e gere de novo.
// =============================================================================

// Edge Function do Supabase que recebe os avisos da Cakto.
// Publicar com a verificação de JWT desligada: a Cakto não envia token do
// Supabase — a autenticação é o segredo que ela manda no corpo.
//   supabase functions deploy cakto-webhook --no-verify-jwt
//
// Segredos (Edge Functions → Secrets):
//   CAKTO_WEBHOOK_SECRET  o mesmo segredo cadastrado no webhook da Cakto
//   CAKTO_PRODUCT_IDS     opcional; ids de produto separados por vírgula
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY o próprio Supabase fornece.

import { createClient } from "npm:@supabase/supabase-js@2.47.10";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const store: Store = {
  async logEvent(record) {
    const { error } = await supabase.from("cakto_events").insert({
      dedupe_key: record.dedupeKey,
      event: record.event,
      email: record.email,
      order_id: record.orderId,
      product_id: record.productId,
      payload: record.payload,
    });
    if (error?.code === "23505") return "duplicate";
    if (error) throw error;
    return "inserted";
  },

  async setOutcome(dedupeKey, outcome) {
    const { error } = await supabase.from("cakto_events").update({ outcome }).eq("dedupe_key", dedupeKey);
    if (error) throw error;
  },

  async forget(dedupeKey) {
    await supabase.from("cakto_events").delete().eq("dedupe_key", dedupeKey);
  },

  async grant({ email, orderId, productId }) {
    const now = new Date().toISOString();
    const { error } = await supabase.from("entitlements").upsert(
      {
        email,
        status: "active",
        source: "cakto",
        order_id: orderId,
        product_id: productId,
        granted_at: now,
        revoked_at: null,
        updated_at: now,
      },
      { onConflict: "email" },
    );
    if (error) throw error;
  },

  async revoke(email) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("entitlements")
      .update({ status: "revoked", revoked_at: now, updated_at: now })
      .eq("email", email)
      .select("email");
    if (error) throw error;
    return (data ?? []).length > 0;
  },
};

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method !== "POST") return json(405, { ok: false });

  const result = await handleCaktoWebhook(await request.text(), {
    secret: Deno.env.get("CAKTO_WEBHOOK_SECRET") ?? "",
    productIds: (Deno.env.get("CAKTO_PRODUCT_IDS") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
    store,
    sha256,
  });

  return json(result.status, result.body);
});

// ---------------------------------------------------------------- lógica --

/**
 * Lógica do webhook da Cakto, sem dependência de Deno nem de Supabase: recebe
 * o corpo cru e as dependências por parâmetro. Assim ela é testada fora do
 * ambiente das Edge Functions (ver handler.test.mjs).
 *
 * Formato confirmado: a Cakto envia `{ event, secret, data }`, com o segredo
 * no CORPO (não em cabeçalho). Eventos tratados: purchase_approved libera;
 * refund e chargeback revogam. Todo o resto é registrado e ignorado.
 */

export type Outcome =
  | "granted"
  | "revoked"
  | "revoke_without_access"
  | "ignored_event"
  | "other_product"
  | "no_email";

export interface CaktoEventRecord {
  dedupeKey: string;
  event: string;
  email: string | null;
  orderId: string | null;
  productId: string | null;
  payload: unknown;
}

export interface Store {
  /** Registra o evento cru; devolve "duplicate" se a mesma chave já existe. */
  logEvent(record: CaktoEventRecord): Promise<"inserted" | "duplicate">;
  setOutcome(dedupeKey: string, outcome: Outcome): Promise<void>;
  /** Desfaz o registro de um evento que falhou no meio, para a Cakto reenviar. */
  forget(dedupeKey: string): Promise<void>;
  grant(access: { email: string; orderId: string | null; productId: string | null }): Promise<void>;
  /** Devolve true se havia uma liberação para revogar. */
  revoke(email: string): Promise<boolean>;
}

export interface Deps {
  secret: string;
  /** Vazio = aceita qualquer produto da conta. */
  productIds: string[];
  store: Store;
  sha256(text: string): Promise<string>;
}

export interface Result {
  status: number;
  body: Record<string, unknown>;
}

const GRANT_EVENTS = new Set(["purchase_approved"]);
const REVOKE_EVENTS = new Set(["refund", "chargeback"]);

// O e-mail do comprador deve vir em data.customer.email. Os demais caminhos
// cobrem variações de formato; o evento cru fica salvo em cakto_events, então
// o primeiro teste enviado pela Cakto mostra qual caminho ela usa de fato.
const EMAIL_PATHS = ["customer.email", "customer_email", "buyer.email", "client.email", "email"];
const ORDER_PATHS = ["id", "refId", "order_id", "orderId", "transaction_id", "transaction.id"];
const PRODUCT_PATHS = ["product.id", "product_id", "offer.product.id", "product.short_id"];

export function pick(source: unknown, paths: string[]): string | null {
  for (const path of paths) {
    const value = path
      .split(".")
      .reduce<unknown>(
        (node, key) => (node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined),
        source,
      );
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

/** Comparação em tempo constante: não revela quantos caracteres batem. */
export function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return diff === 0;
}

function normalizeEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export async function handleCaktoWebhook(raw: string, deps: Deps): Promise<Result> {
  if (!deps.secret) {
    return { status: 500, body: { ok: false, error: "CAKTO_WEBHOOK_SECRET não configurado" } };
  }

  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    payload = parsed as Record<string, unknown>;
  } catch {
    return { status: 400, body: { ok: false, error: "corpo não é um JSON válido" } };
  }

  const provided = typeof payload.secret === "string" ? payload.secret : "";
  if (!safeEqual(provided, deps.secret)) {
    return { status: 401, body: { ok: false } };
  }

  const event = typeof payload.event === "string" ? payload.event : "";
  const data = payload.data && typeof payload.data === "object" ? payload.data : {};
  const rawEmail = pick(data, EMAIL_PATHS);
  const email = rawEmail ? normalizeEmail(rawEmail) : null;
  const orderId = pick(data, ORDER_PATHS);
  const productId = pick(data, PRODUCT_PATHS);
  const dedupeKey = `${event}:${orderId ?? (await deps.sha256(raw))}`;

  // O segredo nunca vai para o banco.
  const { secret: _secret, ...stored } = payload;

  const logged = await deps.store.logEvent({ dedupeKey, event, email, orderId, productId, payload: stored });
  if (logged === "duplicate") {
    return { status: 200, body: { ok: true, duplicate: true } };
  }

  try {
    let outcome: Outcome;
    if (!GRANT_EVENTS.has(event) && !REVOKE_EVENTS.has(event)) {
      outcome = "ignored_event";
    } else if (deps.productIds.length > 0 && (!productId || !deps.productIds.includes(productId))) {
      outcome = "other_product";
    } else if (!email) {
      outcome = "no_email";
    } else if (GRANT_EVENTS.has(event)) {
      await deps.store.grant({ email, orderId, productId });
      outcome = "granted";
    } else {
      outcome = (await deps.store.revoke(email)) ? "revoked" : "revoke_without_access";
    }

    await deps.store.setOutcome(dedupeKey, outcome);
    return { status: 200, body: { ok: true, outcome } };
  } catch {
    // Falhou no meio: apaga o registro para o reenvio da Cakto ser processado
    // de novo, e responde erro para que ela reenvie.
    await deps.store.forget(dedupeKey).catch(() => undefined);
    return { status: 500, body: { ok: false, error: "falha ao processar; a Cakto vai reenviar" } };
  }
}
