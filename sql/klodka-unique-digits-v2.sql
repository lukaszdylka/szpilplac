-- Kłōdka v2 — cztery różne cyfry
-- Start nowych zasad: Kłōdka #93 (23.09.2026).
-- Historyczne dni #1–#92 pozostają bez zmian.
-- Kolejność przyszłych kodów jest losowana w bazie; ten plik nie ujawnia mapowania dzień → kod.

begin;

do $$
declare
  v_count integer;
  v_min integer;
  v_max integer;
  v_invalid integer;
begin
  select
    count(*),
    min(idx),
    max(idx),
    count(*) filter (
      where
        substr(code::text,1,1)=substr(code::text,2,1)
        or substr(code::text,1,1)=substr(code::text,3,1)
        or substr(code::text,1,1)=substr(code::text,4,1)
        or substr(code::text,2,1)=substr(code::text,3,1)
        or substr(code::text,2,1)=substr(code::text,4,1)
        or substr(code::text,3,1)=substr(code::text,4,1)
    )
  into v_count, v_min, v_max, v_invalid
  from public.szpilplac_klodka
  where mode='daily' and idx>=93;

  if v_count<>5040 or v_min<>93 or v_max<>5132 or v_invalid<>0 then
    delete from public.szpilplac_klodka
    where mode='daily' and idx>=93;

    with combos as (
      select (a::text||b::text||c::text||d::text)::char(4) as code
      from generate_series(0,9) a
      cross join generate_series(0,9) b
      cross join generate_series(0,9) c
      cross join generate_series(0,9) d
      where a<>b and a<>c and a<>d
        and b<>c and b<>d
        and c<>d
    ),
    shuffled as (
      select code, row_number() over(order by random()) as rn
      from combos
    )
    insert into public.szpilplac_klodka(mode,idx,code)
    select 'daily',(92+rn)::integer,code
    from shuffled;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid='public.szpilplac_klodka'::regclass
      and conname='szpilplac_klodka_unique_digits_v2_check'
  ) then
    alter table public.szpilplac_klodka
      add constraint szpilplac_klodka_unique_digits_v2_check
      check (
        mode<>'daily'
        or idx<93
        or (
          substr(code::text,1,1)<>substr(code::text,2,1)
          and substr(code::text,1,1)<>substr(code::text,3,1)
          and substr(code::text,1,1)<>substr(code::text,4,1)
          and substr(code::text,2,1)<>substr(code::text,3,1)
          and substr(code::text,2,1)<>substr(code::text,4,1)
          and substr(code::text,3,1)<>substr(code::text,4,1)
        )
      );
  end if;
end
$$;

create or replace function public.klodka_guess(p_mode text, p_idx integer, p_guess text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_code char(4);
  g char[];
  c char[];
  st text[]:=array['absent','absent','absent','absent'];
  remain int[]:=array[0,0,0,0,0,0,0,0,0,0];
  i int;
  d int;
begin
  if p_mode not in ('daily','weekly') then
    return jsonb_build_object('error','bad mode');
  end if;

  if p_guess !~ '^[0-9]{4}$' then
    return jsonb_build_object('error','guess must be 4 digits');
  end if;

  if p_mode='daily' and p_idx>=93 and (
    substr(p_guess,1,1)=substr(p_guess,2,1)
    or substr(p_guess,1,1)=substr(p_guess,3,1)
    or substr(p_guess,1,1)=substr(p_guess,4,1)
    or substr(p_guess,2,1)=substr(p_guess,3,1)
    or substr(p_guess,2,1)=substr(p_guess,4,1)
    or substr(p_guess,3,1)=substr(p_guess,4,1)
  ) then
    return jsonb_build_object('error','digits must be unique');
  end if;

  select code into v_code
  from public.szpilplac_klodka
  where mode=p_mode and idx=p_idx;

  if v_code is null then
    return jsonb_build_object('error','no code');
  end if;

  if p_mode='weekly' then
    return jsonb_build_object('correct',(p_guess=v_code));
  end if;

  for i in 1..4 loop
    g[i]:=substr(p_guess,i,1);
    c[i]:=substr(v_code,i,1);
  end loop;

  for i in 1..4 loop
    if g[i]=c[i] then
      st[i]:='correct';
    else
      d:=c[i]::int;
      remain[d+1]:=remain[d+1]+1;
    end if;
  end loop;

  for i in 1..4 loop
    if st[i]<>'correct' then
      d:=g[i]::int;
      if remain[d+1]>0 then
        st[i]:='present';
        remain[d+1]:=remain[d+1]-1;
      end if;
    end if;
  end loop;

  return jsonb_build_object('states',st,'correct',(p_guess=v_code));
end;
$function$;

-- Zostawiamy nazwę starego RPC dla zgodności ze starszym cache,
-- ale nie zwraca już strzałek góra/dół.
create or replace function public.klodka_guess_hints(p_mode text, p_idx integer, p_guess text)
returns jsonb
language sql
security definer
set search_path to 'public'
as $function$
  select public.klodka_guess(p_mode,p_idx,p_guess);
$function$;

comment on constraint szpilplac_klodka_unique_digits_v2_check
on public.szpilplac_klodka
is 'Od Kłódki #93 kod dzienny składa się z czterech różnych cyfr.';

commit;
