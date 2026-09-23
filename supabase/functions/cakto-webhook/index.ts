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
import { handleCaktoWebhook, type Store } from "./handler.ts";

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
