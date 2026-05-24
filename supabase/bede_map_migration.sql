-- ============================================================
-- BEDE MAP — Tilføj kortplacering til bed_sections
-- Kør dette script i Supabase SQL Editor
-- ============================================================

alter table bed_sections
  add column if not exists center_lat    numeric,
  add column if not exists center_lng    numeric,
  add column if not exists bed_count     integer,
  add column if not exists bed_length_m  numeric,
  add column if not exists bed_width_m   numeric,
  add column if not exists path_width_m  numeric default 0.4,
  add column if not exists location_type text default 'friland'
    check (location_type in ('friland', 'polytunnel', 'drivhus_opvarmet'));

-- Slet-politik på bede (manglede)
create policy if not exists "Brugere sletter egne bede" on beds for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);
