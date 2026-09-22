-- ============================================================================
-- Biblioteca Virtus — esquema inicial
--
-- Tudo que decide permissão vive aqui: RLS nas tabelas, políticas no storage e
-- funções SECURITY DEFINER para as operações que o cliente não pode executar
-- diretamente (contador de downloads e métricas administrativas).
-- O frontend nunca é a fonte de autorização.
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  display_name text not null default '',
  avatar_url   text,
  role         text not null default 'user' check (role in ('user', 'admin')),
  created_at   timestamptz not null default now()
);

comment on column public.profiles.role is
  'Somente alterável por service_role ou por SQL. Ver GRANTs de coluna abaixo.';

-- ----------------------------------------------------------------------------
-- content — wallpapers e widgets na mesma tabela, sem categorias
-- ----------------------------------------------------------------------------
create table public.content (
  id             uuid primary key default gen_random_uuid(),
  title          text not null check (char_length(btrim(title)) between 1 and 120),
  type           text not null check (type in ('wallpaper', 'widget')),
  -- caminho do objeto no bucket privado content-originals
  file_url       text not null,
  -- URL pública do thumbnail no bucket content-thumbnails
  thumbnail_url  text,
  width          integer check (width > 0),
  height         integer check (height > 0),
  file_size      bigint check (file_size >= 0),
  mime_type      text,
  -- SHA-256 do arquivo original: impede o mesmo arquivo de entrar duas vezes
  checksum       text,
  download_count integer not null default 0 check (download_count >= 0),
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index content_checksum_key on public.content (checksum) where checksum is not null;
create index content_created_at_idx     on public.content (created_at desc);
create index content_type_created_idx   on public.content (type, created_at desc);
create index content_downloads_idx      on public.content (download_count desc);
create index content_title_trgm_idx     on public.content using gin (lower(title) gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- favorites / downloads
-- ----------------------------------------------------------------------------
create table public.favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  content_id uuid not null references public.content (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, content_id)
);
create index favorites_user_idx    on public.favorites (user_id, created_at desc);
create index favorites_content_idx on public.favorites (content_id);

create table public.downloads (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  content_id uuid not null references public.content (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index downloads_user_idx    on public.downloads (user_id, created_at desc);
create index downloads_content_idx on public.downloads (content_id);

-- ----------------------------------------------------------------------------
-- funções auxiliares
-- ----------------------------------------------------------------------------

-- SECURITY DEFINER para que a checagem de admin não dependa das políticas da
-- própria tabela profiles (evita recursão em RLS).
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger content_touch_updated_at
  before update on public.content
  for each row execute function public.touch_updated_at();

-- Registra o download e incrementa o contador numa única transação.
-- É o único caminho para download_count mudar: usuários não têm UPDATE em content.
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

-- Métricas administrativas em uma chamada só. A checagem de papel acontece
-- aqui dentro: sem ela, a função não retorna nada.
create or replace function public.admin_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare result json;
begin
  if not public.is_admin() then
    raise exception 'acesso restrito a administradores' using errcode = '42501';
  end if;

  select json_build_object(
    'wallpapers',      (select count(*) from public.content where type = 'wallpaper'),
    'widgets',         (select count(*) from public.content where type = 'widget'),
    'users',           (select count(*) from public.profiles),
    'downloads',       (select count(*) from public.downloads),
    'favorites',       (select count(*) from public.favorites),
    'most_downloaded', (
      select coalesce(json_agg(t), '[]'::json) from (
        select c.id, c.title, c.type, c.thumbnail_url, c.download_count
          from public.content c
         where c.download_count > 0
         order by c.download_count desc, c.created_at desc
         limit 8
      ) t
    ),
    'most_favorited', (
      select coalesce(json_agg(t), '[]'::json) from (
        select c.id, c.title, c.type, c.thumbnail_url, count(f.id) as favorite_count
          from public.content c
          join public.favorites f on f.content_id = c.id
         group by c.id
         order by count(f.id) desc, c.created_at desc
         limit 8
      ) t
    ),
    'recent', (
      select coalesce(json_agg(t), '[]'::json) from (
        select c.id, c.title, c.type, c.thumbnail_url, c.created_at
          from public.content c
         order by c.created_at desc
         limit 8
      ) t
    )
  ) into result;

  return result;
end;
$$;

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.profiles  enable row level security;
alter table public.content   enable row level security;
alter table public.favorites enable row level security;
alter table public.downloads enable row level security;

-- profiles: cada um vê e edita o próprio; admin vê todos
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Escalonamento de papel bloqueado no nível de privilégio de coluna:
-- mesmo com a policy de UPDATE acima, role e email não são atualizáveis.
revoke update on public.profiles from authenticated;
grant  update (display_name, avatar_url) on public.profiles to authenticated;

-- content: leitura aberta (a biblioteca é navegável sem conta);
-- escrita apenas para admin
create policy content_select_all on public.content
  for select to anon, authenticated using (true);

create policy content_insert_admin on public.content
  for insert to authenticated with check (public.is_admin());

create policy content_update_admin on public.content
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy content_delete_admin on public.content
  for delete to authenticated using (public.is_admin());

-- download_count não é editável pelo cliente nem por admin via UPDATE direto
revoke update on public.content from authenticated;
grant  update (title, type, file_url, thumbnail_url, width, height, file_size, mime_type, checksum)
  on public.content to authenticated;

-- favorites: cada usuário manda apenas nas próprias linhas
create policy favorites_select_own on public.favorites
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy favorites_insert_own on public.favorites
  for insert to authenticated with check (user_id = auth.uid());

create policy favorites_delete_own on public.favorites
  for delete to authenticated using (user_id = auth.uid());

-- downloads: o registro entra pela função register_download; leitura é própria
create policy downloads_select_own on public.downloads
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- storage
--   content-originals  privado  — arquivo íntegro, entregue por URL assinada
--   content-thumbnails público  — prévias leves para as listagens
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('content-originals',  'content-originals',  false, 41943040,
   array['image/png','image/jpeg','image/webp','image/heic','image/heif']),
  ('content-thumbnails', 'content-thumbnails', true,   2097152,
   array['image/webp','image/jpeg','image/png'])
on conflict (id) do nothing;

create policy storage_originals_read_authenticated on storage.objects
  for select to authenticated using (bucket_id = 'content-originals');

create policy storage_originals_write_admin on storage.objects
  for insert to authenticated with check (bucket_id = 'content-originals' and public.is_admin());

create policy storage_originals_update_admin on storage.objects
  for update to authenticated using (bucket_id = 'content-originals' and public.is_admin());

create policy storage_originals_delete_admin on storage.objects
  for delete to authenticated using (bucket_id = 'content-originals' and public.is_admin());

create policy storage_thumbnails_read_public on storage.objects
  for select to anon, authenticated using (bucket_id = 'content-thumbnails');

create policy storage_thumbnails_write_admin on storage.objects
  for insert to authenticated with check (bucket_id = 'content-thumbnails' and public.is_admin());

create policy storage_thumbnails_update_admin on storage.objects
  for update to authenticated using (bucket_id = 'content-thumbnails' and public.is_admin());

create policy storage_thumbnails_delete_admin on storage.objects
  for delete to authenticated using (bucket_id = 'content-thumbnails' and public.is_admin());
