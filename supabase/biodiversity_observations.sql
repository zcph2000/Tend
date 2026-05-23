-- Biodiversitetsobservationer — på tværs af hele gården
create table if not exists biodiversity_observations (
  id             uuid default gen_random_uuid() primary key,
  farm_id        uuid references farms(id) on delete cascade not null,
  user_id        uuid references auth.users(id) on delete cascade not null,
  observed_at    date not null default current_date,
  category       text not null,   -- 'insekt', 'fugl', 'plante', 'pattedyr', 'padde', 'svamp', 'andet'
  species_name   text,            -- artsnavnet (fx "Rødhals", "Humlebi", "Kællingetand")
  count          integer,         -- antal observeret (valgfrit)
  field_id       uuid references fields(id) on delete set null,  -- valgfri tilknytning
  location_note  text,            -- fx "ved nordhegnet", "i polytunnellen"
  notes          text,
  created_at     timestamptz default now()
);

create index if not exists biodiversity_farm_date_idx
  on biodiversity_observations (farm_id, observed_at desc);

-- RLS
alter table biodiversity_observations enable row level security;

create policy "Brugere kan se egne biodiversitetsobservationer"
  on biodiversity_observations for select
  using (auth.uid() = user_id);

create policy "Brugere kan tilføje egne biodiversitetsobservationer"
  on biodiversity_observations for insert
  with check (auth.uid() = user_id);

create policy "Brugere kan slette egne biodiversitetsobservationer"
  on biodiversity_observations for delete
  using (auth.uid() = user_id);
