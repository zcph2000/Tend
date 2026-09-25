-- =============================================================================
-- TIDSESTIMERING PÅ OPGAVER (Fase 2 af økonomi-modulet)
-- Estimeret vs. faktisk tidsforbrug på kalenderopgaver og flokflytninger,
-- så systemet over tid kan foreslå bedre estimater ud fra egne loggede tal.
-- =============================================================================

alter table farm_tasks
  add column if not exists task_type text
    check (task_type in ('såning','udplantning','lugning','høst','dyrepasning','flokflytning','andet')),
  add column if not exists estimated_minutes integer,
  add column if not exists actual_minutes integer,
  add column if not exists flock_id uuid references flocks(id) on delete set null;

create index if not exists farm_tasks_task_type_idx on farm_tasks(task_type);
create index if not exists farm_tasks_flock_idx     on farm_tasks(flock_id);

-- Flokflytning er ikke en farm_task (den beregnes live ud fra grazing_records),
-- så estimat/faktisk tid sættes direkte på selve flytningen.
alter table grazing_records
  add column if not exists estimated_move_minutes integer,
  add column if not exists actual_move_minutes integer;

-- Bruges senere (driftsbudget) til at omregne registreret arbejdstid til en
-- beregnet kronemæssig arbejdsomkostning.
alter table farms
  add column if not exists default_hourly_rate_dkk numeric;
