-- ============================================================
-- AFGRØDEDATABASEN — Tillæg 4
-- Kør EFTER crop_database_seed_3.sql
-- Glaskål (= knudekål/kohlrabi, afklaret af Zaki), "Ingrid" ærter
-- (dansk landsort tørreært, afklaret af Zaki) og navngivne spiseblomster
-- (tallerkenismækker er samme art som kapucinerkarse fra tillæg 3 —
-- tilføjer ikke igen).
-- ============================================================

insert into crop_species (id, family_id, name_da, scientific_name, plant_type) values
  ('a1000000-0000-0000-0000-000000000140', 'f1000000-0000-0000-0000-000000000003', 'Glaskål (knudekål)', 'Brassica oleracea var. gongylodes', 'etårig'),
  ('a1000000-0000-0000-0000-000000000141', null,                                    'Agurkurt',            'Borago officinalis',               'etårig'),
  ('a1000000-0000-0000-0000-000000000142', 'f1000000-0000-0000-0000-000000000004', 'Morgenfrue',          'Calendula officinalis',            'etårig'),
  ('a1000000-0000-0000-0000-000000000143', null,                                    'Stedmoderblomst',     'Viola × wittrockiana',             'etårig'),
  ('a1000000-0000-0000-0000-000000000144', 'f1000000-0000-0000-0000-000000000004', 'Kornblomst',          'Centaurea cyanus',                  'etårig')
on conflict do nothing;

insert into crop_varieties (
  species_id, name, heritage, heritage_source, variety_type, description,
  direct_sow, indoor_propagation,
  sowing_depth_cm, germination_temp_min_c, germination_temp_opt_c,
  germination_days_min, germination_days_max,
  needs_bottom_heat, weeks_to_transplant,
  sow_indoor_from_month, sow_indoor_to_month,
  direct_sow_from_month, direct_sow_to_month,
  transplant_from_month, transplant_to_month,
  harvest_from_month, harvest_to_month,
  days_to_harvest_transplant,
  row_spacing_cm, plant_spacing_cm,
  sun_requirements, watering_needs, frost_hardy,
  polytunnel_benefit, needs_support, pinching_required,
  companion_plants, incompatible_with, care_notes,
  yield_kg_per_sqm_min, yield_kg_per_sqm_max,
  avg_market_price_dkk_kg, is_system_variety
) values

-- ============================================================
-- GLASKÅL / KNUDEKÅL
-- ============================================================
('a1000000-0000-0000-0000-000000000140','Standard glaskål',false,null,'grøntsag',
 'Knudekål med sprød, mild smag — mellem kål og radise. Hurtigvoksende og pålidelig.',
 true,true, 1.0,18,22,5,10, true,5,
 3,4, 5,7, 5,6, 6,10, 45, 30,25,
 'fuld sol','høj',true,'ikke nødvendig',false,false,
 'Løg, salat','Tomat, jordbær',
 'Må ikke tørre ud — bliver træet og sejt af vandmangel. Høst ved 5–8 cm diameter (tennisboldstørrelse); for stor bliver den hård.',
 2.0,4.0,25,true),

-- ============================================================
-- AGURKURT / HJULKRONE
-- ============================================================
('a1000000-0000-0000-0000-000000000141','Agurkurt (standard)',false,null,'blomst',
 'Himmelblå stjerneblomster med mild agurkesmag. Blade og blomster begge spiselige — populær i drinks og kolde supper.',
 true,false, 1.5,15,20,5,15, false,null,
 null,null, 4,6, null,null, 6,9, null, 30,30,
 'fuld sol','middel',false,'ikke nødvendig',false,false,
 'Jordbær, tomat, squash',null,
 'Selvsår villigt — kan komme igen af sig selv næste år. Bierne elsker den.',
 null,null,null,true),

-- ============================================================
-- MORGENFRUE
-- ============================================================
('a1000000-0000-0000-0000-000000000142','Morgenfrue (standard)',false,null,'blomst',
 'Gul-orange spiseblomst — kronbladene kaldes "fattigmands-safran". Let krydret, let bitter smag.',
 true,false, 0.5,10,18,7,14, false,null,
 null,null, 4,6, null,null, 6,10, null, 25,25,
 'fuld sol','lav',false,'ikke nødvendig',false,false,
 'Tomat, kål',null,
 'Dryp kronbladene af og brug løst — de hele blomster visner hurtigt efter plukning. Blomstrer villigt hele sæsonen ved løbende afklipning.',
 null,null,null,true),

-- ============================================================
-- STEDMODERBLOMST / HORNVIOL
-- ============================================================
('a1000000-0000-0000-0000-000000000143','Stedmoderblomst (standard)',false,null,'blomst',
 'Findes i mange farvekombinationer. Mild, næsten neutral smag — velegnet til kager, desserter og drinks.',
 true,true, 0.3,15,20,10,20, false,6,
 3,4, 4,6, 5,6, 5,10, null, 20,15,
 'halvskygge','middel',true,'ikke nødvendig',false,false,
 null,null,
 'Tåler let frost. Klip visne blomster af løbende for at holde planten i gang med at blomstre.',
 null,null,null,true),

-- ============================================================
-- KORNBLOMST
-- ============================================================
('a1000000-0000-0000-0000-000000000144','Kornblomst (standard)',false,null,'blomst',
 'Dybblå spiseblomst. Smagen er neutral — bruges primært for den kraftige farve, frisk eller tørret.',
 true,false, 0.5,10,18,7,14, false,null,
 null,null, 4,6, null,null, 6,9, null, 25,20,
 'fuld sol','lav',false,'ikke nødvendig',true,false,
 'Tomat, kål',null,
 'Kan blive høj og lidt løs — et tyndt hegn eller net holder den opret. Tørrede kronblade holder farven godt.',
 null,null,null,true),

-- ============================================================
-- ÆRT — "Ingrid" (dansk landsort, tørreært/"den nordiske kikært")
-- ============================================================
('a1000000-0000-0000-0000-000000000060','Ingrid',true,null,'grøntsag',
 'Gammel dansk landsort af gul markært, dyrket til tørring siden oldtiden — ofte kaldt "den nordiske kikært" fordi den trives i dansk klima og har en fast, nøddeagtig struktur når den er tørret.',
 true,false, 4.0,7,16,7,16, false,null,
 null,null, 4,5, null,null, 8,9, null, 22,7,
 'fuld sol','middel',true,'ikke nødvendig',true,false,
 'Gulerod, radise, salat','Løg, hvidløg',
 'Høstes IKKE grøn som Sugar Snap — lad bælgene blive helt gule og pergamentagtige på planten, bælg dem derefter ud og eftertør indenfor. Kræver hegn eller pinde at klatre på. Kan opbevares tørret i årevis.',
 0.3,0.7,60,true);
