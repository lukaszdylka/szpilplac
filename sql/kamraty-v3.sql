-- Szpilplac Kamraty v3
-- Funkcja do licznika reakcji na profilu publicznym.
-- Uruchom w Supabase SQL Editor.

begin;

create or replace function public.szp_public_player_reactions(p_target_id uuid)
returns table(
  my_reaction_today text,
  reaction_counts jsonb
)
language sql
security definer
set search_path = public, auth
as $$
  select
    (
      select rr.reaction
      from public.szpilplac_reactions rr
      where rr.reactor_id = auth.uid()
        and rr.target_id = p_target_id
        and rr.reaction_date = timezone('Europe/Warsaw', now())::date
      limit 1
    ) as my_reaction_today,
    coalesce((
      select jsonb_object_agg(x.reaction, x.cnt)
      from (
        select r.reaction, count(*)::integer as cnt
        from public.szpilplac_reactions r
        join public.profiles p on p.id = r.target_id
        where r.target_id = p_target_id
          and coalesce(p.public_profile,false) is true
          and r.reaction_date = timezone('Europe/Warsaw', now())::date
        group by r.reaction
      ) x
    ), '{}'::jsonb) as reaction_counts;
$$;

grant execute on function public.szp_public_player_reactions(uuid) to anon, authenticated;

commit;
