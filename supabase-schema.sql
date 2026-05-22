-- ============================================
-- TEND — Supabase Database Schema
-- Kør dette i Supabase SQL Editor
-- ============================================

-- FARMS
create table farms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  location text,
  lat float,
  lng float,
  created_at timestamptz default now()
);
alter table farms enable row level security;
create policy "Users manage own farms" on farms
  for all using (auth.uid() = user_id);

-- FIELDS (store marker)
create table fields (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references farms(id) on delete cascade not null,
  name text not null,
  area_ha float not null default 0,
  geojson jsonb,
  notes text,
  created_at timestamptz default now()
);
alter table fields enable row level security;
create policy "Users manage own fields" on fields
  for all using (
    farm_id in (select id from farms where user_id = auth.uid())
  );

-- SECTIONS (paddocks inden i markers)
create table sections (
  id uuid primary key default gen_random_uuid(),
  field_id uuid references fields(id) on delete cascade not null,
  farm_id uuid references farms(id) on delete cascade not null,
  name text not null,
  area_ha float not null default 0,
  geojson jsonb,
  created_at timestamptz default now()
);
alter table sections enable row level security;
create policy "Users manage own sections" on sections
  for all using (
    farm_id in (select id from farms where user_id = auth.uid())
  );

-- ANIMALS
create table animals (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references farms(id) on delete cascade not null,
  ear_tag text not null,
  name text,
  species text not null default 'sheep',
  breed text,
  sex text not null default 'female',
  birth_date date,
  mother_id uuid references animals(id),
  father_id uuid references animals(id),
  status text not null default 'active',
  notes text,
  created_at timestamptz default now()
);
alter table animals enable row level security;
create policy "Users manage own animals" on animals
  for all using (
    farm_id in (select id from farms where user_id = auth.uid())
  );

-- ANIMAL EVENTS (vaccination, ormekur, lammede, osv.)
create table animal_events (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid references animals(id) on delete cascade not null,
  farm_id uuid references farms(id) on delete cascade not null,
  event_type text not null,
  event_date date not null default current_date,
  data jsonb default '{}',
  notes text,
  created_at timestamptz default now()
);
alter table animal_events enable row level security;
create policy "Users manage own animal events" on animal_events
  for all using (
    farm_id in (select id from farms where user_id = auth.uid())
  );

-- GRAZING RECORDS (rotationshistorik)
create table grazing_records (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references farms(id) on delete cascade not null,
  section_id uuid references sections(id) on delete cascade not null,
  animal_count integer not null default 0,
  start_date date not null default current_date,
  end_date date,
  grass_height_before float,
  grass_height_after float,
  notes text,
  created_at timestamptz default now()
);
alter table grazing_records enable row level security;
create policy "Users manage own grazing records" on grazing_records
  for all using (
    farm_id in (select id from farms where user_id = auth.uid())
  );

-- OBSERVATIONS (markobservationer)
create table observations (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid references farms(id) on delete cascade not null,
  section_id uuid references sections(id),
  observation_date date not null default current_date,
  grass_height float,
  grass_condition text,
  notes text,
  created_at timestamptz default now()
);
alter table observations enable row level security;
create policy "Users manage own observations" on observations
  for all using (
    farm_id in (select id from farms where user_id = auth.uid())
  );

-- ============================================
-- Færdig! Alle tabeller er klar.
-- ============================================
