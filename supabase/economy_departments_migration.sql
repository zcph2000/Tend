-- =============================================================================
-- AFDELINGER (Fase 1 af økonomi-modulet) — brugerdefinerede afdelinger
-- (fx "Grøntsager", "Får", "Høns") som flokke og afgrødearter kan tilknyttes,
-- så rentabilitet senere kan opgøres pr. afdeling og zoomes ind pr. sort/flok.
-- =============================================================================

create table if not exists departments (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid references farms(id) on delete cascade not null,
  name        text not null,
  notes       text,
  created_at  timestamptz default now()
);

create index if not exists departments_farm_id_idx on departments(farm_id);

alter table departments enable row level security;

create policy "Brugere ser egne afdelinger" on departments for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egne afdelinger" on departments for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egne afdelinger" on departments for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egne afdelinger" on departments for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);


-- Flokke er allerede farm-specifikke, så afdeling kan sættes direkte
alter table flocks
  add column if not exists department_id uuid references departments(id) on delete set null;

create index if not exists flocks_department_idx on flocks(department_id);


-- Udgifter kan knyttes direkte til en afdeling (fx generelle indkøb der ikke
-- hænger på én bestemt flok eller plantning)
alter table farm_expenses
  add column if not exists department_id uuid references departments(id) on delete set null;

create index if not exists farm_expenses_department_idx on farm_expenses(department_id);


-- crop_species er GLOBALE rækker delt på tværs af alle gårde (ingen farm_id på
-- tabellen) — en afdelings-tildeling kan derfor ikke skrives direkte på arten,
-- men skal være en kobling pr. gård.
create table if not exists department_species_links (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid references farms(id) on delete cascade not null,
  department_id uuid references departments(id) on delete cascade not null,
  species_id    uuid references crop_species(id) on delete cascade not null,
  created_at    timestamptz default now(),
  unique (farm_id, species_id)
);

create index if not exists department_species_links_farm_idx on department_species_links(farm_id);
create index if not exists department_species_links_dept_idx on department_species_links(department_id);

alter table department_species_links enable row level security;

create policy "Brugere ser egne afdelings-koblinger" on department_species_links for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egne afdelings-koblinger" on department_species_links for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egne afdelings-koblinger" on department_species_links for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egne afdelings-koblinger" on department_species_links for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);
