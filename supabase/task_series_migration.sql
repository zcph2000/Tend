-- =============================================================================
-- GENTAGENDE OPGAVER + SEKTIONS-NIVEAU
-- Nogle opgaver (fx lugning) spænder naturligt over et helt bed eller en hel
-- sektion i stedet for én bestemt afgrøde, og gentages med fast interval
-- (fx ugentligt) mens afgrøden(erne) står i jorden. task_series er "opskriften"
-- (frekvens + periode), og der genereres én rigtig farm_tasks-række pr. gang —
-- så alt eksisterende UI (afkrydsning, tidslogning) virker uændret.
-- =============================================================================

create table if not exists task_series (
  id                uuid primary key default gen_random_uuid(),
  farm_id           uuid references farms(id) on delete cascade not null,
  -- præcis ét af disse tre sættes — bestemmer opgavens niveau
  bed_planting_id   uuid references bed_plantings(id) on delete cascade,
  bed_id            uuid references beds(id) on delete cascade,
  bed_section_id    uuid references bed_sections(id) on delete cascade,
  title             text not null,
  task_type         text
                      check (task_type in ('såning','udplantning','lugning','høst','dyrepasning','flokflytning','andet')),
  category          text default 'jordbrug',
  frequency_days    integer not null,
  start_date        date not null,
  end_date          date not null,
  status            text default 'aktiv' check (status in ('aktiv','afsluttet')),
  created_at        timestamptz default now()
);

create index if not exists task_series_farm_idx on task_series(farm_id);

alter table task_series enable row level security;

create policy "Brugere ser egne opgaveserier" on task_series for select using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opretter egne opgaveserier" on task_series for insert with check (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere opdaterer egne opgaveserier" on task_series for update using (
  farm_id in (select id from farms where user_id = auth.uid())
);
create policy "Brugere sletter egne opgaveserier" on task_series for delete using (
  farm_id in (select id from farms where user_id = auth.uid())
);

-- Hver genereret forekomst peger tilbage på sin serie (til rollup + "afslut serie"),
-- og kan nu også høre til en hel sektion (spænder over flere bede), ikke kun ét bed.
alter table farm_tasks
  add column if not exists series_id uuid references task_series(id) on delete cascade,
  add column if not exists bed_section_id uuid references bed_sections(id) on delete cascade;

create index if not exists farm_tasks_series_idx on farm_tasks(series_id);
create index if not exists farm_tasks_bed_section_idx on farm_tasks(bed_section_id);
