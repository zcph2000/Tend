-- ============================================================
-- FARM_TASKS ↔ BED_PLANTINGS — kobling så opgaver kan ryddes op
-- Kør i Supabase SQL Editor
-- ============================================================

-- Uden denne kolonne var der ingen måde at vide hvilken opgave der hørte
-- til hvilken plantning — så når en plantning blev slettet (fx via "Slet"
-- i bed-redigeringen), blev dens automatisk oprettede opgaver ("Sæt til
-- at spire", "Udplant", "Høst") aldrig ryddet op, og blev stående som
-- spøgelsesopgaver i kalenderen for evigt.
alter table farm_tasks
  add column if not exists bed_planting_id uuid references bed_plantings(id) on delete cascade;

create index if not exists farm_tasks_bed_planting_idx on farm_tasks(bed_planting_id);
