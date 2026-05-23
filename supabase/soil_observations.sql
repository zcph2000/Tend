-- Kør denne SQL i Supabase SQL Editor
-- https://supabase.com/dashboard/project/gzybigaqfllzxwjuyyua/sql

-- 1. Jordtype på marker (persistent, ændres sjældent)
alter table fields add column if not exists soil_type text;
-- Mulige værdier: 'sand', 'normal', 'clay', 'humus'

-- 2. Jordsundhedsobservationer over tid
create table if not exists soil_observations (
  id uuid default gen_random_uuid() primary key,
  field_id uuid references fields(id) on delete cascade not null,
  farm_id  uuid references farms(id)  on delete cascade not null,
  observed_at date not null default current_date,

  -- Kemiske målinger
  ph numeric(3,1),                -- 0.0–14.0, optimalt 6.0–7.0 for de fleste afgrøder
  organic_matter_pct numeric(4,1), -- % organisk stof, mål: stigende over tid

  -- Biologiske observationer (spade-prøve 30×30×30 cm)
  earthworm_count integer,        -- antal regnorme pr. m²
  water_retention smallint        -- 0–5 (0=ingen, 5=fremragende)
    check (water_retention between 0 and 5),
  compaction smallint             -- 0–5 (0=løs, 5=beton-hård)
    check (compaction between 0 and 5),

  notes text,
  created_at timestamptz default now()
);

-- RLS
alter table soil_observations enable row level security;

create policy "Brugere kan se egne jordobservationer"
  on soil_observations for select
  using (farm_id in (select id from farms where user_id = auth.uid()));

create policy "Brugere kan oprette jordobservationer"
  on soil_observations for insert
  with check (farm_id in (select id from farms where user_id = auth.uid()));

create policy "Brugere kan slette egne jordobservationer"
  on soil_observations for delete
  using (farm_id in (select id from farms where user_id = auth.uid()));
