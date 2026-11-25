-- =====================================================================
--  Platzplan SG Scharmede/Thüle – Datenbankschema für Supabase
--  Einmalig im Supabase-Dashboard unter "SQL Editor" ausführen.
--  Danach optional seed.sql (Testdaten) ausführen.
-- =====================================================================

-- ---------- Tabellen ------------------------------------------------

-- Sportanlagen (Orte): Scharmede, Thüle. Die Farbe im Plan gehört zur Anlage.
create table if not exists public.sites (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,              -- z. B. "Sportanlage Thüle"
  short_name  text not null,              -- z. B. "Thüle"
  address     text,
  color       text,                       -- Farbe im Plan, z. B. "#c62828"
  sort        int  not null default 0
);

-- Plätze (buchbare Ressourcen) einer Sportanlage, z. B. Thüle Platz 1 und Platz 2.
-- Doppelbelegung wird pro Platz geprüft.
create table if not exists public.fields (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,              -- z. B. "Platz 1" oder "Fußballplatz"
  short_name  text not null,              -- Kürzel im Kalender, z. B. "P1"
  address     text,                       -- (veraltet, Adresse steht an der Sportanlage)
  color       text,                       -- (veraltet, Farbe steht an der Sportanlage)
  sort        int  not null default 0
);
alter table public.fields add column if not exists color text;
alter table public.fields add column if not exists site_id uuid references public.sites(id) on delete cascade;

-- Umstellung älterer Installationen: jeder Platz ohne Anlage bekommt eine eigene Anlage
do $$ declare f record; s uuid; begin
  for f in select * from public.fields where site_id is null loop
    insert into public.sites (name, short_name, address, color, sort)
    values (f.name, f.short_name, f.address, f.color, f.sort) returning id into s;
    update public.fields set site_id = s where id = f.id;
  end loop;
end $$;

-- Personen (Trainer, Betreuer, Vorstand). Können, müssen aber kein Login haben.
create table if not exists public.people (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid unique references auth.users(id) on delete set null,
  name         text not null,
  phone        text,
  email        text,                      -- Kontakt-E-Mail (nur bei Einwilligung sichtbar)
  photo_path   text,                      -- Pfad im Storage-Bucket "photos"
  consent      boolean not null default false,  -- Einwilligung: Foto/Telefon/E-Mail anzeigen
  consent_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- Mannschaften
create table if not exists public.teams (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,          -- "1. Herren"
  short_name       text not null,          -- "1. H" (für kleine Kalenderblöcke)
  category         text,                   -- "Senioren", "Junioren", "Frauen" …
  club             text,                   -- Verein oder SG (gemeinsame Mannschaft)
  league           text,                   -- Liga, z. B. "Kreisliga A"
  home_field_id    uuid references public.fields(id) on delete set null,
  fussballde_widget_id text,               -- optional: Widget-ID von fussball.de
  ical_url         text,                   -- optional: Kalender-Abo-Adresse für Spiele
  active           boolean not null default true,
  sort             int not null default 0
);

-- Ansprechpartner je Mannschaft
create table if not exists public.team_contacts (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  person_id  uuid not null references public.people(id) on delete cascade,
  role       text not null default 'Trainer',   -- Trainer, Co-Trainer, Betreuer
  is_primary boolean not null default false,     -- Hauptansprechpartner
  sort       int not null default 0,
  unique (team_id, person_id)
);

-- Ansprechpartner (Vorstand und weitere Funktionen; Tabellenname aus Kompatibilitätsgründen)
create table if not exists public.board_members (
  id              uuid primary key default gen_random_uuid(),
  person_id       uuid not null references public.people(id) on delete cascade,
  position        text not null,          -- "1. Vorsitzender"
  club            text,                   -- "SC Concordia Scharmede" / "VfL Thüle" / "SG"
  responsibility  text,                   -- (veraltet, ersetzt durch topics)
  topics          text[] not null default '{}', -- Zuständig für: einzelne Themen
  category        text not null default 'Vorstand', -- Bereich: Vorstand, Jugendabteilung, Spielbetrieb …
  sort            int not null default 0
);

-- Ergänzungen für ältere Installationen
alter table public.teams add column if not exists club text;
alter table public.teams add column if not exists league text;
alter table public.board_members add column if not exists category text not null default 'Vorstand';
alter table public.board_members add column if not exists topics text[] not null default '{}';
-- Alte Zuständigkeiten ("A, B; C") in einzelne Themen aufteilen
update public.board_members
   set topics = array(select trim(x) from unnest(regexp_split_to_array(responsibility, '[,;]')) x where trim(x) <> ''),
       responsibility = null
 where responsibility is not null and cardinality(topics) = 0;

-- Wiederkehrende Termine (z. B. jeden Dienstag 18:00–19:30)
create table if not exists public.series (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  field_id    uuid references public.fields(id) on delete cascade,
  kind        text not null default 'training' check (kind in ('training','spiel','sonstiges')),
  weekday     int  not null check (weekday between 1 and 7),  -- 1 = Montag … 7 = Sonntag
  start_time  time not null,
  end_time    time not null,
  valid_from  date not null,
  valid_until date,
  note        text,
  created_by  uuid references auth.users(id) on delete set null,
  check (end_time > start_time)
);

-- Ausfälle einzelner Termine einer Serie
create table if not exists public.series_exceptions (
  id         uuid primary key default gen_random_uuid(),
  series_id  uuid not null references public.series(id) on delete cascade,
  date       date not null,
  reason     text,
  unique (series_id, date)
);

-- Einzeltermine (Spiele, Sondertrainings, Turniere …)
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid references public.teams(id) on delete cascade,
  field_id     uuid references public.fields(id) on delete set null, -- leer bei Auswärtsspielen
  kind         text not null default 'training' check (kind in ('training','spiel','sonstiges')),
  title        text,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  is_away      boolean not null default false,
  opponent     text,
  venue        text,                       -- Spielort bei Auswärtsspielen
  competition  text,                       -- "Kreisliga A", "Pokal", "Freundschaftsspiel"
  note         text,
  source       text not null default 'manual' check (source in ('manual','csv','ical')),
  external_uid text unique,                -- für Import ohne Dubletten
  created_by   uuid references auth.users(id) on delete set null,
  check (ends_at > starts_at)
);
create index if not exists events_starts_idx on public.events (starts_at);

-- Nutzerkonten (1:1 zu auth.users) mit Rolle
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  role        text not null default 'member' check (role in ('member','trainer','board','admin')),
  created_at  timestamptz not null default now()
);

-- Einladungslinks
create table if not exists public.invites (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique default replace(gen_random_uuid()::text, '-', ''),
  label       text,
  role        text not null default 'member' check (role in ('member','trainer')),
  active      boolean not null default true,
  expires_at  timestamptz,
  uses        int not null default 0,
  created_at  timestamptz not null default now()
);

-- Rolle "Gast" gibt es nicht mehr: bestehende Gäste werden Mitglieder
update public.profiles set role = 'member' where role = 'guest';
update public.invites  set role = 'member' where role = 'guest';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('member','trainer','board','admin'));
alter table public.invites drop constraint if exists invites_role_check;
alter table public.invites add constraint invites_role_check check (role in ('member','trainer'));

-- ---------- Hilfsfunktionen ----------------------------------------

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'none')
$$;

-- Vorstand (oder Admin): darf Ansprechpartner pflegen
create or replace function public.is_board() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() in ('admin', 'board')
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() = 'admin'
$$;

-- Mannschaften, die der angemeldete Trainer pflegen darf
create or replace function public.my_team_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select tc.team_id
  from public.team_contacts tc
  join public.people p on p.id = tc.person_id
  where p.user_id = auth.uid() and public.my_role() = 'trainer'
$$;

create or replace function public.can_edit_team(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or t in (select public.my_team_ids())
$$;

-- Prüft einen Einladungslink (darf auch ohne Login aufgerufen werden)
create or replace function public.check_invite(p_token text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.invites
                 where token = p_token and active
                   and (expires_at is null or expires_at > now()))
      or not exists (select 1 from public.profiles)  -- Einrichtung: allererster Nutzer
$$;

-- Foto darf angezeigt werden, wenn die zugehörige Person eingewilligt hat
create or replace function public.photo_visible(p_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() <> 'none'
     and exists (select 1 from public.people where photo_path = p_path and consent)
$$;

-- Neuer Nutzer: nur mit gültigem Einladungslink. Legt Profil + Person an.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_token text := new.raw_user_meta_data->>'invite_token';
  v_name  text := nullif(trim(new.raw_user_meta_data->>'name'), '');
  v_inv   public.invites;
  v_first boolean;
begin
  select not exists (select 1 from public.profiles) into v_first;

  if not v_first then
    select * into v_inv from public.invites
     where token = v_token and active and (expires_at is null or expires_at > now());
    if not found then
      raise exception 'Ungültiger oder deaktivierter Einladungslink';
    end if;
    update public.invites set uses = uses + 1 where id = v_inv.id;
  end if;

  -- Der allererste Nutzer wird automatisch Admin.
  insert into public.profiles (id, email, role)
  values (new.id, new.email, case when v_first then 'admin' else v_inv.role end);

  -- Mit vorhandener Person verknüpfen (gleiche E-Mail), sonst neu anlegen
  update public.people set user_id = new.id
   where user_id is null and lower(email) = lower(new.email);
  if not found then
    insert into public.people (user_id, name, email)
    values (new.id, coalesce(v_name, split_part(new.email, '@', 1)), new.email);
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Einwilligungszeitpunkt automatisch setzen
create or replace function public.people_consent_ts() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.consent and (tg_op = 'INSERT' or not old.consent) then new.consent_at := now(); end if;
  if not new.consent then new.consent_at := null; end if;
  return new;
end $$;
drop trigger if exists people_consent on public.people;
create trigger people_consent before insert or update on public.people
  for each row execute function public.people_consent_ts();

-- Admin: Nutzer vollständig löschen (Konto + Profil)
create or replace function public.admin_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Keine Berechtigung'; end if;
  if p_user = auth.uid() then raise exception 'Eigenes Konto bitte im Profil löschen'; end if;
  delete from auth.users where id = p_user;
end $$;

-- Nutzer: eigenes Konto löschen (DSGVO, Recht auf Löschung)
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.people where user_id = auth.uid()
    and id not in (select person_id from public.team_contacts)
    and id not in (select person_id from public.board_members);
  update public.people set user_id = null, phone = null, photo_path = null, consent = false
   where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;

-- ---------- Öffentliche Sicht auf Personen (Einwilligung!) ---------
-- Foto, Telefon und E-Mail nur, wenn die Person eingewilligt hat.
-- Die Funktion liest alle Personen (an RLS vorbei) und gibt Kontaktdaten nur bei Einwilligung heraus;
-- die Ansicht selbst läuft mit den Rechten des Aufrufers (security_invoker).
create or replace function public.people_public_rows()
returns table (id uuid, name text, phone text, email text, photo_path text)
language sql stable security definer set search_path = public as $$
  select id, name,
         case when consent then phone end,
         case when consent then email end,
         case when consent then photo_path end
  from public.people
  where public.my_role() <> 'none'
$$;
drop view if exists public.people_public;
create view public.people_public with (security_invoker = on) as
  select * from public.people_public_rows();

-- ---------- Row Level Security --------------------------------------

alter table public.sites             enable row level security;
alter table public.fields            enable row level security;
alter table public.people            enable row level security;
alter table public.teams             enable row level security;
alter table public.team_contacts     enable row level security;
alter table public.board_members     enable row level security;
alter table public.series            enable row level security;
alter table public.series_exceptions enable row level security;
alter table public.events            enable row level security;
alter table public.profiles          enable row level security;
alter table public.invites           enable row level security;

-- Lesen: alle angemeldeten Nutzer mit Profil
do $$ declare t text; begin
  foreach t in array array['sites','fields','teams','team_contacts','board_members','series','series_exceptions','events'] loop
    execute format('drop policy if exists "read_all" on public.%I', t);
    execute format('create policy "read_all" on public.%I for select to authenticated using (public.my_role() <> ''none'')', t);
  end loop;
end $$;

-- Schreiben Stammdaten: nur Admin
do $$ declare t text; begin
  foreach t in array array['sites','fields','teams','team_contacts','board_members','invites'] loop
    execute format('drop policy if exists "admin_write" on public.%I', t);
    execute format('create policy "admin_write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Termine: Admin alles, Trainer nur eigene Mannschaft
drop policy if exists "team_write" on public.series;
create policy "team_write" on public.series for all to authenticated
  using (public.can_edit_team(team_id)) with check (public.can_edit_team(team_id));

drop policy if exists "team_write" on public.events;
create policy "team_write" on public.events for all to authenticated
  using (public.can_edit_team(team_id)) with check (public.can_edit_team(team_id));

drop policy if exists "team_write" on public.series_exceptions;
create policy "team_write" on public.series_exceptions for all to authenticated
  using (exists (select 1 from public.series s where s.id = series_id and public.can_edit_team(s.team_id)))
  with check (exists (select 1 from public.series s where s.id = series_id and public.can_edit_team(s.team_id)));

-- Vorstand: Ansprechpartner pflegen, Personen ohne eigenes App-Konto anlegen und bearbeiten
drop policy if exists "board_write" on public.board_members;
create policy "board_write" on public.board_members for all to authenticated
  using (public.is_board()) with check (public.is_board());
drop policy if exists "board_read" on public.people;
create policy "board_read" on public.people for select to authenticated using (public.is_board());
drop policy if exists "board_insert" on public.people;
create policy "board_insert" on public.people for insert to authenticated
  with check (public.my_role() = 'board' and user_id is null);
drop policy if exists "board_update" on public.people;
create policy "board_update" on public.people for update to authenticated
  using (public.my_role() = 'board' and user_id is null)
  with check (public.my_role() = 'board' and user_id is null);

-- Personen: eigene Zeile lesen/ändern, Admin alles. Alle anderen nur über people_public.
drop policy if exists "own_or_admin" on public.people;
create policy "own_or_admin" on public.people for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (public.is_admin() or (user_id = auth.uid()
    and (photo_path is null or photo_path like auth.uid()::text || '/%')));

-- Profile: eigenes lesen, Admin alles (Rollen ändern)
drop policy if exists "own_read" on public.profiles;
create policy "own_read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists "admin_update" on public.profiles;
create policy "admin_update" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Freigaben: Heimspiel-Verlegungen durch Trainer ----------
create table if not exists public.change_requests (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  team_id       uuid not null references public.teams(id) on delete cascade,
  requested_by  uuid references auth.users(id) on delete set null,
  proposed      jsonb not null,             -- neue Werte (starts_at, ends_at, field_id, …)
  previous      jsonb not null,             -- bisherige Werte zum Vergleich
  reason        text,
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by    uuid references auth.users(id) on delete set null,
  decided_at    timestamptz,
  decision_note text,
  created_at    timestamptz not null default now()
);
create index if not exists change_requests_status_idx on public.change_requests (status);
alter table public.change_requests enable row level security;

drop policy if exists "cr_read" on public.change_requests;
create policy "cr_read" on public.change_requests for select to authenticated
  using (public.is_admin() or requested_by = auth.uid() or team_id in (select public.my_team_ids()));
drop policy if exists "cr_insert" on public.change_requests;
create policy "cr_insert" on public.change_requests for insert to authenticated
  with check (public.can_edit_team(team_id) and requested_by = auth.uid() and status = 'pending');
drop policy if exists "cr_withdraw" on public.change_requests;
create policy "cr_withdraw" on public.change_requests for delete to authenticated
  using (public.is_admin() or (requested_by = auth.uid() and status = 'pending'));

-- Heimspiel: Datum, Uhrzeit oder Platz darf nur ein Admin direkt ändern
-- (der automatische Kalender-Abgleich läuft ohne Benutzer und ist ausgenommen)
create or replace function public.guard_home_game() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if ((old.kind = 'spiel' and not old.is_away) or (new.kind = 'spiel' and not new.is_away))
     and (new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at
          or new.field_id is distinct from old.field_id or new.is_away is distinct from old.is_away
          or new.kind is distinct from old.kind) then
    raise exception 'Heimspiele können nur mit Freigabe eines Admins verlegt werden';
  end if;
  return new;
end $$;
drop trigger if exists guard_home_game on public.events;
create trigger guard_home_game before update on public.events
  for each row execute function public.guard_home_game();

-- Admin entscheidet: bei Freigabe wird das Spiel verlegt
create or replace function public.decide_change_request(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare r public.change_requests;
begin
  if not public.is_admin() then raise exception 'Keine Berechtigung'; end if;
  select * into r from public.change_requests where id = p_id for update;
  if not found then raise exception 'Anfrage nicht gefunden'; end if;
  if r.status <> 'pending' then raise exception 'Über diese Anfrage wurde bereits entschieden'; end if;
  if p_approve then
    update public.events set
      starts_at   = coalesce((r.proposed->>'starts_at')::timestamptz, starts_at),
      ends_at     = coalesce((r.proposed->>'ends_at')::timestamptz, ends_at),
      field_id    = case when r.proposed ? 'field_id' then (r.proposed->>'field_id')::uuid else field_id end,
      is_away     = coalesce((r.proposed->>'is_away')::boolean, is_away),
      venue       = case when r.proposed ? 'venue' then r.proposed->>'venue' else venue end,
      opponent    = case when r.proposed ? 'opponent' then r.proposed->>'opponent' else opponent end,
      competition = case when r.proposed ? 'competition' then r.proposed->>'competition' else competition end,
      note        = case when r.proposed ? 'note' then r.proposed->>'note' else note end
    where id = r.event_id;
  end if;
  update public.change_requests
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = auth.uid(), decided_at = now(), decision_note = nullif(trim(p_note), '')
   where id = p_id;
end $$;

-- E-Mail-Benachrichtigung über die Edge Function "notify" (siehe supabase/cron.sql)
create or replace function public.notify_change_request() returns trigger
language plpgsql security definer set search_path = public as $$
declare kind text := case when tg_op = 'INSERT' then 'request' else 'decision' end;
begin
  if tg_op = 'UPDATE' and new.status = old.status then return new; end if;
  begin
    perform net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'functions_url') || '/notify',
      headers := jsonb_build_object('Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'ical_cron_secret')),
      body := jsonb_build_object('type', kind, 'id', new.id));
  exception when others then null; -- Benachrichtigung ist optional
  end;
  return new;
end $$;
drop trigger if exists notify_change_request on public.change_requests;
create trigger notify_change_request after insert or update of status on public.change_requests
  for each row execute function public.notify_change_request();

-- Rechte: Funktionen standardmäßig für niemanden aufrufbar, dann gezielt freigeben
revoke execute on all functions in schema public from public, anon;
grant execute on function public.check_invite(text) to anon, authenticated;       -- Einladungsseite
grant execute on function public.my_role(), public.is_admin(), public.is_board(), public.my_team_ids(),
  public.can_edit_team(uuid), public.photo_visible(text), public.people_public_rows(),
  public.admin_delete_user(uuid), public.delete_my_account(), public.decide_change_request(uuid, boolean, text) to authenticated;   -- Regeln + App
revoke execute on function public.handle_new_user(), public.people_consent_ts(), public.guard_home_game(), public.notify_change_request() from authenticated; -- nur Trigger
grant select on public.people_public to authenticated;
revoke all on public.people_public from anon;

-- ---------- Speicher für Fotos ---------------------------------------
-- Privater Bucket. Fotos sind nur sichtbar, wenn die Person eingewilligt hat.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "photos_read" on storage.objects;
create policy "photos_read" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
    or public.photo_visible(name)));

-- Eigene Fotos liegen im Ordner <user-id>/…; Admin darf alles
drop policy if exists "photos_write" on storage.objects;
create policy "photos_write" on storage.objects for all to authenticated
  using (bucket_id = 'photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()))
  with check (bucket_id = 'photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
