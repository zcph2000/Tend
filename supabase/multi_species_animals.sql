-- ============================================================
-- MULTI-DYR — flokdyr (høns) vs. individdyr, og art på rotationsflokke
-- Kør i Supabase SQL Editor
-- ============================================================

-- Flokdyr (høns m.fl.) registreres som antal i stedet for ét kort pr. dyr.
-- Øremærke og køn giver ikke mening for en flok, så de gøres valgfrie.
alter table animals
  add column if not exists is_batch boolean not null default false,
  add column if not exists head_count_female integer,
  add column if not exists head_count_male integer;

alter table animals alter column ear_tag drop not null;
alter table animals alter column sex drop not null;

-- Rotationsflokke (flocks) manglede en art, så rotationsberegningen
-- (getGrazingRecommendation/getOptimalSectionSize i lib/utils.ts) reelt
-- altid antog får, uanset hvad flokken faktisk bestod af.
alter table flocks add column if not exists species text;
