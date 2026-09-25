-- =============================================================================
-- Kobler farm_expenses til opstartsprojekter (Fase 3c), så et projekts
-- "faktisk forbrug" kan læses direkte af den udgiftsregistrering man
-- alligevel bruger i dag — ingen ny logningstabel.
-- =============================================================================

alter table farm_expenses
  add column if not exists project_id uuid references budget_projects(id) on delete set null,
  add column if not exists hours numeric; -- valgfri, til løn-kategori: hvor mange timer beløbet dækker

create index if not exists farm_expenses_project_idx on farm_expenses(project_id);
