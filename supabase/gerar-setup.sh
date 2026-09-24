#!/usr/bin/env sh
# Junta as migrações num arquivo só (setup-completo.sql), para colar de uma vez
# no SQL Editor do Supabase. Rode de novo sempre que uma migração mudar.
set -e
cd "$(dirname "$0")"
{
  cat <<'HEAD'
-- =============================================================================
-- BIBLIOTECA VIRTUS — configuração completa do banco (arquivo único)
--
-- Como usar: Supabase → SQL Editor → New query → cole TUDO → Run.
-- Rode UMA vez, num projeto novo.
--
-- Tudo roda dentro de uma transação: se algo der erro no meio, nada fica pela
-- metade — o banco volta ao estado de antes. Rodar de novo num projeto já
-- configurado dá erro ("already exists") e também não altera nada.
--
-- Gerado automaticamente a partir de supabase/migrations/ por gerar-setup.sh.
-- Não edite aqui: edite a migração e gere de novo.
-- =============================================================================

begin;
HEAD
  for f in migrations/*.sql; do
    printf '\n\n-- #############################################################################\n'
    printf -- '-- %s\n' "$f"
    printf -- '-- #############################################################################\n\n'
    cat "$f"
  done
  printf '\n\ncommit;\n'
} > setup-completo.sql
echo "setup-completo.sql gerado a partir de: $(ls migrations/*.sql | tr '\n' ' ')"
