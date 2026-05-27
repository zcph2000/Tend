-- =============================================================================
-- Demo-data seed til test-login
-- Kør i Supabase SQL Editor EFTER du har oprettet demo@tend.dk i Authentication
-- =============================================================================

DO $$
DECLARE
  v_user_id     uuid;
  v_farm_id     uuid;

  -- Flokke
  v_lam_id      uuid;
  v_hons_id     uuid;

  -- Bede-sektioner
  v_sydhaven_id uuid;
  v_drivhus_id  uuid;

  -- Bede
  v_b1 uuid; v_b2 uuid; v_b3 uuid; v_b4 uuid;
  v_d1 uuid; v_d2 uuid;

BEGIN

  -- ── 0. Find demo-brugeren ──────────────────────────────────────────────
  SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'demo@tend.dk';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Bruger demo@tend.dk findes ikke — opret den i Authentication → Users → Add user først';
  END IF;

  -- ── 1. Gård ───────────────────────────────────────────────────────────
  INSERT INTO farms (user_id, name, location, lat, lng, profile)
  VALUES (
    v_user_id,
    'Mosegård Demo',
    'Odsherred, Danmark',
    55.8012,
    11.6543,
    'Demonstrationsgård med regenerativt fokus. Blandet drift med lam og høns, markedshave og drivhus. Formål: regenerere jord og producere mad til lokale kunder.'
  )
  RETURNING id INTO v_farm_id;

  -- ── 2. Flokke ─────────────────────────────────────────────────────────
  INSERT INTO flocks (farm_id, name)
    VALUES (v_farm_id, 'Lam 2026')
    RETURNING id INTO v_lam_id;

  INSERT INTO flocks (farm_id, name)
    VALUES (v_farm_id, 'Høns')
    RETURNING id INTO v_hons_id;

  -- ── 3. Dyr — lam ──────────────────────────────────────────────────────
  INSERT INTO animals (farm_id, flock_id, ear_tag, name, species, breed, sex, birth_date, status)
  VALUES
    (v_farm_id, v_lam_id, 'DK-2026-001', 'Frida',   'sheep', 'Texel',    'female', '2026-03-12', 'active'),
    (v_farm_id, v_lam_id, 'DK-2026-002', 'Bjørk',   'sheep', 'Texel',    'male',   '2026-03-14', 'active'),
    (v_farm_id, v_lam_id, 'DK-2026-003', 'Mos',     'sheep', 'Texel',    'female', '2026-03-15', 'active'),
    (v_farm_id, v_lam_id, 'DK-2026-004', 'Kløver',  'sheep', 'Texel',    'female', '2026-03-20', 'active'),
    (v_farm_id, v_lam_id, 'DK-2026-005', 'Hede',    'sheep', 'Gotlandsk','male',   '2026-03-22', 'active'),
    (v_farm_id, v_lam_id, 'DK-2026-006', 'Tjørn',   'sheep', 'Gotlandsk','female', '2026-03-25', 'active'),
    (v_farm_id, v_lam_id, 'DK-2026-007', 'Vind',    'sheep', 'Texel',    'male',   '2026-04-01', 'active'),
    (v_farm_id, v_lam_id, 'DK-2026-008', 'Sol',     'sheep', 'Texel',    'female', '2026-04-03', 'active');

  -- Høns (ingen individuelle navne)
  INSERT INTO animals (farm_id, flock_id, ear_tag, species, sex, status)
  VALUES
    (v_farm_id, v_hons_id, 'H-01', 'chicken', 'female', 'active'),
    (v_farm_id, v_hons_id, 'H-02', 'chicken', 'female', 'active'),
    (v_farm_id, v_hons_id, 'H-03', 'chicken', 'female', 'active'),
    (v_farm_id, v_hons_id, 'H-04', 'chicken', 'female', 'active'),
    (v_farm_id, v_hons_id, 'H-05', 'chicken', 'female', 'active'),
    (v_farm_id, v_hons_id, 'H-06', 'chicken', 'female', 'active'),
    (v_farm_id, v_hons_id, 'H-07', 'chicken', 'female', 'active'),
    (v_farm_id, v_hons_id, 'H-08', 'chicken', 'female', 'active'),
    (v_farm_id, v_hons_id, 'H-09', 'chicken', 'female', 'active'),
    (v_farm_id, v_hons_id, 'H-10', 'chicken', 'female', 'active'),
    (v_farm_id, v_hons_id, 'H-11', 'chicken', 'female', 'active'),
    (v_farm_id, v_hons_id, 'H-12', 'chicken', 'female', 'active');

  -- ── 4. Bede-sektioner ─────────────────────────────────────────────────
  INSERT INTO bed_sections (farm_id, name, orientation_degrees)
    VALUES (v_farm_id, 'Sydhaven', 0)
    RETURNING id INTO v_sydhaven_id;

  INSERT INTO bed_sections (farm_id, name, orientation_degrees)
    VALUES (v_farm_id, 'Drivhuset', 0)
    RETURNING id INTO v_drivhus_id;

  -- ── 5. Bede ───────────────────────────────────────────────────────────
  INSERT INTO beds (farm_id, section_id, name, length_m, width_m, location_type)
    VALUES (v_farm_id, v_sydhaven_id, 'Bed 1', 6.0, 1.2, 'friland')   RETURNING id INTO v_b1;
  INSERT INTO beds (farm_id, section_id, name, length_m, width_m, location_type)
    VALUES (v_farm_id, v_sydhaven_id, 'Bed 2', 6.0, 1.2, 'friland')   RETURNING id INTO v_b2;
  INSERT INTO beds (farm_id, section_id, name, length_m, width_m, location_type)
    VALUES (v_farm_id, v_sydhaven_id, 'Bed 3', 6.0, 1.2, 'friland')   RETURNING id INTO v_b3;
  INSERT INTO beds (farm_id, section_id, name, length_m, width_m, location_type)
    VALUES (v_farm_id, v_sydhaven_id, 'Bed 4', 6.0, 1.2, 'friland')   RETURNING id INTO v_b4;
  INSERT INTO beds (farm_id, section_id, name, length_m, width_m, location_type)
    VALUES (v_farm_id, v_drivhus_id,  'Drivhus 1', 8.0, 1.5, 'polytunnel') RETURNING id INTO v_d1;
  INSERT INTO beds (farm_id, section_id, name, length_m, width_m, location_type)
    VALUES (v_farm_id, v_drivhus_id,  'Drivhus 2', 8.0, 1.5, 'polytunnel') RETURNING id INTO v_d2;

  -- ── 6. Plantinger ─────────────────────────────────────────────────────

  -- Bed 1: Salat (plantet ud) + Gulerødder (planlagt)
  INSERT INTO bed_plantings
    (farm_id, bed_id, crop_name, variety, method,
     transplanted_at, expected_harvest_at,
     quantity_plants, row_spacing_cm, plant_spacing_cm,
     bed_offset_m, zone_length_m, status, season)
  VALUES
    (v_farm_id, v_b1, 'Salat', 'Lollo Bionda', 'udplantet_eget',
     '2026-04-10', '2026-06-05',
     40, 30, 25, 0, 3.0, 'plantet', 2026);

  INSERT INTO bed_plantings
    (farm_id, bed_id, crop_name, variety, method,
     sowed_at, expected_harvest_at,
     row_spacing_cm, plant_spacing_cm,
     bed_offset_m, zone_length_m, status, season)
  VALUES
    (v_farm_id, v_b1, 'Gulerødder', 'Nantes 5', 'direkte_sået',
     '2026-05-01', '2026-08-15',
     20, 5, 3.0, 3.0, 'planlagt', 2026);

  -- Bed 2: Broccoli
  INSERT INTO bed_plantings
    (farm_id, bed_id, crop_name, variety, method,
     transplanted_at, expected_harvest_at,
     quantity_plants, row_spacing_cm, plant_spacing_cm,
     bed_offset_m, zone_length_m, status, season)
  VALUES
    (v_farm_id, v_b2, 'Broccoli', 'Calabrese', 'udplantet_eget',
     '2026-04-22', '2026-07-10',
     12, 60, 50, 0, 6.0, 'plantet', 2026);

  -- Bed 3: Ærter + Spinat
  INSERT INTO bed_plantings
    (farm_id, bed_id, crop_name, variety, method,
     sowed_at, expected_harvest_at,
     bed_offset_m, zone_length_m, status, season)
  VALUES
    (v_farm_id, v_b3, 'Ærter', 'Ambassador', 'direkte_sået',
     '2026-03-28', '2026-06-20',
     0, 3.0, 'spiret', 2026),
    (v_farm_id, v_b3, 'Spinat', 'Matador', 'direkte_sået',
     '2026-04-05', '2026-05-28',
     3.0, 3.0, 'plantet', 2026);

  -- Bed 4: Løg (planlagt)
  INSERT INTO bed_plantings
    (farm_id, bed_id, crop_name, variety, method,
     sowed_at, transplanted_at, expected_harvest_at,
     quantity_plants, row_spacing_cm, plant_spacing_cm,
     bed_offset_m, zone_length_m, status, season)
  VALUES
    (v_farm_id, v_b4, 'Løg', 'Stuttgarter', 'udplantet_eget',
     '2026-03-01', '2026-05-20', '2026-08-20',
     60, 30, 10, 0, 6.0, 'planlagt', 2026);

  -- Drivhus 1: Tomater
  INSERT INTO bed_plantings
    (farm_id, bed_id, crop_name, variety, method,
     transplanted_at, expected_harvest_at,
     quantity_plants, row_spacing_cm, plant_spacing_cm,
     bed_offset_m, zone_length_m, status, season)
  VALUES
    (v_farm_id, v_d1, 'Tomat', 'Sungold', 'udplantet_eget',
     '2026-05-08', '2026-08-01',
     8, 60, 60, 0, 5.0, 'plantet', 2026),
    (v_farm_id, v_d1, 'Basilikum', 'Genovese', 'udplantet_eget',
     '2026-05-08', '2026-07-01',
     6, 30, 25, 5.5, 2.0, 'plantet', 2026);

  -- Drivhus 2: Agurker + Peber
  INSERT INTO bed_plantings
    (farm_id, bed_id, crop_name, variety, method,
     transplanted_at, expected_harvest_at,
     quantity_plants, row_spacing_cm, plant_spacing_cm,
     bed_offset_m, zone_length_m, status, season)
  VALUES
    (v_farm_id, v_d2, 'Agurk', 'Marketmore', 'udplantet_eget',
     '2026-05-10', '2026-07-20',
     6, 60, 60, 0, 4.0, 'plantet', 2026),
    (v_farm_id, v_d2, 'Peber', 'California Wonder', 'udplantet_eget',
     '2026-05-10', '2026-08-15',
     4, 50, 50, 4.5, 3.0, 'plantet', 2026);

  -- ── 7. Kalenderopgaver ────────────────────────────────────────────────
  INSERT INTO farm_tasks (farm_id, title, due_date, category, timing_type, status, source_type)
  VALUES
    (v_farm_id, 'Vand tomater og agurker i drivhuset',
     CURRENT_DATE,          'jordbrug', 'exact', 'pending', 'manual'),
    (v_farm_id, 'Tjek hegn — Lamme-fold øst',
     CURRENT_DATE + 2,      'dyr',      'exact', 'pending', 'manual'),
    (v_farm_id, 'Høst spinat — Bed 3',
     CURRENT_DATE + 4,      'jordbrug', 'week',  'pending', 'manual'),
    (v_farm_id, 'Registrér æglægning — Høns',
     CURRENT_DATE + 1,      'dyr',      'week',  'pending', 'manual'),
    (v_farm_id, 'Flyt lam til ny section',
     CURRENT_DATE + 6,      'dyr',      'exact', 'pending', 'manual'),
    (v_farm_id, 'Gøde bede med kompost — Sydhaven',
     CURRENT_DATE + 10,     'jordbrug', 'week',  'pending', 'manual'),
    (v_farm_id, 'Udplant løg — Bed 4',
     '2026-05-20',          'jordbrug', 'exact', 'pending', 'planting'),
    (v_farm_id, 'Høst broccoli — Bed 2',
     '2026-07-10',          'jordbrug', 'week',  'pending', 'planting');

  RAISE NOTICE '✓ Demo-data oprettet for Mosegård (farm_id: %)', v_farm_id;
  RAISE NOTICE '  - 2 flokke: 8 lam + 12 høns';
  RAISE NOTICE '  - 2 sektioner: Sydhaven (4 bede) + Drivhuset (2 bede)';
  RAISE NOTICE '  - 10 plantinger på tværs af bedene';
  RAISE NOTICE '  - 8 kalenderopgaver';

END $$;
