-- Tilføjer beløbs-skøn/faktisk til opgaver (parallelt med estimated_minutes/actual_minutes)
-- og en "indkøb"-opgavetype til fx "Køb frø".

alter table farm_tasks add column if not exists estimated_cost_dkk numeric;
alter table farm_tasks add column if not exists actual_cost_dkk numeric;

alter table farm_tasks drop constraint if exists farm_tasks_task_type_check;
alter table farm_tasks add constraint farm_tasks_task_type_check
  check (task_type = any (array['såning','udplantning','lugning','høst','dyrepasning','flokflytning','indkøb','andet']));
