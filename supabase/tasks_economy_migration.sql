-- =============================================================================
-- FARM TASKS — manuelle og auto-genererede opgaver på gården
-- =============================================================================

create table if not exists farm_tasks (
  id            uuid primary key default gen_random_uuid(),
  farm_id       uuid references farms(id) on delete cascade not null,
  title         text not null,
  notes         text,
  due_date      date,
  due_date_end  date,                          -- slutdato for flydende opgaver (fx "i løbet af ugen")
  timing_type   text default 'exact'
                  check (timing_type in ('exact', 'week', 'month')),
  status        text default 'pending'
                  check (status in ('pending', 'done', 'skipped')),
  category      text default 'andet'
                  check (category in ('jordbrug', 'dyr', 'admin', 'økonomi', 'andet')),
  source_type   text
                  check (source_type in ('manual', 'planting', 'rotation', 'animal_event')),
  source_id     uuid,                          -- UUID til kilderegistering (bed_planting.id o.l.)
  done_at       timestamptz,
  created_at    timestamptz default now()
);

create index if not exists farm_tasks_farm_id_idx      on farm_tasks(farm_id);
create index if not exists farm_tasks_due_date_idx     on farm_tasks(due_date);
create index if not exists farm_tasks_status_idx       on farm_tasks(status);

alter table farm_tasks enable row level security;

create policy "Brugere ser egne opgaver" on farm_tasks for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egne opgaver" on farm_tasks for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egne opgaver" on farm_tasks for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egne opgaver" on farm_tasks for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);


-- =============================================================================
-- HARVEST LOGS — hvad er faktisk høstet, hvornår og hvor meget
-- =============================================================================

create table if not exists harvest_logs (
  id              uuid primary key default gen_random_uuid(),
  farm_id         uuid references farms(id) on delete cascade not null,
  planting_id     uuid references bed_plantings(id) on delete set null,
  bed_id          uuid references beds(id) on delete set null,
  harvest_date    date not null default current_date,
  quantity_kg     numeric,
  notes           text,
  sold_to         text,                        -- fx "Gårdbutik", "Restaurant X", "Privat"
  price_per_kg    numeric,
  created_at      timestamptz default now()
);

create index if not exists harvest_logs_farm_id_idx    on harvest_logs(farm_id);
create index if not exists harvest_logs_planting_idx   on harvest_logs(planting_id);
create index if not exists harvest_logs_date_idx       on harvest_logs(harvest_date);

alter table harvest_logs enable row level security;

create policy "Brugere ser egne høstlogs" on harvest_logs for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egne høstlogs" on harvest_logs for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egne høstlogs" on harvest_logs for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egne høstlogs" on harvest_logs for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);


-- =============================================================================
-- FARM EXPENSES — udgifter og tilskud for økonomimodulet
-- =============================================================================

create table if not exists farm_expenses (
  id              uuid primary key default gen_random_uuid(),
  farm_id         uuid references farms(id) on delete cascade not null,
  date            date not null default current_date,
  category        text not null
                    check (category in (
                      'frø', 'gødning', 'planteværn', 'redskaber', 'maskiner',
                      'foder', 'veterinær', 'forpagning', 'tilskud', 'løn', 'andet'
                    )),
  description     text,
  amount_dkk      numeric not null,            -- negativt = udgift, positivt = tilskud/salg
  linked_bed_id   uuid references beds(id) on delete set null,
  linked_animal_id uuid,                       -- refs animals(id) — ingen FK for fleksibilitet
  receipt_url     text,                        -- fremtidig: foto af bilag via Supabase Storage
  created_at      timestamptz default now()
);

create index if not exists farm_expenses_farm_id_idx   on farm_expenses(farm_id);
create index if not exists farm_expenses_date_idx      on farm_expenses(date);
create index if not exists farm_expenses_category_idx  on farm_expenses(category);

alter table farm_expenses enable row level security;

create policy "Brugere ser egne udgifter" on farm_expenses for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egne udgifter" on farm_expenses for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egne udgifter" on farm_expenses for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egne udgifter" on farm_expenses for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);
