-- Szpilplac: wycofanie Kamratów z placu i ich odznak
-- Zastosowano na projekcie produkcyjnym 2026-09-10.
-- Historyczne relacje, reakcje i zdobyte odznaki pozostają w bazie.

begin;

update public.szpilplac_achievements
set is_active = false,
    updated_at = now()
where id in (
  'piyrszykamrat',
  'kamraty',
  'nawidoku',
  'dobreslowo',
  'przajawom',
  'swojnaplacu',
  'hersztbandy'
);

alter table public.profiles
  disable trigger szp_kamraty_achievements_after_profile;

alter table public.szpilplac_kamraty
  disable trigger szp_kamraty_achievements_after_follow;

alter table public.szpilplac_reactions
  disable trigger szp_kamraty_achievements_after_reaction;

create or replace function public.szp_check_kamrat_achievements(p_user_id uuid)
returns table(
  achievement_id text,
  id text,
  label text,
  description text,
  svg text,
  earned_at timestamptz,
  is_new boolean
)
language plpgsql
security definer
set search_path to 'public', 'auth'
as $$
begin
  return;
end;
$$;

-- Stare endpointy społecznościowe zostają w schemacie jako historia,
-- ale nie są już dostępne dla klienta publicznego ani zalogowanych graczy.
revoke execute on function public.szp_check_kamrat_achievements(uuid) from public, anon, authenticated;
revoke execute on function public.szp_check_my_kamrat_achievements() from public, anon, authenticated;
revoke execute on function public.szp_compare_with_player(uuid) from public, anon, authenticated;
revoke execute on function public.szp_follow_player(uuid) from public, anon, authenticated;
revoke execute on function public.szp_my_kamraty() from public, anon, authenticated;
revoke execute on function public.szp_my_reaction_summary() from public, anon, authenticated;
revoke execute on function public.szp_public_player_reactions(uuid) from public, anon, authenticated;
revoke execute on function public.szp_public_reaction_summary(uuid) from public, anon, authenticated;
revoke execute on function public.szp_send_reaction(uuid, text) from public, anon, authenticated;
revoke execute on function public.szp_unfollow_player(uuid) from public, anon, authenticated;
revoke execute on function public.szp_kamraty_achievements_follow_trg() from public, anon, authenticated;
revoke execute on function public.szp_kamraty_achievements_profile_trg() from public, anon, authenticated;
revoke execute on function public.szp_kamraty_achievements_reaction_trg() from public, anon, authenticated;

commit;
