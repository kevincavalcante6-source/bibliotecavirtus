#!/usr/bin/env sh
# Junta a função cakto-webhook num arquivo só (cakto-webhook-painel.ts), para
# colar no editor de Edge Functions do painel do Supabase, sem terminal.
# Rode de novo sempre que handler.ts ou index.ts mudarem.
set -e
cd "$(dirname "$0")"
src=functions/cakto-webhook
{
  cat <<'HEAD'
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

HEAD
  grep -v '^import { handleCaktoWebhook' "$src/index.ts"
  printf '\n// ---------------------------------------------------------------- lógica --\n\n'
  cat "$src/handler.ts"
} > cakto-webhook-painel.ts
echo "Gerado: supabase/cakto-webhook-painel.ts"
