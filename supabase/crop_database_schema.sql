-- ============================================================
-- AFGRØDEDATABASEN — Schema
-- Kør dette script FØR crop_database_seed.sql
-- ============================================================

-- --------------------------
-- PLANTEFAMILIER
-- --------------------------
create table if not exists crop_families (
  id             uuid primary key default gen_random_uuid(),
  name_da        text not null,          -- "Natskyggefamilien"
  scientific_name text not null unique,  -- "Solanaceae"
  notes          text,
  created_at     timestamptz default now()
);

-- --------------------------
-- PLANTEARTER
-- --------------------------
create table if not exists crop_species (
  id              uuid primary key default gen_random_uuid(),
  family_id       uuid references crop_families(id),
  name_da         text not null,          -- "Tomat"
  scientific_name text,                   -- "Solanum lycopersicum"
  plant_type      text not null check (plant_type in (
    'etårig', 'toårig', 'flerårig', 'vedplante'
  )),
  notes           text,
  created_at      timestamptz default now()
);

-- --------------------------
-- SORTER (hoveddatabasen)
-- --------------------------
create table if not exists crop_varieties (
  id              uuid primary key default gen_random_uuid(),
  species_id      uuid references crop_species(id) on delete cascade,

  -- Identitet
  name            text not null,
  synonyms        text,                  -- Alternative navne
  heritage        boolean default false, -- Heritage/heirloom sort
  heritage_source text,                  -- "Frøsamlerne", "PRG", egne frø
  description     text,
  variety_type    text check (variety_type in (
    'grøntsag', 'urt', 'frugt', 'bær', 'nød',
    'dækafgrøde', 'blomst', 'løg', 'rod'
  )),

  -- Formeringsmetode
  direct_sow              boolean default false,
  indoor_propagation      boolean default false,
  sowing_depth_cm         numeric,
  germination_temp_min_c  int,
  germination_temp_opt_c  int,
  germination_days_min    int,
  germination_days_max    int,
  needs_stratification    boolean default false, -- Kolde frø inden såning
  needs_scarification     boolean default false, -- Ridse/file frøskallen
  light_germinator        boolean default false, -- Lysspirer (lægges på overflade)
  needs_bottom_heat       boolean default false, -- Bundvarme anbefalet
  weeks_to_transplant     int,                   -- Uger fra såning til klar til udplantning

  -- Timing — dansk klima (zone 7b, calibreret til kystnær Sjælland)
  -- Måneder som tal 1–12
  sow_indoor_from_month    int check (sow_indoor_from_month between 1 and 12),
  sow_indoor_to_month      int check (sow_indoor_to_month between 1 and 12),
  direct_sow_from_month    int check (direct_sow_from_month between 1 and 12),
  direct_sow_to_month      int check (direct_sow_to_month between 1 and 12),
  transplant_from_month    int check (transplant_from_month between 1 and 12),
  transplant_to_month      int check (transplant_to_month between 1 and 12),
  harvest_from_month       int check (harvest_from_month between 1 and 12),
  harvest_to_month         int check (harvest_to_month between 1 and 12),
  days_to_harvest_transplant int,  -- Dage fra udplantning til høst
  days_to_harvest_direct     int,  -- Dage fra direkte såning til høst

  -- Afstande (tilpasset no-dig bede, typisk 75–90 cm brede)
  row_spacing_cm    int,
  plant_spacing_cm  int,
  plants_per_sqm    numeric, -- Vejledende

  -- Vækstbetingelser
  sun_requirements  text check (sun_requirements in ('fuld sol', 'halvskygge', 'skygge')),
  soil_ph_min       numeric,
  soil_ph_max       numeric,
  watering_needs    text check (watering_needs in ('lav', 'middel', 'høj')),
  frost_hardy       boolean default false,
  min_survival_temp_c int,               -- Laveste overlevelsestemp (°C)
  polytunnel_benefit text check (polytunnel_benefit in (
    'ikke nødvendig', 'anbefalet', 'krævet'
  )),

  -- Pleje
  needs_support       boolean default false, -- Opbinding/espalier
  pinching_required   boolean default false, -- Nipning af sideskud
  companion_plants    text,                  -- Fritekst
  incompatible_with   text,                  -- Fritekst
  care_notes          text,                  -- Fri plejeguide

  -- Udbytte (etårige)
  yield_kg_per_sqm_min  numeric,
  yield_kg_per_sqm_max  numeric,

  -- Flerårige og vedplanter
  years_to_first_harvest int,
  pruning_month_from     int check (pruning_month_from between 1 and 12),
  pruning_month_to       int check (pruning_month_to between 1 and 12),
  pruning_notes          text,
  animal_integration     text, -- "Høns kan gå under efter høst", "Ænder holder snegle væk"
  establishment_years    int,
  establishment_notes    text,

  -- Økonomi (vejledende)
  avg_market_price_dkk_kg  numeric, -- Vejledende markedspris kr./kg

  -- Meta
  is_system_variety boolean default true,
  farm_id           uuid,   -- null = global systemsort, uuid = gårdsspecifik
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create index if not exists crop_varieties_species_idx on crop_varieties(species_id);
create index if not exists crop_varieties_farm_idx on crop_varieties(farm_id);
create index if not exists crop_varieties_system_idx on crop_varieties(is_system_variety);

-- RLS: Systemsorter er synlige for alle autentificerede brugere.
-- Gårdsspecifikke sorter er kun synlige for den pågældende gård.
alter table crop_varieties enable row level security;

create policy "Alle ser systemsorter" on crop_varieties
  for select using (
    is_system_variety = true
    or farm_id in (select id from farms where user_id = auth.uid())
  );

create policy "Brugere opretter egne sorter" on crop_varieties
  for insert with check (
    is_system_variety = false
    and farm_id in (select id from farms where user_id = auth.uid())
  );

create policy "Brugere opdaterer egne sorter" on crop_varieties
  for update using (
    is_system_variety = false
    and farm_id in (select id from farms where user_id = auth.uid())
  );

create policy "Brugere sletter egne sorter" on crop_varieties
  for delete using (
    is_system_variety = false
    and farm_id in (select id from farms where user_id = auth.uid())
  );

-- crop_families og crop_species er globale — ingen RLS, læsbare af alle
alter table crop_families enable row level security;
create policy "Alle kan læse plantefamilier" on crop_families for select using (true);

alter table crop_species enable row level security;
create policy "Alle kan læse plantearter" on crop_species for select using (true);
