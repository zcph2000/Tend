-- =============================================================================
-- Opgaver knyttet direkte til et bed (ikke kun til én specifik plantning) —
-- fx lugning eller anden generel bedvedligehold, så tidsregistrering kan
-- ske fra bedets egen side, ikke kun via kalenderen.
-- =============================================================================

alter table farm_tasks
  add column if not exists bed_id uuid references beds(id) on delete cascade;

create index if not exists farm_tasks_bed_idx on farm_tasks(bed_id);
