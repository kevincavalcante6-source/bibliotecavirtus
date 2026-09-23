-- ============================================================================
-- Acesso exclusivo para quem comprou
--
-- A venda acontece fora do site, no checkout da Cakto. Quando a compra é
-- aprovada, a Cakto avisa a função cakto-webhook, que libera o e-mail do
-- comprador em `entitlements`. Reembolso e chargeback revogam.
--
-- A liberação é por e-mail, não por conta: a pessoa compra antes de ter
-- cadastro, e o acesso passa a valer assim que ela entra com aquele e-mail.
-- Só conta e-mail CONFIRMADO — sem isso, qualquer um poderia criar conta com
-- o e-mail de um comprador e herdar o acesso dele.
-- ============================================================================

create table public.entitlements (
  email       text primary key check (email = lower(btrim(email)) and email <> ''),
  status      text not null check (status in ('active', 'revoked')),
  source      text not null default 'cakto' check (source in ('cakto', 'manual')),
  order_id    text,
  product_id  text,
  granted_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  updated_at  timestamptz not null default now()
);

-- Todo aviso recebido da Cakto fica registrado, cru, antes de qualquer
-- decisão. Serve para depurar a integração e impede processar duas vezes o
-- mesmo evento reenviado.
create table public.cakto_events (
  id          bigint generated always as identity primary key,
  dedupe_key  text not null unique,
  event       text not null,
  email       text,
  order_id    text,
  product_id  text,
  outcome     text,
  payload     jsonb not null,
  received_at timestamptz not null default now()
);
create index cakto_events_received_idx on public.cakto_events (received_at desc);

-- Nenhuma das duas é escrita pelo cliente: só a função do webhook (com
-- service_role) e o SQL Editor. Admin consegue ler, para acompanhar.
alter table public.entitlements enable row level security;
alter table public.cakto_events enable row level security;

create policy entitlements_admin_read on public.entitlements
  for select to authenticated using (public.is_admin());

create policy cakto_events_admin_read on public.cakto_events
  for select to authenticated using (public.is_admin());

revoke insert, update, delete on public.entitlements from anon, authenticated;
revoke insert, update, delete on public.cakto_events from anon, authenticated;

-- ----------------------------------------------------------------------------
-- has_access: admin, ou e-mail confirmado com compra ativa
-- ----------------------------------------------------------------------------
create or replace function public.has_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    public.is_admin(auth.uid())
    or exists (
      select 1
        from auth.users u
        join public.entitlements e on e.email = lower(u.email)
       where u.id = auth.uid()
         and u.email_confirmed_at is not null
         and e.status = 'active'
    )
  );
$$;

-- ----------------------------------------------------------------------------
-- O acervo inteiro passa a exigir acesso
-- (select ...) em volta da função faz o Postgres avaliar uma vez por consulta,
-- não uma vez por linha.
-- ----------------------------------------------------------------------------
drop policy content_select_all on public.content;
create policy content_select_entitled on public.content
  for select to authenticated using ((select public.has_access()));

drop policy storage_originals_read_authenticated on storage.objects;
create policy storage_originals_read_entitled on storage.objects
  for select to authenticated
  using (bucket_id = 'content-originals' and (select public.has_access()));

drop policy favorites_insert_own on public.favorites;
create policy favorites_insert_own on public.favorites
  for insert to authenticated
  with check (user_id = auth.uid() and (select public.has_access()));

-- Download também exige acesso, dentro da própria função.
create or replace function public.register_download(p_content_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_total integer;
begin
  if v_user is null then
    raise exception 'autenticação necessária' using errcode = '28000';
  end if;

  if not public.has_access() then
    raise exception 'acesso não liberado' using errcode = '42501';
  end if;

  insert into public.downloads (user_id, content_id) values (v_user, p_content_id);

  update public.content
     set download_count = download_count + 1
   where id = p_content_id
   returning download_count into v_total;

  if v_total is null then
    raise exception 'conteúdo não encontrado' using errcode = 'P0002';
  end if;

  return v_total;
end;
$$;

-- Os thumbnails continuam num bucket público, com nomes derivados de hash:
-- ninguém descobre o endereço sem ler a tabela content, que agora exige acesso.
-- O arquivo original segue no bucket privado, entregue por URL assinada.
