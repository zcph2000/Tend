-- =============================================================================
-- Tilknyt flok til dyreprodukter og udgifter
-- =============================================================================

alter table animal_product_logs
  add column if not exists flock_id uuid references flocks(id) on delete set null;

alter table farm_expenses
  add column if not exists flock_id uuid references flocks(id) on delete set null;

create index if not exists animal_product_logs_flock_idx on animal_product_logs(flock_id);
create index if not exists farm_expenses_flock_idx       on farm_expenses(flock_id);
