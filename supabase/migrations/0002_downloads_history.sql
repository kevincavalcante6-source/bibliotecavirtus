-- ============================================================================
-- Histórico de downloads editável pela própria pessoa
--
-- Tirar um item de "Meus downloads" não apaga o registro: marca hidden_at.
-- Assim a contagem de downloads continua real — o admin segue vendo todos, e
-- content.download_count nunca diminui porque alguém limpou a própria lista.
-- ============================================================================

alter table public.downloads add column hidden_at timestamptz;

create index downloads_user_visible_idx
  on public.downloads (user_id, created_at desc)
  where hidden_at is null;

create policy downloads_hide_own on public.downloads
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- A única coluna que a pessoa pode mudar é hidden_at: nem user_id, nem
-- content_id, nem a data do download.
revoke update on public.downloads from authenticated;
grant update (hidden_at) on public.downloads to authenticated;

-- Editar e excluir conteúdo já estão cobertos pela 0001: as políticas
-- content_update_admin e content_delete_admin, o privilégio de coluna em
-- title e type, e as políticas de exclusão nos dois buckets de storage.
