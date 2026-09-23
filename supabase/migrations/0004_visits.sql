-- =============================================================================
-- Selo "Novo": o que foi publicado depois da visita anterior de cada pessoa.
--
-- A data vive no perfil (servidor), não no aparelho: quem vê no celular e
-- depois no computador vê o mesmo selo. Uma visita dura enquanto houver
-- atividade com menos de 30 minutos de intervalo; a primeira visita não tem
-- "anterior", então ninguém começa com a biblioteca inteira marcada como nova.
-- =============================================================================

alter table public.profiles
  add column if not exists last_visit_at timestamptz,
  add column if not exists previous_visit_at timestamptz;

-- As colunas não entram no grant de update do perfil (0001): só a função
-- abaixo escreve nelas.

create or replace function public.register_visit()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last timestamptz;
  v_previous timestamptz;
begin
  if auth.uid() is null then
    return null;
  end if;

  select last_visit_at, previous_visit_at
    into v_last, v_previous
    from public.profiles
   where id = auth.uid()
   for update;

  if not found then
    return null;
  end if;

  -- Nova visita: a última vira a anterior.
  if v_last is null or now() - v_last > interval '30 minutes' then
    update public.profiles
       set previous_visit_at = v_last,
           last_visit_at = now()
     where id = auth.uid();
    return v_last;
  end if;

  -- Mesma visita: só estende.
  update public.profiles
     set last_visit_at = now()
   where id = auth.uid();
  return v_previous;
end;
$$;

revoke execute on function public.register_visit() from public, anon;
grant execute on function public.register_visit() to authenticated;
