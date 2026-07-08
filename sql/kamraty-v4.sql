-- Szpilplac Kamraty v4
-- Reakcje tylko dla kamratów + publiczny licznik reakcji.
-- Uruchom w Supabase SQL Editor po wgraniu plików v4.

begin;

create or replace function public.szp_send_reaction(p_target_id uuid, p_reaction text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  today date := timezone('Europe/Warsaw', now())::date;
begin
  if auth.uid() is null then
    raise exception 'Najpierw zaloguj się na konto.';
  end if;

  if p_target_id = auth.uid() then
    raise exception 'Nie możesz reagować na własny profil.';
  end if;

  if p_reaction not in ('Fest!','Przaja Ci!','Dobro robota!','Gonia Cie!','Gowa paruje!') then
    raise exception 'Nieznana reakcja.';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_target_id and coalesce(p.public_profile,false) is true
  ) then
    raise exception 'Ten profil nie jest publiczny.';
  end if;

  if not exists (
    select 1 from public.szpilplac_kamraty k
    where k.follower_id = auth.uid()
      and k.followed_id = p_target_id
  ) then
    raise exception 'Reakcje można dawać tylko kamratom z placu.';
  end if;

  insert into public.szpilplac_reactions(reactor_id,target_id,reaction,reaction_date)
  values (auth.uid(), p_target_id, p_reaction, today)
  on conflict (reactor_id, target_id, reaction_date)
  do update set reaction = excluded.reaction, created_at = now();

  return true;
end;
$$;

create or replace function public.szp_public_player_reactions(p_player_id uuid)
returns table(reaction_counts jsonb)
language sql
security definer
set search_path = public, auth
as $$
  select coalesce((
    select jsonb_object_agg(x.reaction, x.cnt)
    from (
      select r.reaction, count(*)::integer as cnt
      from public.szpilplac_reactions r
      join public.profiles p on p.id = r.target_id
      where r.target_id = p_player_id
        and coalesce(p.public_profile,false) is true
        and r.reaction_date = timezone('Europe/Warsaw', now())::date
      group by r.reaction
    ) x
  ), '{}'::jsonb) as reaction_counts;
$$;

grant execute on function public.szp_send_reaction(uuid,text) to authenticated;
grant execute on function public.szp_public_player_reactions(uuid) to anon, authenticated;

commit;

-- Kontrola:
-- select * from public.szp_public_player_reactions('<ID_GRACZA>'::uuid);
