-- =============================================================================
-- BUDGET (Fase 3b/3c af økonomi-modulet) — driftsbudget og opstartsprojekter
-- Budgetlinjer genbruger de samme kategorier/kilder som regnskabet allerede
-- har, så "faktisk" altid kan beregnes live ud fra data der allerede findes
-- (farm_expenses/harvest_logs/animal_product_logs/farm_tasks) — ingen
-- separat aktual-logning, ingen dobbelt-registrering.
-- =============================================================================

-- Opstartsprojekter (engangsinvesteringer) — skema nu, UI i næste fase
create table if not exists budget_projects (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid references farms(id) on delete cascade not null,
  department_id uuid references departments(id) on delete set null,
  name          text not null,
  description   text,
  status        text default 'planlagt' check (status in ('planlagt','i gang','afsluttet','skrottet')),
  start_date    date,
  target_date   date,
  expected_outcome text,
  created_at    timestamptz default now()
);

create index if not exists budget_projects_farm_idx on budget_projects(farm_id);

alter table budget_projects enable row level security;
create policy "Brugere ser egne projekter" on budget_projects for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egne projekter" on budget_projects for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egne projekter" on budget_projects for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egne projekter" on budget_projects for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);

-- Forventet driftspåvirkning af et projekt (bruges til tilbagebetalingstid) — skema nu, UI senere
create table if not exists project_operating_impact (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid references farms(id) on delete cascade not null,
  project_id    uuid references budget_projects(id) on delete cascade not null,
  department_id uuid references departments(id) on delete set null,
  description   text,
  estimated_annual_revenue_delta_dkk numeric not null default 0,
  estimated_annual_cost_delta_dkk    numeric not null default 0,
  created_at    timestamptz default now()
);

create index if not exists project_operating_impact_project_idx on project_operating_impact(project_id);

alter table project_operating_impact enable row level security;
create policy "Brugere ser egen driftspåvirkning" on project_operating_impact for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egen driftspåvirkning" on project_operating_impact for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egen driftspåvirkning" on project_operating_impact for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egen driftspåvirkning" on project_operating_impact for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);

-- Driftsbudget pr. afdeling (eller hele gården, når department_id er null) pr. periode
create table if not exists operating_budgets (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid references farms(id) on delete cascade not null,
  department_id uuid references departments(id) on delete set null, -- null = hele gården
  period_label  text not null,
  period_start  date not null,
  period_end    date not null,
  notes         text,
  created_at    timestamptz default now()
);

create index if not exists operating_budgets_farm_idx on operating_budgets(farm_id);

alter table operating_budgets enable row level security;
create policy "Brugere ser egne driftsbudgetter" on operating_budgets for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egne driftsbudgetter" on operating_budgets for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egne driftsbudgetter" on operating_budgets for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egne driftsbudgetter" on operating_budgets for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);

-- Budgetlinjer — genbruges af driftsbudget (operating_budget_id) og senere
-- projekter (project_id). "source" afgør hvilken regnskabskilde "faktisk"
-- beregnes ud fra:
--   udgift      → farm_expenses (category matcher, afdeling, periode)
--   salg        → harvest_logs + animal_product_logs omsætning (afdeling, periode)
--   arbejdstid  → farm_tasks.actual_minutes (task_type matcher, afdeling, periode)
create table if not exists budget_lines (
  id                  uuid primary key default gen_random_uuid(),
  farm_id             uuid references farms(id) on delete cascade not null,
  operating_budget_id uuid references operating_budgets(id) on delete cascade,
  project_id          uuid references budget_projects(id) on delete cascade,
  source              text not null check (source in ('udgift','salg','arbejdstid')),
  category            text check (category in (
                        'frø','gødning','planteværn','redskaber','maskiner',
                        'foder','veterinær','forpagning','tilskud','løn','andet'
                      )),
  task_type           text check (task_type in ('såning','udplantning','lugning','høst','dyrepasning','flokflytning','andet')),
  description         text,
  estimated_amount_dkk numeric, -- udgift/salg: negativ=udgift, positiv=indtægt
  estimated_hours      numeric, -- arbejdstid
  created_at          timestamptz default now(),
  check (
    (operating_budget_id is not null and project_id is null) or
    (operating_budget_id is null and project_id is not null)
  )
);

create index if not exists budget_lines_operating_budget_idx on budget_lines(operating_budget_id);
create index if not exists budget_lines_project_idx on budget_lines(project_id);

alter table budget_lines enable row level security;
create policy "Brugere ser egne budgetlinjer" on budget_lines for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egne budgetlinjer" on budget_lines for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egne budgetlinjer" on budget_lines for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egne budgetlinjer" on budget_lines for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);
