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

commit;
