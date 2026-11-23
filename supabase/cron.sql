-- =====================================================================
--  Automatischer Kalender-Abgleich (Kalender-Abos, z. B. von FuPa)
--  Voraussetzung: Edge Function "ical-sync" ist eingerichtet ("Verify JWT" aus).
--  PROJEKT und EIN-LANGES-ZUFALLSPASSWORT ersetzen, dann im SQL Editor ausführen.
-- =====================================================================
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- Passwort im verschlüsselten Tresor ablegen (nur einmal nötig)
select vault.create_secret('EIN-LANGES-ZUFALLSPASSWORT', 'ical_cron_secret', 'Passwort für den automatischen Kalender-Abgleich')
where not exists (select 1 from vault.secrets where name = 'ical_cron_secret');

-- Prüfung für die Server-Funktion (nur mit Service-Schlüssel aufrufbar)
create or replace function public.cron_secret_ok(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'ical_cron_secret' and decrypted_secret = p)
$$;
revoke execute on function public.cron_secret_ok(text) from public, anon, authenticated;
grant execute on function public.cron_secret_ok(text) to service_role;

-- Täglich 3:17 und 12:17 UTC (Winter 4:17 / 13:17 Uhr, Sommer 5:17 / 14:17 Uhr deutscher Zeit)
select cron.unschedule('platzplan-ical-sync') where exists (select 1 from cron.job where jobname = 'platzplan-ical-sync');
select cron.schedule('platzplan-ical-sync', '17 3,12 * * *', $cron$
  select net.http_post(
    url := 'https://PROJEKT.supabase.co/functions/v1/ical-sync',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'ical_cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 60000);
$cron$);

-- Kontrolle: letzte Abgleiche und ihre Antwort
-- select created, status_code, content from net._http_response order by id desc limit 5;
