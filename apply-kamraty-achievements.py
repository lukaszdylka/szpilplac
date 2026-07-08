#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from pathlib import Path
from datetime import datetime
import shutil
import re

ROOT = Path(__file__).resolve().parent
BACKUP = ROOT / "_backup_kamraty_achievements"
BACKUP.mkdir(exist_ok=True)

BRIDGE = r"""/* Szpilplac kamraty-achievements-bridge.js v1 */
(function(){
  "use strict";
  var VERSION="v1";
  var AUTH_STORAGE_KEY="szpilplac-auth-v05";
  var KAMRAT_IDS={
    piyrszykamrat:1,kamraty:1,nawidoku:1,dobreslowo:1,przajawom:1,swojnaplacu:1,hersztbandy:1
  };
  var client=null;
  function root(path){return path;}
  function cfg(){return {url:window.SUPABASE_URL||(window.SZPILPLAC_CONFIG&&window.SZPILPLAC_CONFIG.SUPABASE_URL)||"",key:window.SUPABASE_ANON_KEY||(window.SZPILPLAC_CONFIG&&window.SZPILPLAC_CONFIG.SUPABASE_ANON_KEY)||""};}
  function loadScript(src,testFn){
    if(typeof testFn==="function"&&testFn())return Promise.resolve();
    return new Promise(function(resolve){
      var clean=src.split("?")[0];
      var existing=Array.prototype.slice.call(document.scripts||[]).find(function(s){return s.src&&s.src.indexOf(clean)!==-1;});
      if(existing){resolve();return;}
      var sc=document.createElement("script");sc.src=src;sc.async=false;sc.onload=resolve;sc.onerror=resolve;document.head.appendChild(sc);
    });
  }
  function getClient(){
    if(client)return client;
    if(window.__SZPILPLAC_SUPABASE_CLIENT){client=window.__SZPILPLAC_SUPABASE_CLIENT;return client;}
    if(!window.supabase)return null;
    var c=cfg();
    if(!c.url||!c.key)return null;
    client=window.supabase.createClient(c.url,c.key,{auth:{storageKey:AUTH_STORAGE_KEY,detectSessionInUrl:false,persistSession:true,autoRefreshToken:true}});
    window.__SZPILPLAC_SUPABASE_CLIENT=client;
    return client;
  }
  async function session(){
    var c=getClient(); if(!c)return null;
    try{var r=await c.auth.getSession();if(r&&r.data&&r.data.session)return r.data.session;}catch(e){}
    return null;
  }
  async function earnedMap(){
    var c=getClient(); var s=await session(); var out={};
    if(!c||!s)return out;
    try{
      var r=await c.rpc("szpilplac_my_achievements");
      (r.data||[]).forEach(function(a){
        var id=String(a.id||a.achievement_id||"");
        if(id&&a.earned_at)out[id]=a;
      });
    }catch(e){}
    return out;
  }
  async function ensureToast(){
    if(window.SZP_ACHIEVEMENT_TOAST&&window.SZP_ACHIEVEMENT_TOAST.showMany)return true;
    await loadScript(root("achievement-toast.js?v=125"),function(){return !!(window.SZP_ACHIEVEMENT_TOAST&&window.SZP_ACHIEVEMENT_TOAST.showMany);});
    return !!(window.SZP_ACHIEVEMENT_TOAST&&window.SZP_ACHIEVEMENT_TOAST.showMany);
  }
  async function checkAndToast(before){
    var c=getClient(); var s=await session();
    if(!c||!s)return;
    try{await c.rpc("szp_check_my_kamrat_achievements");}catch(e){}
    var after=await earnedMap();
    var fresh=[];
    Object.keys(after).forEach(function(id){
      if(KAMRAT_IDS[id]&&!before[id]&&after[id]){
        fresh.push({
          achievement_id:id,
          id:id,
          label:after[id].label,
          description:after[id].description,
          svg:after[id].svg,
          earned_at:after[id].earned_at,
          is_new:true
        });
      }
    });
    if(fresh.length){
      await ensureToast();
      if(window.SZP_ACHIEVEMENT_TOAST&&window.SZP_ACHIEVEMENT_TOAST.showMany)window.SZP_ACHIEVEMENT_TOAST.showMany(fresh);
      if(window.SZPILPLAC_REFRESH_ACHIEVEMENTS)try{window.SZPILPLAC_REFRESH_ACHIEVEMENTS();}catch(e){}
    }
  }
  document.addEventListener("click",async function(e){
    var b=e.target&&e.target.closest&&e.target.closest("[data-rank-follow],[data-rank-unfollow],[data-kamrat-remove],[data-kamrat-react],#publicProfileToggle");
    if(!b)return;
    var before=await earnedMap();
    setTimeout(function(){checkAndToast(before);},1200);
    setTimeout(function(){checkAndToast(before);},2800);
  },true);
  function boot(){
    setTimeout(async function(){
      var before=await earnedMap();
      checkAndToast(before);
    },1800);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
  console.info("Szpilplac kamraty-achievements-bridge.js "+VERSION);
})();
"""
SQL = r"""-- Szpilplac: odznaki za Kamratów z placu
-- Uruchom w Supabase SQL Editor.
-- Dodaje 7 odznak oraz automatyczne przyznawanie za akcje kamratowe.
-- Nie usuwa danych graczy.

begin;

-- Bezpiecznie utrzymujemy kolumnę profilu publicznego.
alter table public.profiles
  add column if not exists public_profile boolean not null default false;

-- Definicje odznak.
insert into public.szpilplac_achievements
  (id, label, description, sort_order, show_locked, svg)
values
  ('piyrszykamrat', 'Piyrszy kamrat', 'Dodaj pierwszego kamrata do swojej listy.', 31, true, $svg$<svg class="badge-svg" viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg">
  <path d="M28 58l-10 34 12-6 10 6-6-30z" fill="#3d7a55"/>
  <path d="M52 58l10 34-12-6-10 6 6-30z" fill="#3d7a55"/>
  <circle cx="40" cy="40" r="36" fill="#4a9a6a"/>
  <circle cx="40" cy="40" r="30" fill="none" stroke="#161310" stroke-width="1.3" opacity=".5"/>
  <g fill="none" stroke="#161310" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="47" cy="32" r="5.5"/>
    <path d="M38.5 51c0-5.2 3.8-8.8 8.5-8.8s8.5 3.6 8.5 8.8"/>
    <circle cx="33" cy="34" r="6" fill="#4a9a6a"/>
    <path d="M22 53c0-6 4.9-10 11-10s11 4 11 10" fill="#4a9a6a"/>
  </g>
</svg>$svg$),
  ('kamraty', 'Kamraty', 'Miej 5 kamratów naraz.', 32, true, $svg$<svg class="badge-svg" viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg">
  <path d="M28 58l-10 34 12-6 10 6-6-30z" fill="#9a6f3a"/>
  <path d="M52 58l10 34-12-6-10 6 6-30z" fill="#9a6f3a"/>
  <circle cx="40" cy="40" r="36" fill="#c49050"/>
  <circle cx="40" cy="40" r="30" fill="none" stroke="#161310" stroke-width="1.3" opacity=".5"/>
  <g fill="none" stroke="#161310" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="29" cy="31" r="5"/>
    <path d="M20.5 47c0-4.8 3.6-8 8.5-8 1.6 0 3 .3 4.3 1"/>
    <circle cx="51" cy="31" r="5"/>
    <path d="M59.5 47c0-4.8-3.6-8-8.5-8-1.6 0-3 .3-4.3 1"/>
    <circle cx="40" cy="35" r="6" fill="#c49050"/>
    <path d="M28.5 55c0-6.4 5.1-10.5 11.5-10.5S51.5 48.6 51.5 55" fill="#c49050"/>
  </g>
</svg>$svg$),
  ('nawidoku', 'Na widoku', 'Włącz profil publiczny.', 33, true, $svg$<svg class="badge-svg" viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg">
  <path d="M28 58l-10 34 12-6 10 6-6-30z" fill="#3d7a55"/>
  <path d="M52 58l10 34-12-6-10 6 6-30z" fill="#3d7a55"/>
  <circle cx="40" cy="40" r="36" fill="#4a9a6a"/>
  <circle cx="40" cy="40" r="30" fill="none" stroke="#161310" stroke-width="1.3" opacity=".5"/>
  <g fill="none" stroke="#161310" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="28" y="24" width="24" height="28" rx="2"/>
    <line x1="40" y1="24" x2="40" y2="52"/>
    <line x1="28" y1="37" x2="52" y2="37"/>
    <line x1="24" y1="56" x2="56" y2="56"/>
  </g>
</svg>$svg$),
  ('dobreslowo', 'Dobre słowo', 'Wyślij pierwszą reakcję kamratowi.', 34, true, $svg$<svg class="badge-svg" viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg">
  <path d="M28 58l-10 34 12-6 10 6-6-30z" fill="#3d7a55"/>
  <path d="M52 58l10 34-12-6-10 6 6-30z" fill="#3d7a55"/>
  <circle cx="40" cy="40" r="36" fill="#4a9a6a"/>
  <circle cx="40" cy="40" r="30" fill="none" stroke="#161310" stroke-width="1.3" opacity=".5"/>
  <path d="M29 25h22a4 4 0 014 4v15a4 4 0 01-4 4H39l-8 8v-8h-2a4 4 0 01-4-4V29a4 4 0 014-4z"
        fill="none" stroke="#161310" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M40 43.5c-4.6-3.4-7-5.8-7-8.8a3.9 3.9 0 017-2.4 3.9 3.9 0 017 2.4c0 3-2.4 5.4-7 8.8z"
        fill="#161310"/>
</svg>$svg$),
  ('przajawom', 'Przaja Wom', 'Wyślij wszystkie 5 rodzajów reakcji — każdą innego dnia.', 35, true, $svg$<svg class="badge-svg" viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg">
  <path d="M28 58l-10 34 12-6 10 6-6-30z" fill="#9a6f3a"/>
  <path d="M52 58l10 34-12-6-10 6 6-30z" fill="#9a6f3a"/>
  <circle cx="40" cy="40" r="36" fill="#c49050"/>
  <circle cx="40" cy="40" r="30" fill="none" stroke="#161310" stroke-width="1.3" opacity=".5"/>
  <path d="M40 55c-7.4-5.5-11.5-9.7-11.5-14.7a6.3 6.3 0 0111.5-3.6 6.3 6.3 0 0111.5 3.6c0 5-4.1 9.2-11.5 14.7z"
        fill="none" stroke="#161310" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <g stroke="#161310" stroke-width="2" stroke-linecap="round">
    <line x1="40" y1="19" x2="40" y2="25"/>
    <line x1="27" y1="23" x2="30.5" y2="27.5"/>
    <line x1="53" y1="23" x2="49.5" y2="27.5"/>
    <line x1="19" y1="34" x2="24.5" y2="35.5"/>
    <line x1="61" y1="34" x2="55.5" y2="35.5"/>
  </g>
</svg>$svg$),
  ('swojnaplacu', 'Swój na placu', 'Ktoś dodał Cię do swoich kamratów.', 36, true, $svg$<svg class="badge-svg" viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg">
  <path d="M28 58l-10 34 12-6 10 6-6-30z" fill="#3d7a55"/>
  <path d="M52 58l10 34-12-6-10 6 6-30z" fill="#3d7a55"/>
  <circle cx="40" cy="40" r="36" fill="#4a9a6a"/>
  <circle cx="40" cy="40" r="30" fill="none" stroke="#161310" stroke-width="1.3" opacity=".5"/>
  <g fill="none" stroke="#161310" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="37" cy="34" r="6"/>
    <path d="M25.5 55c0-6.6 5.1-11 11.5-11S48.5 48.4 48.5 55"/>
  </g>
  <path d="M53 19l1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6z" fill="#161310"/>
</svg>$svg$),
  ('hersztbandy', 'Herszt bandy', 'Otrzymaj łącznie 10 reakcji od innych graczy.', 37, true, $svg$<svg class="badge-svg" viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg">
  <path d="M28 58l-10 34 12-6 10 6-6-30z" fill="#9a6f3a"/>
  <path d="M52 58l10 34-12-6-10 6 6-30z" fill="#9a6f3a"/>
  <circle cx="40" cy="40" r="36" fill="#c49050"/>
  <circle cx="40" cy="40" r="30" fill="none" stroke="#161310" stroke-width="1.3" opacity=".5"/>
  <path d="M26.5 49L23.5 34l8.5 6.5L40 28.5 48 40.5l8.5-6.5-3 15z"
        fill="none" stroke="#161310" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="26.5" y1="54" x2="53.5" y2="54" stroke="#161310" stroke-width="2" stroke-linecap="round"/>
  <circle cx="23.5" cy="31" r="2" fill="#161310"/>
  <circle cx="40" cy="25.5" r="2" fill="#161310"/>
  <circle cx="56.5" cy="31" r="2" fill="#161310"/>
</svg>$svg$)
on conflict (id) do update set
  label = excluded.label,
  description = excluded.description,
  sort_order = excluded.sort_order,
  show_locked = excluded.show_locked,
  svg = excluded.svg;

-- Prywatny helper do przyznawania odznak bez dublowania.
create or replace function public.szp_grant_achievement(
  p_user_id uuid,
  p_achievement_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or p_achievement_id is null then
    return;
  end if;

  insert into public.szpilplac_user_achievements
    (user_id, achievement_id, earned_at)
  select
    p_user_id,
    p_achievement_id,
    now()
  where not exists (
    select 1
    from public.szpilplac_user_achievements ua
    where ua.user_id = p_user_id
      and ua.achievement_id = p_achievement_id
  );
end;
$$;

revoke all on function public.szp_grant_achievement(uuid,text) from public, anon, authenticated;

drop function if exists public.szp_check_kamrat_achievements(uuid);

create function public.szp_check_kamrat_achievements(
  p_user_id uuid
)
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
set search_path = public
as $$
declare
  v_before_ids text[];
  v_reaction_type_days integer := 0;
begin
  if p_user_id is null then
    return;
  end if;

  select coalesce(array_agg(ua.achievement_id), array[]::text[])
  into v_before_ids
  from public.szpilplac_user_achievements ua
  where ua.user_id = p_user_id;

  -- 31. Piyrszy kamrat — dodaj pierwszego kamrata.
  if exists (
    select 1 from public.szpilplac_kamraty k
    where k.follower_id = p_user_id
  ) then
    perform public.szp_grant_achievement(p_user_id, 'piyrszykamrat');
  end if;

  -- 32. Kamraty — miej 5 kamratów naraz.
  if (
    select count(distinct k.followed_id)
    from public.szpilplac_kamraty k
    where k.follower_id = p_user_id
  ) >= 5 then
    perform public.szp_grant_achievement(p_user_id, 'kamraty');
  end if;

  -- 33. Na widoku — profil publiczny.
  if exists (
    select 1 from public.profiles p
    where p.id = p_user_id
      and p.public_profile is true
  ) then
    perform public.szp_grant_achievement(p_user_id, 'nawidoku');
  end if;

  -- 34. Dobre słowo — pierwsza reakcja.
  if exists (
    select 1 from public.szpilplac_reactions r
    where r.reactor_id = p_user_id
  ) then
    perform public.szp_grant_achievement(p_user_id, 'dobreslowo');
  end if;

  -- 35. Przaja Wom — wszystkie 5 rodzajów reakcji, każda liczona z innego dnia.
  select count(*)
  into v_reaction_type_days
  from (
    select
      r.reaction,
      min(r.reaction_date) as first_day
    from public.szpilplac_reactions r
    where r.reactor_id = p_user_id
      and r.reaction in ('Fest!','Przaja Ci!','Dobro robota!','Gonia Cie!','Gowa paruje!')
    group by r.reaction
  ) x;

  if v_reaction_type_days = 5 and (
    select count(distinct x.first_day)
    from (
      select
        r.reaction,
        min(r.reaction_date) as first_day
      from public.szpilplac_reactions r
      where r.reactor_id = p_user_id
        and r.reaction in ('Fest!','Przaja Ci!','Dobro robota!','Gonia Cie!','Gowa paruje!')
      group by r.reaction
    ) x
  ) = 5 then
    perform public.szp_grant_achievement(p_user_id, 'przajawom');
  end if;

  -- 36. Swój na placu — ktoś dodał mnie do kamratów.
  if exists (
    select 1 from public.szpilplac_kamraty k
    where k.followed_id = p_user_id
  ) then
    perform public.szp_grant_achievement(p_user_id, 'swojnaplacu');
  end if;

  -- 37. Herszt bandy — łącznie 10 reakcji od innych graczy.
  if (
    select count(*)
    from public.szpilplac_reactions r
    where r.target_id = p_user_id
  ) >= 10 then
    perform public.szp_grant_achievement(p_user_id, 'hersztbandy');
  end if;

  return query
  select
    a.id::text as achievement_id,
    a.id::text as id,
    a.label::text as label,
    a.description::text as description,
    a.svg::text as svg,
    ua.earned_at as earned_at,
    not (a.id = any(v_before_ids)) as is_new
  from public.szpilplac_achievements a
  join public.szpilplac_user_achievements ua
    on ua.achievement_id = a.id
   and ua.user_id = p_user_id
  where a.id in ('piyrszykamrat','kamraty','nawidoku','dobreslowo','przajawom','swojnaplacu','hersztbandy')
  order by a.sort_order, a.id;
end;
$$;

revoke all on function public.szp_check_kamrat_achievements(uuid) from public, anon, authenticated;

drop function if exists public.szp_check_my_kamrat_achievements();

create function public.szp_check_my_kamrat_achievements()
returns table(
  achievement_id text,
  id text,
  label text,
  description text,
  svg text,
  earned_at timestamptz,
  is_new boolean
)
language sql
security definer
set search_path = public
as $$
  select *
  from public.szp_check_kamrat_achievements(auth.uid())
$$;

grant execute on function public.szp_check_my_kamrat_achievements() to authenticated;

-- Trigger: dodanie kamrata przyznaje odznaki dodającemu i osobie dodanej.
create or replace function public.szp_kamraty_achievements_follow_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.szp_check_kamrat_achievements(new.follower_id);
  perform public.szp_check_kamrat_achievements(new.followed_id);
  return new;
end;
$$;

drop trigger if exists szp_kamraty_achievements_after_follow on public.szpilplac_kamraty;

create trigger szp_kamraty_achievements_after_follow
after insert on public.szpilplac_kamraty
for each row
execute function public.szp_kamraty_achievements_follow_trg();

-- Trigger: reakcja przyznaje odznaki wysyłającemu i odbiorcy.
create or replace function public.szp_kamraty_achievements_reaction_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.szp_check_kamrat_achievements(new.reactor_id);
  perform public.szp_check_kamrat_achievements(new.target_id);
  return new;
end;
$$;

drop trigger if exists szp_kamraty_achievements_after_reaction on public.szpilplac_reactions;

create trigger szp_kamraty_achievements_after_reaction
after insert or update on public.szpilplac_reactions
for each row
execute function public.szp_kamraty_achievements_reaction_trg();

-- Trigger: włączenie profilu publicznego.
create or replace function public.szp_kamraty_achievements_profile_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.public_profile is true then
    perform public.szp_check_kamrat_achievements(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists szp_kamraty_achievements_after_profile on public.profiles;

create trigger szp_kamraty_achievements_after_profile
after update of public_profile on public.profiles
for each row
execute function public.szp_kamraty_achievements_profile_trg();

-- Backfill dla osób, które już spełniają warunki.
do $$
declare
  u uuid;
begin
  for u in
    select distinct user_id from (
      select follower_id as user_id from public.szpilplac_kamraty
      union
      select followed_id as user_id from public.szpilplac_kamraty
      union
      select reactor_id as user_id from public.szpilplac_reactions
      union
      select target_id as user_id from public.szpilplac_reactions
      union
      select id as user_id from public.profiles where public_profile is true
    ) q
    where user_id is not null
  loop
    perform public.szp_check_kamrat_achievements(u);
  end loop;
end $$;

commit;

-- Kontrola po uruchomieniu:
select id, label, sort_order, show_locked
from public.szpilplac_achievements
where id in ('piyrszykamrat','kamraty','nawidoku','dobreslowo','przajawom','swojnaplacu','hersztbandy')
order by sort_order;

select
  proname,
  position('Europe/Warsaw' in pg_get_functiondef(p.oid)) > 0 as has_warsaw_timezone
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'szpilplac_check_achievement_event',
    'szpilplac_repair_user_daily_achievements',
    'szpilplac_repair_my_daily_achievements',
    'szp_check_my_kamrat_achievements'
  )
order by proname;
"""

NEW_LOCKED = [
    "piyrszykamrat",
    "kamraty",
    "nawidoku",
    "dobreslowo",
    "przajawom",
    "swojnaplacu",
    "hersztbandy",
]

def backup(path: Path):
    if path.exists():
        out = BACKUP / (path.as_posix().replace("/", "__") + "." + datetime.now().strftime("%Y%m%d-%H%M%S") + ".bak")
        shutil.copy2(path, out)

def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")

def write(path: Path, content: str):
    backup(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print("OK:", path)

def patch_achievements_panel():
    path = ROOT / "achievements-panel.js"
    if not path.exists():
        print("Pominięto achievements-panel.js — brak pliku")
        return
    text = read(path)
    old = text

    # Dopisz nowe odznaki do widocznych zablokowanych, jeśli SQL/RPC nie poda show_locked.
    marker = "ranga_zeflik:1"
    if marker in text and "piyrszykamrat:1" not in text:
        addition = marker + ",\n" + "\n".join("    " + x + ":1," for x in NEW_LOCKED).rstrip(",")
        text = text.replace(marker, addition, 1)

    text = text.replace("Szpilplac achievements-panel.js v126", "Szpilplac achievements-panel.js v127")

    if text != old:
        write(path, text)
    else:
        print("Bez zmian:", path)

def patch_html_script(path: Path):
    if not path.exists():
        print("Pominięto, brak:", path)
        return
    text = read(path)
    old = text

    # Upewnij się, że kamraty są na v4.
    text = re.sub(r'kamraty\.js\?v=\d+', 'kamraty.js?v=4', text)

    # Dodaj mostek odznak po kamraty.js.
    if "kamraty-achievements-bridge.js" not in text:
        text = re.sub(
            r'(<script src="(?:\.\./)?kamraty\.js\?v=4"></script>)',
            r'\1\n<script src="kamraty-achievements-bridge.js?v=1"></script>',
            text,
            count=1
        )

    # Konto ma panel odznak — podbij cache.
    text = re.sub(r'achievements-panel\.js\?v=\d+', 'achievements-panel.js?v=127', text)

    if text != old:
        write(path, text)
    else:
        print("Bez zmian:", path)

def patch_gitignore():
    path = ROOT / ".gitignore"
    text = read(path) if path.exists() else ""
    if "_backup_*/" not in text:
        write(path, text.rstrip() + "\n\n# Local patch backups\n_backup_*/\n*.bak\n")

def main():
    write(ROOT / "kamraty-achievements-bridge.js", BRIDGE)
    write(ROOT / "sql" / "kamraty-achievements.sql", SQL)
    patch_achievements_panel()

    patch_html_script(ROOT / "konto.html")
    patch_html_script(ROOT / "ranking.html")
    patch_html_script(ROOT / "gracz.html")

    patch_gitignore()

    print()
    print("Gotowe.")
    print("1. Commit/push.")
    print("2. W Supabase SQL Editor uruchom: sql/kamraty-achievements.sql")
    print("3. Odśwież konto.html przez Ctrl+F5.")

if __name__ == "__main__":
    main()
