-- ============================================================
-- SPACING — Rækkeafstand og planteafstand
-- Kør i Supabase SQL Editor
-- ============================================================

-- Anbefalede afstande på sorten (kan tilsidesættes pr. planting)
alter table crop_varieties
  add column if not exists row_spacing_cm   numeric,
  add column if not exists plant_spacing_cm numeric;

-- Opdatér eksisterende sorter med artsbundne standarder
-- (bruger scientific_name på crop_species)

update crop_varieties cv
set row_spacing_cm = 70, plant_spacing_cm = 60
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Solanum lycopersicum%';

update crop_varieties cv
set row_spacing_cm = 60, plant_spacing_cm = 50
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Capsicum annuum%';

update crop_varieties cv
set row_spacing_cm = 60, plant_spacing_cm = 50
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Brassica oleracea%';

update crop_varieties cv
set row_spacing_cm = 15, plant_spacing_cm = 5
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Raphanus sativus%';

update crop_varieties cv
set row_spacing_cm = 25, plant_spacing_cm = 5
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Daucus carota%';

update crop_varieties cv
set row_spacing_cm = 25, plant_spacing_cm = 10
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Petroselinum crispum%';

update crop_varieties cv
set row_spacing_cm = 60, plant_spacing_cm = 10
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Pisum sativum%';

update crop_varieties cv
set row_spacing_cm = 50, plant_spacing_cm = 15
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Phaseolus vulgaris%';

update crop_varieties cv
set row_spacing_cm = 45, plant_spacing_cm = 20
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Vicia faba%';

update crop_varieties cv
set row_spacing_cm = 100, plant_spacing_cm = 50
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Cucumis sativus%';

update crop_varieties cv
set row_spacing_cm = 120, plant_spacing_cm = 80
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Cucurbita%';

update crop_varieties cv
set row_spacing_cm = 30, plant_spacing_cm = 10
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Beta vulgaris%';

update crop_varieties cv
set row_spacing_cm = 25, plant_spacing_cm = 8
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Spinacia oleracea%';

update crop_varieties cv
set row_spacing_cm = 25, plant_spacing_cm = 10
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Allium cepa%';

update crop_varieties cv
set row_spacing_cm = 30, plant_spacing_cm = 15
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Allium ampeloprasum%';

update crop_varieties cv
set row_spacing_cm = 25, plant_spacing_cm = 10
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Allium sativum%';

update crop_varieties cv
set row_spacing_cm = 30, plant_spacing_cm = 25
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Lactuca sativa%';

update crop_varieties cv
set row_spacing_cm = 40, plant_spacing_cm = 30
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Fragaria%';

update crop_varieties cv
set row_spacing_cm = 70, plant_spacing_cm = 30
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Solanum tuberosum%';

update crop_varieties cv
set row_spacing_cm = 40, plant_spacing_cm = 30
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Apium graveolens%';

update crop_varieties cv
set row_spacing_cm = 30, plant_spacing_cm = 10
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Pastinaca sativa%';

update crop_varieties cv
set row_spacing_cm = 70, plant_spacing_cm = 30
from crop_species cs
where cv.species_id = cs.id and cs.scientific_name ilike 'Zea mays%';

-- Fallback for resterende uden spacing
update crop_varieties set row_spacing_cm = 40, plant_spacing_cm = 25
where row_spacing_cm is null;

-- -------------------------------------------------------
-- Nye kolonner på plantinger (faktisk brugt, kan afvige)
-- -------------------------------------------------------
alter table bed_plantings
  add column if not exists row_spacing_cm   numeric,
  add column if not exists plant_spacing_cm numeric,
  add column if not exists bed_offset_m     numeric default 0,
  add column if not exists zone_length_m    numeric;
