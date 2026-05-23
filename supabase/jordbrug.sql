-- ============================================================
-- JORDBRUG — Bede, Polytunnel, Frugtplantage, Kompost, Frø
-- Kør dette script i Supabase SQL Editor
-- ============================================================

-- --------------------------
-- BEDE (growing beds)
-- --------------------------
create table if not exists beds (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid references farms(id) on delete cascade not null,
  name          text not null,
  area_m2       numeric,
  location_note text,
  soil_notes    text,
  status        text default 'planlagt' check (status in ('planlagt', 'aktiv', 'hvilende')),
  notes         text,
  created_at    timestamptz default now()
);

create index if not exists beds_farm_id_idx on beds(farm_id);

alter table beds enable row level security;
create policy "Brugere ser egne bede" on beds for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egne bede" on beds for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egne bede" on beds for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egne bede" on beds for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);

-- --------------------------
-- PLANTINGER (bed plantings)
-- --------------------------
create table if not exists bed_plantings (
  id                  uuid primary key default gen_random_uuid(),
  bed_id              uuid references beds(id) on delete cascade not null,
  farm_id             uuid references farms(id) on delete cascade not null,
  crop_name           text not null,
  variety             text,
  sowed_at            date,
  transplanted_at     date,
  expected_harvest_at date,
  harvested_at        date,
  quantity_plants     int,
  row_spacing_cm      int,
  plant_spacing_cm    int,
  companion_plants    text,
  status              text default 'planlagt' check (status in ('planlagt', 'spiret', 'plantet', 'høstet', 'fjernet')),
  notes               text,
  created_at          timestamptz default now()
);

create index if not exists bed_plantings_bed_id_idx on bed_plantings(bed_id);
create index if not exists bed_plantings_farm_id_idx on bed_plantings(farm_id);

alter table bed_plantings enable row level security;
create policy "Brugere ser egne plantinger" on bed_plantings for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egne plantinger" on bed_plantings for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egne plantinger" on bed_plantings for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egne plantinger" on bed_plantings for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);

-- --------------------------
-- POLYTUNNEL
-- --------------------------
create table if not exists polytunnels (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid references farms(id) on delete cascade not null,
  name          text not null,
  length_m      numeric,
  width_m       numeric,
  status        text default 'planlagt' check (status in ('planlagt', 'aktiv', 'vinterhvile')),
  notes         text,
  created_at    timestamptz default now()
);

create index if not exists polytunnels_farm_id_idx on polytunnels(farm_id);

alter table polytunnels enable row level security;
create policy "Brugere ser egne polytunnels" on polytunnels for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egne polytunnels" on polytunnels for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egne polytunnels" on polytunnels for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egne polytunnels" on polytunnels for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);

-- Plantinger i polytunnel (bruger samme struktur som bed_plantings, med polytunnel_id)
create table if not exists polytunnel_plantings (
  id                  uuid primary key default gen_random_uuid(),
  polytunnel_id       uuid references polytunnels(id) on delete cascade not null,
  farm_id             uuid references farms(id) on delete cascade not null,
  crop_name           text not null,
  variety             text,
  sowed_at            date,
  transplanted_at     date,
  expected_harvest_at date,
  harvested_at        date,
  quantity_plants     int,
  status              text default 'planlagt' check (status in ('planlagt', 'spiret', 'plantet', 'høstet', 'fjernet')),
  notes               text,
  created_at          timestamptz default now()
);

create index if not exists polytunnel_plantings_polytunnel_id_idx on polytunnel_plantings(polytunnel_id);

alter table polytunnel_plantings enable row level security;
create policy "Brugere ser egne polytunnel-plantinger" on polytunnel_plantings for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egne polytunnel-plantinger" on polytunnel_plantings for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egne polytunnel-plantinger" on polytunnel_plantings for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egne polytunnel-plantinger" on polytunnel_plantings for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);

-- --------------------------
-- FRUGTPLANTAGE
-- --------------------------
create table if not exists fruit_plants (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid references farms(id) on delete cascade not null,
  name          text not null,
  plant_type    text check (plant_type in ('træ', 'busk', 'bærplante', 'slyngplante', 'andet')),
  species       text,
  variety       text,
  planted_year  int,
  quantity      int default 1,
  location_note text,
  status        text default 'planlagt' check (status in ('planlagt', 'etableret', 'producerer')),
  notes         text,
  created_at    timestamptz default now()
);

create index if not exists fruit_plants_farm_id_idx on fruit_plants(farm_id);

alter table fruit_plants enable row level security;
create policy "Brugere ser egne frugtplanter" on fruit_plants for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egne frugtplanter" on fruit_plants for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egne frugtplanter" on fruit_plants for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egne frugtplanter" on fruit_plants for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);

-- --------------------------
-- KOMPOST
-- --------------------------
create table if not exists compost_heaps (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid references farms(id) on delete cascade not null,
  name          text not null,
  type          text default 'koldt' check (type in ('varmt', 'koldt', 'orm', 'bokashi')),
  started_at    date,
  ready_at      date,
  status        text default 'aktiv' check (status in ('planlagt', 'aktiv', 'klar', 'brugt')),
  notes         text,
  created_at    timestamptz default now()
);

create index if not exists compost_heaps_farm_id_idx on compost_heaps(farm_id);

alter table compost_heaps enable row level security;
create policy "Brugere ser egne kompostbunker" on compost_heaps for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egne kompostbunker" on compost_heaps for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egne kompostbunker" on compost_heaps for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egne kompostbunker" on compost_heaps for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);

-- --------------------------
-- FRØ OG FORSPIRING
-- --------------------------
create table if not exists seeds (
  id                    uuid primary key default gen_random_uuid(),
  farm_id               uuid references farms(id) on delete cascade not null,
  crop_name             text not null,
  variety               text,
  supplier              text,
  quantity_g            numeric,
  quantity_seeds        int,
  purchased_at          date,
  best_before_year      int,
  germination_rate_pct  int,
  sowing_from_month     int check (sowing_from_month between 1 and 12),
  sowing_to_month       int check (sowing_to_month between 1 and 12),
  notes                 text,
  created_at            timestamptz default now()
);

create index if not exists seeds_farm_id_idx on seeds(farm_id);

alter table seeds enable row level security;
create policy "Brugere ser egne frø" on seeds for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egne frø" on seeds for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egne frø" on seeds for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egne frø" on seeds for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);
