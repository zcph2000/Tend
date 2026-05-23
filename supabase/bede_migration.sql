-- ============================================================
-- BEDE — Opgraderet skema: sektioner, mål, familiehistorik
-- Kør dette script i Supabase SQL Editor
-- ============================================================

-- --------------------------
-- BED_SECTIONS (ny tabel)
-- --------------------------
create table if not exists bed_sections (
  id                  uuid primary key default gen_random_uuid(),
  farm_id             uuid references farms(id) on delete cascade not null,
  name                text not null,
  location_notes      text,
  orientation_degrees integer check (orientation_degrees between 0 and 359),
  polytunnel_id       uuid references polytunnels(id) on delete set null,
  notes               text,
  created_at          timestamptz default now()
);

create index if not exists bed_sections_farm_id_idx on bed_sections(farm_id);

alter table bed_sections enable row level security;
create policy "Brugere ser egne sektioner" on bed_sections for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egne sektioner" on bed_sections for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egne sektioner" on bed_sections for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egne sektioner" on bed_sections for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);

-- --------------------------
-- BEDS — tilføj nye kolonner
-- --------------------------
alter table beds
  add column if not exists section_id          uuid references bed_sections(id) on delete set null,
  add column if not exists length_m            numeric,
  add column if not exists width_m             numeric,
  add column if not exists orientation_degrees integer check (orientation_degrees between 0 and 359),
  add column if not exists has_drip_irrigation boolean default false;

-- --------------------------
-- BED_PLANTINGS — tilføj nye kolonner
-- --------------------------
alter table bed_plantings
  add column if not exists variety_id                    uuid references crop_varieties(id) on delete set null,
  add column if not exists zone_description              text,
  add column if not exists method                        text check (method in ('direkte_sået', 'udplantet_eget', 'udplantet_købt')),
  add column if not exists plant_age_weeks_at_transplant integer,
  add column if not exists season                        integer;

-- --------------------------
-- BED_COMPOST_APPLICATIONS (ny tabel)
-- --------------------------
create table if not exists bed_compost_applications (
  id                 uuid primary key default gen_random_uuid(),
  farm_id            uuid references farms(id) on delete cascade not null,
  bed_id             uuid references beds(id) on delete cascade not null,
  applied_date       date not null default current_date,
  amount_description text,
  source             text,
  notes              text,
  created_at         timestamptz default now()
);

create index if not exists bed_compost_bed_id_idx on bed_compost_applications(bed_id);
create index if not exists bed_compost_farm_id_idx on bed_compost_applications(farm_id);

alter table bed_compost_applications enable row level security;
create policy "Brugere ser egne kompostpåføringer" on bed_compost_applications for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egne kompostpåføringer" on bed_compost_applications for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egne kompostpåføringer" on bed_compost_applications for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egne kompostpåføringer" on bed_compost_applications for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);
