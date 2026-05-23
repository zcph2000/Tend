-- ============================================================
-- AFGRØDEDATABASEN — Pre-seed data
-- Kør EFTER crop_database_schema.sql
-- Timing kalibreret til dansk klima, zone 7b (kystnær Sjælland)
-- Afstande baseret på Charles Dowding / no-dig markedshave
-- ============================================================

insert into crop_families (id, name_da, scientific_name) values
  ('f1000000-0000-0000-0000-000000000001', 'Natskyggefamilien',         'Solanaceae'),
  ('f1000000-0000-0000-0000-000000000002', 'Agurk- og græskarfamilien', 'Cucurbitaceae'),
  ('f1000000-0000-0000-0000-000000000003', 'Kålfamilien',               'Brassicaceae'),
  ('f1000000-0000-0000-0000-000000000004', 'Kurvblomsterne',            'Asteraceae'),
  ('f1000000-0000-0000-0000-000000000005', 'Skærmblomstfamilien',       'Apiaceae'),
  ('f1000000-0000-0000-0000-000000000006', 'Amarantfamilien',           'Amaranthaceae'),
  ('f1000000-0000-0000-0000-000000000007', 'Ærtefamilien',              'Fabaceae'),
  ('f1000000-0000-0000-0000-000000000008', 'Løgfamilien',               'Amaryllidaceae'),
  ('f1000000-0000-0000-0000-000000000009', 'Rosenfamilien',             'Rosaceae'),
  ('f1000000-0000-0000-0000-000000000010', 'Læbeblomsterne',            'Lamiaceae'),
  ('f1000000-0000-0000-0000-000000000011', 'Birkeamilien',              'Betulaceae'),
  ('f1000000-0000-0000-0000-000000000012', 'Stikkelsbærfamilien',       'Grossulariaceae'),
  ('f1000000-0000-0000-0000-000000000013', 'Blåbærfamilien',            'Ericaceae')
on conflict do nothing;

insert into crop_species (id, family_id, name_da, scientific_name, plant_type) values
  ('a1000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'Tomat',            'Solanum lycopersicum',            'etårig'),
  ('a1000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'Peberfrugt',       'Capsicum annuum',                 'etårig'),
  ('a1000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000001', 'Aubergine',        'Solanum melongena',               'etårig'),
  ('a1000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000001', 'Kartoffel',        'Solanum tuberosum',               'etårig'),
  ('a1000000-0000-0000-0000-000000000010', 'f1000000-0000-0000-0000-000000000002', 'Agurk',            'Cucumis sativus',                 'etårig'),
  ('a1000000-0000-0000-0000-000000000011', 'f1000000-0000-0000-0000-000000000002', 'Squash/Zucchini',  'Cucurbita pepo',                  'etårig'),
  ('a1000000-0000-0000-0000-000000000012', 'f1000000-0000-0000-0000-000000000002', 'Græskar',          'Cucurbita maxima',                'etårig'),
  ('a1000000-0000-0000-0000-000000000020', 'f1000000-0000-0000-0000-000000000003', 'Grønkål',          'Brassica oleracea var. sabellica','etårig'),
  ('a1000000-0000-0000-0000-000000000021', 'f1000000-0000-0000-0000-000000000003', 'Broccoli',         'Brassica oleracea var. italica',  'etårig'),
  ('a1000000-0000-0000-0000-000000000022', 'f1000000-0000-0000-0000-000000000003', 'Blomkål',          'Brassica oleracea var. botrytis', 'etårig'),
  ('a1000000-0000-0000-0000-000000000023', 'f1000000-0000-0000-0000-000000000003', 'Hvidkål',          'Brassica oleracea var. capitata', 'etårig'),
  ('a1000000-0000-0000-0000-000000000024', 'f1000000-0000-0000-0000-000000000003', 'Radise',           'Raphanus sativus',                'etårig'),
  ('a1000000-0000-0000-0000-000000000025', 'f1000000-0000-0000-0000-000000000003', 'Rucola',           'Eruca vesicaria',                 'etårig'),
  ('a1000000-0000-0000-0000-000000000030', 'f1000000-0000-0000-0000-000000000004', 'Salat',            'Lactuca sativa',                  'etårig'),
  ('a1000000-0000-0000-0000-000000000031', 'f1000000-0000-0000-0000-000000000004', 'Bladcikorie',      'Cichorium intybus',               'flerårig'),
  ('a1000000-0000-0000-0000-000000000040', 'f1000000-0000-0000-0000-000000000005', 'Gulerod',          'Daucus carota',                   'toårig'),
  ('a1000000-0000-0000-0000-000000000041', 'f1000000-0000-0000-0000-000000000005', 'Pastinak',         'Pastinaca sativa',                'toårig'),
  ('a1000000-0000-0000-0000-000000000042', 'f1000000-0000-0000-0000-000000000005', 'Persille',         'Petroselinum crispum',            'toårig'),
  ('a1000000-0000-0000-0000-000000000043', 'f1000000-0000-0000-0000-000000000005', 'Dild',             'Anethum graveolens',              'etårig'),
  ('a1000000-0000-0000-0000-000000000044', 'f1000000-0000-0000-0000-000000000005', 'Fennikel',         'Foeniculum vulgare',              'etårig'),
  ('a1000000-0000-0000-0000-000000000045', 'f1000000-0000-0000-0000-000000000005', 'Koriander',        'Coriandrum sativum',              'etårig'),
  ('a1000000-0000-0000-0000-000000000050', 'f1000000-0000-0000-0000-000000000006', 'Spinat',           'Spinacia oleracea',               'etårig'),
  ('a1000000-0000-0000-0000-000000000051', 'f1000000-0000-0000-0000-000000000006', 'Mangold/Bladbede', 'Beta vulgaris var. cicla',        'etårig'),
  ('a1000000-0000-0000-0000-000000000052', 'f1000000-0000-0000-0000-000000000006', 'Rødbede',          'Beta vulgaris',                   'toårig'),
  ('a1000000-0000-0000-0000-000000000060', 'f1000000-0000-0000-0000-000000000007', 'Ært',              'Pisum sativum',                   'etårig'),
  ('a1000000-0000-0000-0000-000000000061', 'f1000000-0000-0000-0000-000000000007', 'Bønne',            'Phaseolus vulgaris',              'etårig'),
  ('a1000000-0000-0000-0000-000000000062', 'f1000000-0000-0000-0000-000000000007', 'Hestebønne',       'Vicia faba',                      'etårig'),
  ('a1000000-0000-0000-0000-000000000063', 'f1000000-0000-0000-0000-000000000007', 'Rødkløver',        'Trifolium pratense',              'flerårig'),
  ('a1000000-0000-0000-0000-000000000064', 'f1000000-0000-0000-0000-000000000007', 'Hvidkløver',       'Trifolium repens',                'flerårig'),
  ('a1000000-0000-0000-0000-000000000070', 'f1000000-0000-0000-0000-000000000008', 'Løg',              'Allium cepa',                     'toårig'),
  ('a1000000-0000-0000-0000-000000000071', 'f1000000-0000-0000-0000-000000000008', 'Hvidløg',          'Allium sativum',                  'flerårig'),
  ('a1000000-0000-0000-0000-000000000072', 'f1000000-0000-0000-0000-000000000008', 'Porrer',           'Allium porrum',                   'toårig'),
  ('a1000000-0000-0000-0000-000000000073', 'f1000000-0000-0000-0000-000000000008', 'Purløg',           'Allium schoenoprasum',            'flerårig'),
  ('a1000000-0000-0000-0000-000000000074', 'f1000000-0000-0000-0000-000000000008', 'Skalotteløg',      'Allium ascalonicum',              'flerårig'),
  ('a1000000-0000-0000-0000-000000000080', 'f1000000-0000-0000-0000-000000000009', 'Æble',             'Malus domestica',                 'vedplante'),
  ('a1000000-0000-0000-0000-000000000081', 'f1000000-0000-0000-0000-000000000009', 'Pære',             'Pyrus communis',                  'vedplante'),
  ('a1000000-0000-0000-0000-000000000082', 'f1000000-0000-0000-0000-000000000009', 'Blommetre',        'Prunus domestica',                'vedplante'),
  ('a1000000-0000-0000-0000-000000000083', 'f1000000-0000-0000-0000-000000000009', 'Kirsebærtræ',      'Prunus avium',                    'vedplante'),
  ('a1000000-0000-0000-0000-000000000084', 'f1000000-0000-0000-0000-000000000009', 'Hindbær',          'Rubus idaeus',                    'flerårig'),
  ('a1000000-0000-0000-0000-000000000085', 'f1000000-0000-0000-0000-000000000009', 'Jordbær',          'Fragaria × ananassa',             'flerårig'),
  ('a1000000-0000-0000-0000-000000000090', 'f1000000-0000-0000-0000-000000000012', 'Ribs',             'Ribes rubrum',                    'vedplante'),
  ('a1000000-0000-0000-0000-000000000091', 'f1000000-0000-0000-0000-000000000012', 'Solbær',           'Ribes nigrum',                    'vedplante'),
  ('a1000000-0000-0000-0000-000000000092', 'f1000000-0000-0000-0000-000000000012', 'Stikkelsbær',      'Ribes uva-crispa',                'vedplante'),
  ('a1000000-0000-0000-0000-000000000100', 'f1000000-0000-0000-0000-000000000010', 'Basilikum',        'Ocimum basilicum',                'etårig'),
  ('a1000000-0000-0000-0000-000000000101', 'f1000000-0000-0000-0000-000000000010', 'Timian',           'Thymus vulgaris',                 'flerårig'),
  ('a1000000-0000-0000-0000-000000000102', 'f1000000-0000-0000-0000-000000000010', 'Salvie',           'Salvia officinalis',              'flerårig'),
  ('a1000000-0000-0000-0000-000000000103', 'f1000000-0000-0000-0000-000000000010', 'Rosmarin',         'Salvia rosmarinus',               'flerårig'),
  ('a1000000-0000-0000-0000-000000000104', 'f1000000-0000-0000-0000-000000000010', 'Mynthe',           'Mentha spicata',                  'flerårig'),
  ('a1000000-0000-0000-0000-000000000110', 'f1000000-0000-0000-0000-000000000011', 'Hassel',           'Corylus avellana',                'vedplante'),
  ('a1000000-0000-0000-0000-000000000120', 'f1000000-0000-0000-0000-000000000013', 'Blåbær',           'Vaccinium corymbosum',            'vedplante')
on conflict do nothing;

-- ============================================================
-- SORTER
-- Kolonner i rækkefølge (39 total):
--   species_id, name, heritage, heritage_source, variety_type, description,
--   direct_sow, indoor_propagation,
--   sowing_depth_cm, germination_temp_min_c, germination_temp_opt_c,
--   germination_days_min, germination_days_max,
--   needs_bottom_heat, weeks_to_transplant,
--   sow_indoor_from_month, sow_indoor_to_month,
--   direct_sow_from_month, direct_sow_to_month,   ← altid med, null hvis ikke relevant
--   transplant_from_month, transplant_to_month,
--   harvest_from_month, harvest_to_month,
--   days_to_harvest_transplant,
--   row_spacing_cm, plant_spacing_cm,
--   sun_requirements, watering_needs, frost_hardy,
--   polytunnel_benefit, needs_support, pinching_required,
--   companion_plants, incompatible_with, care_notes,
--   yield_kg_per_sqm_min, yield_kg_per_sqm_max,
--   avg_market_price_dkk_kg, is_system_variety
-- ============================================================

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
-- TOMATER (indoor, ingen direkte såning)
-- sow_in: feb–mar | direct: - | transplant: maj–jun | harvest: jul–okt
-- ============================================================
('a1000000-0000-0000-0000-000000000001','Black Cherry',false,null,'grøntsag',
 'Lille, mørkerød-sort cherrysort med intens sød og kompleks smag. Meget produktiv. Velegnet til polytunnel og udendørs.',
 false,true, 0.5,16,22,7,14, true,8,
 2,3, null,null, 5,6, 7,10, 60, 50,40,
 'fuld sol','middel',false,'anbefalet',true,true,
 'Basilikum, tagetes, porrer','Fennikel, kål',
 'Nip sideskud løbende. Opbind til pæl eller snor. Vand jævnt — uregelmæssig vanding giver blomsterenden råd.',
 3.0,6.0,60,true),

('a1000000-0000-0000-0000-000000000001','Sungold',false,null,'grøntsag',
 'Orange cherrysort med ekstraordinær sødme og tropisk eftersmag. En af de bedst sælgende cherrytomater på restaurantmarkedet.',
 false,true, 0.5,16,22,7,14, true,8,
 2,3, null,null, 5,6, 7,10, 55, 50,40,
 'fuld sol','middel',false,'krævet',true,true,
 'Basilikum, tagetes','Fennikel',
 'Nip sideskud. Trives bedst i polytunnel. Frugterne revner let ved kraftig regn.',
 3.0,7.0,65,true),

('a1000000-0000-0000-0000-000000000001','Brandywine',true,'Frøsamlerne','grøntsag',
 'Stor, lilla-pink heirloom-tomat med ekstraordinær smag. Fra Pennsylvania, USA, dyrket siden 1885.',
 false,true, 0.5,16,22,10,21, true,8,
 2,3, null,null, 5,6, 8,10, 80, 60,60,
 'fuld sol','middel',false,'anbefalet',true,true,
 'Basilikum, persille','Fennikel',
 'Nip sideskud. Frugterne bliver meget store — opbind godt. Kræver polytunnel for at nå fuld modning i DK.',
 1.5,3.0,75,true),

('a1000000-0000-0000-0000-000000000001','Green Zebra',true,null,'grøntsag',
 'Medium, grøn-stribet tomat med frisk, lidt syrlig smag. Meget dekorativ på tallerkenen.',
 false,true, 0.5,16,22,7,14, true,8,
 2,3, null,null, 5,6, 7,10, 70, 50,50,
 'fuld sol','middel',false,'anbefalet',true,true,
 'Basilikum, tagetes','Fennikel',
 'Nip sideskud. Modner ikke til rød — høst når den er blød og stribet.',
 2.0,4.0,65,true),

('a1000000-0000-0000-0000-000000000001','Roma',false,null,'grøntsag',
 'Klassisk pastatomat med lille frøhule og fast kød. Ideel til sauce, tørring og konservering.',
 false,true, 0.5,16,22,7,14, true,8,
 2,3, null,null, 5,6, 7,10, 70, 50,45,
 'fuld sol','lav',false,'ikke nødvendig',true,true,
 'Basilikum, hvidløg','Fennikel',
 'Nip sideskud. Tåler lidt mere tørke end cherrytomater. God til udendørs produktion.',
 3.0,6.0,40,true),

-- ============================================================
-- PEBERFRUGT
-- ============================================================
('a1000000-0000-0000-0000-000000000002','Yolo Wonder',false,null,'grøntsag',
 'Klassisk sød blokpeberfrugt. Grøn tidligt, rød ved fuld modning. Robust og relativt tidlig sort.',
 false,true, 0.5,18,24,10,21, true,10,
 2,3, null,null, 5,6, 8,10, 75, 40,35,
 'fuld sol','middel',false,'krævet',true,false,
 'Basilikum, gulerod','Fennikel',
 'Kræver lang sæson og varme. Polytunnel anbefales i Danmark.',
 1.5,3.0,55,true),

('a1000000-0000-0000-0000-000000000002','Jimmy Nardello',true,'Frøsamlerne','grøntsag',
 'Italiensk heirloom stegepeber. Lang, tynd, sød frugt. Fra Basilicata, dyrket i generationer.',
 false,true, 0.5,18,24,10,21, true,10,
 2,3, null,null, 5,6, 8,10, 80, 40,30,
 'fuld sol','middel',false,'krævet',false,false,
 'Tomat, basilikum','Fennikel',
 'Polytunnel anbefales. Frugterne 20–25 cm. Smagen intensiveres ved stegning.',
 1.5,3.5,70,true),

-- ============================================================
-- AGURK
-- ============================================================
('a1000000-0000-0000-0000-000000000010','Marketmore',false,null,'grøntsag',
 'Klassisk udendørs agurk. Mørk, cylindrisk frugt. Robust og pålidelig.',
 false,true, 1.0,18,24,7,10, true,4,
 4,5, null,null, 6,6, 7,9, 55, 80,40,
 'fuld sol','høj',false,'ikke nødvendig',true,false,
 'Dild, bønner, solsikke','Kartoffel, aromatiske urter',
 'Vand regelmæssigt — tørke giver bitre frugter. Høst hyppigt.',
 3.0,6.0,30,true),

('a1000000-0000-0000-0000-000000000010','Crystal Lemon',true,'Frøsamlerne','grøntsag',
 'Rund, citrongul agurk med mild og sprød smag. Heirloom fra 1894.',
 false,true, 1.0,18,24,7,10, true,4,
 4,5, null,null, 6,6, 7,9, 60, 80,40,
 'fuld sol','høj',false,'anbefalet',true,false,
 'Dild, bønner','Kartoffel',
 'Høst når frugten er citrongul og ca. 7–8 cm i diameter.',
 2.0,4.0,45,true),

-- ============================================================
-- SQUASH / ZUCCHINI
-- ============================================================
('a1000000-0000-0000-0000-000000000011','Black Beauty',false,null,'grøntsag',
 'Klassisk mørk-grøn zucchini. Meget produktiv. Standard markedssort.',
 false,true, 2.0,18,24,5,10, false,3,
 4,5, null,null, 6,6, 7,10, 50, 80,60,
 'fuld sol','middel',false,'ikke nødvendig',false,false,
 'Dild, bønner, solsikke','Kartoffel',
 'Høst ved 15–20 cm for bedste smag. Høst dagligt i peak-sæsonen.',
 4.0,8.0,20,true),

('a1000000-0000-0000-0000-000000000011','Costata Romanesco',true,'Frøsamlerne','grøntsag',
 'Italiensk heirloom zucchini med markante ribber. Nøttet smag. Blomsten velegnet til fyld.',
 false,true, 2.0,18,24,5,10, false,3,
 4,5, null,null, 6,6, 7,10, 55, 80,70,
 'fuld sol','middel',false,'ikke nødvendig',false,false,
 'Dild, bønner','Kartoffel',
 'Smager bedst ved 20–25 cm. Hanblomster kan fyldes med ricotta.',
 3.0,7.0,35,true),

-- ============================================================
-- GRÆSKAR
-- ============================================================
('a1000000-0000-0000-0000-000000000012','Hokkaido (Red Kuri)',false,null,'grøntsag',
 'Rød-orange vintergrøskar. Sød, kastanjeagtig smag. Fremragende lageringsevne.',
 false,true, 2.0,18,22,7,12, true,4,
 4,5, null,null, 6,6, 9,11, 100, 150,100,
 'fuld sol','lav',false,'ikke nødvendig',false,false,
 'Bønner, majs, solsikke','Kartoffel',
 'Lad frugten sidde til stilken tørrer. Opbevares køligt og tørt i måneder.',
 2.0,5.0,35,true),

('a1000000-0000-0000-0000-000000000012','Butternut',false,null,'grøntsag',
 'Klassisk beige vintergrøskar. Sød, orangefarvet kød. Meget alsidig i køkkenet.',
 false,true, 2.0,18,22,7,12, true,4,
 4,5, null,null, 6,6, 9,11, 110, 150,100,
 'fuld sol','lav',false,'ikke nødvendig',false,false,
 'Bønner, majs','Kartoffel',
 'Høst inden frost. Herder 10 dage ved 25–30°C inden lagring. Kan lagres 3–6 måneder.',
 2.0,4.0,30,true),

-- ============================================================
-- GRØNKÅL
-- ============================================================
('a1000000-0000-0000-0000-000000000020','Cavolo Nero',false,null,'grøntsag',
 'Toscansk palmekål med mørke, pebrede blade. Smagen forbedres efter frost.',
 false,true, 1.0,12,18,5,10, false,6,
 3,5, null,null, 5,7, 9,2, 90, 45,45,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Porrer, timian, dild','Tomat, jordbær',
 'Meget vinterhårdfør. Høst de yderste blade løbende.',
 1.0,2.5,45,true),

('a1000000-0000-0000-0000-000000000020','Red Russian',true,'Frøsamlerne','grøntsag',
 'Flad, rødbladet kål med smukt, savtakket blad. Mild og sød smag. Heritage fra Rusland via Canada.',
 false,true, 1.0,12,18,5,10, false,6,
 3,5, null,null, 5,7, 8,1, 80, 45,40,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Porrer, dild','Tomat, jordbær',
 'Mildere end curled kale. Fremragende til salat, wok og chips.',
 1.0,2.0,50,true),

-- ============================================================
-- SALAT (kan både forspires og direkte sås)
-- ============================================================
('a1000000-0000-0000-0000-000000000030','Lollo Rosso',false,null,'grøntsag',
 'Krøllet, rødbladet salat med dekorativ fremtoning. God varmeresistens.',
 true,true, 0.3,10,16,5,10, false,4,
 3,8, 3,9, 4,9, 5,11, 40, 25,20,
 'fuld sol','middel',false,'ikke nødvendig',false,false,
 'Gulerod, radise, dild','Selleri',
 'Høst som hele hoved eller cut-and-come-again. Sår successivt hver 3. uge.',
 0.5,1.5,50,true),

('a1000000-0000-0000-0000-000000000030','Marvel of Four Seasons',true,'Frøsamlerne','grøntsag',
 'Historisk butterhead-salat med rødbrune yderblade. Fra 1800-tallet.',
 true,true, 0.3,10,16,5,10, false,4,
 3,8, 3,9, 4,9, 5,11, 45, 25,25,
 'fuld sol','middel',false,'ikke nødvendig',false,false,
 'Gulerod, radise','Selleri',
 'Heritage-favorit. Tåler lette froste. Velegnet til forår- og efterårssæson.',
 0.5,1.5,55,true),

-- ============================================================
-- RUCOLA (kun direkte såning)
-- ============================================================
('a1000000-0000-0000-0000-000000000025','Rucola (standard)',false,null,'grøntsag',
 'Klassisk rucola med pebret, let bitter smag. Hurtigvoksende.',
 true,false, 0.5,10,16,5,10, false,null,
 null,null, 3,9, null,null, 4,11, null, 25,10,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Radise, gulerod',null,
 'Direkte såning i rækker. Skyder til blomst i varme — sår successivt. Efterår giver mildest smag.',
 0.5,1.5,60,true),

-- ============================================================
-- SPINAT (kun direkte såning)
-- ============================================================
('a1000000-0000-0000-0000-000000000050','Matador',false,null,'grøntsag',
 'Klassisk, robust spinatsort med store, mørke blade. God bolt-resistens.',
 true,false, 2.0,7,15,7,14, false,null,
 null,null, 3,5, null,null, 4,6, null, 25,10,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Jordbær, radise','Fennikel',
 'Foretrækker kølige temperaturer. Bolter ved langdag og varme — dyrk forår og efterår.',
 0.5,1.5,40,true),

-- ============================================================
-- MANGOLD / BLADBEDE
-- ============================================================
('a1000000-0000-0000-0000-000000000051','Rainbow Chard',false,null,'grøntsag',
 'Mangold med farvestrålende stilke. Meget dekorativ og velsmagende. Restaurant-favorit.',
 true,true, 2.0,10,18,7,14, false,4,
 3,5, 3,6, 5,6, 6,11, 60, 30,25,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Bønner, løg',null,
 'Skyd bladene fra ydersiden — planten producerer hele sæsonen.',
 1.0,3.0,45,true),

-- ============================================================
-- RØDBEDE (kun direkte såning)
-- ============================================================
('a1000000-0000-0000-0000-000000000052','Chioggia',true,'Frøsamlerne','grøntsag',
 'Italiensk heirloom rødbede med rosa-hvide striber. Mildere i smagen. Visuel favorit på restauranter.',
 true,false, 2.0,10,18,7,14, false,null,
 null,null, 4,7, null,null, 6,10, null, 30,10,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Løg, salat',null,
 'Gennemblødes 1 time inden såning. Tynd til 10 cm. Striberne falmer ved kogning — server rå eller syltet.',
 1.5,3.0,40,true),

('a1000000-0000-0000-0000-000000000052','Detroit Dark Red',false,null,'grøntsag',
 'Klassisk, mørk rødbede. Pålidelig og produktiv.',
 true,false, 2.0,10,18,7,14, false,null,
 null,null, 4,7, null,null, 6,10, null, 30,10,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Løg, salat, hvidløg',null,
 'Bladene er spiselige og velsmagende. Tynd til 10 cm afstand.',
 2.0,4.0,30,true),

-- ============================================================
-- GULEROD (kun direkte såning)
-- ============================================================
('a1000000-0000-0000-0000-000000000040','Nantes 2',false,null,'rod',
 'Klassisk cylindrisk gulerod. Sød, sprød og pålidelig.',
 true,false, 1.0,10,18,14,21, false,null,
 null,null, 4,6, null,null, 7,10, null, 25,5,
 'fuld sol','middel',false,'ikke nødvendig',false,false,
 'Porrer, salat, radise','Dild, fennikel, persille',
 'Løs, stenfri jord er afgørende. Tynd til 5 cm. Hæld ikke kompost direkte ned — giver forgrenede rødder.',
 2.0,5.0,25,true),

('a1000000-0000-0000-0000-000000000040','Chantenay Red Cored',false,null,'rod',
 'Kortere, konisk gulerod. God til tungere jorde. Sød smag og god lageringsevne.',
 true,false, 1.0,10,18,14,21, false,null,
 null,null, 4,6, null,null, 7,10, null, 25,6,
 'fuld sol','middel',false,'ikke nødvendig',false,false,
 'Porrer, salat','Dild, fennikel',
 'Tåler lidt tungere jord end Nantes. God til lagring over vinter.',
 2.5,5.5,22,true),

-- ============================================================
-- KARTOFFEL (lægges direkte)
-- ============================================================
('a1000000-0000-0000-0000-000000000004','Charlotte',false,null,'grøntsag',
 'Vokset, fast kartoffel. Fremragende smag. Ideel som ny kartoffel og til salat.',
 false,false, 10.0,null,null,null,null, false,null,
 null,null, 4,5, null,null, 7,9, null, 60,35,
 'fuld sol','middel',false,'ikke nødvendig',false,false,
 'Bønner, kål, majs','Tomat, peberfrugt, fennikel',
 'Opgroede sættes giver bedre resultat. Hyp 2–3 gange. Høst når toppen visner.',
 2.0,5.0,35,true),

('a1000000-0000-0000-0000-000000000004','Sarpo Mira',false,null,'grøntsag',
 'Stærkt kartoffelbrand-resistent sort fra Wales. Ideel til regenerativt landbrug uden sprøjtning.',
 false,false, 10.0,null,null,null,null, false,null,
 null,null, 4,5, null,null, 8,10, null, 60,35,
 'fuld sol','lav',false,'ikke nødvendig',false,false,
 'Bønner, kål','Tomat, fennikel',
 'Ekstremt brandresistent. Sen sort. Giver store udbytter. Lagres godt.',
 3.0,7.0,25,true),

-- ============================================================
-- HESTEBØNNE (direkte såning efterår/forår)
-- ============================================================
('a1000000-0000-0000-0000-000000000062','Aquadulce Claudia',false,null,'grøntsag',
 'Tidlig, robust hestebønne. Kan overvintre i milde vintre. Lang bælg med store bønner.',
 true,false, 5.0,5,15,7,14, false,null,
 null,null, 10,11, null,null, 6,7, null, 25,25,
 'fuld sol','lav',true,'ikke nødvendig',true,false,
 'Kål, spinat','Løg, hvidløg',
 'Sås om efteråret for tidlig forårshøst. God kvælstofbinder. Knib toppen af ved første bælg.',
 0.5,1.5,30,true),

-- ============================================================
-- KLATREBØNNE (direkte såning)
-- ============================================================
('a1000000-0000-0000-0000-000000000061','Cobra',false,null,'grøntsag',
 'Produktiv klatrebønne med lange, runde bælge. Stringsless.',
 true,false, 5.0,15,20,7,10, false,null,
 null,null, 5,6, null,null, 7,10, null, 40,20,
 'fuld sol','middel',false,'ikke nødvendig',true,false,
 'Majs, agurk, salat','Løg, fennikel',
 'Sår ikke før jorden er 15°C. Kræver støtte. Høst mens bælgene er tynde.',
 1.5,4.0,35,true),

-- ============================================================
-- ÆRT (direkte såning tidligt forår)
-- ============================================================
('a1000000-0000-0000-0000-000000000060','Sugar Snap',false,null,'grøntsag',
 'Sukkersnapært — spises hel bælg. Sød og sprød. Meget populær.',
 true,false, 3.0,7,16,7,14, false,null,
 null,null, 3,5, null,null, 6,8, null, 25,7,
 'fuld sol','middel',true,'ikke nødvendig',true,false,
 'Gulerod, radise, salat','Løg, hvidløg',
 'Sår direkte tidligt om foråret. Kræver net. Høst dagligt.',
 0.5,1.5,50,true),

-- ============================================================
-- BASILIKUM (indoor, polytunnel)
-- ============================================================
('a1000000-0000-0000-0000-000000000100','Genovese',false,null,'urt',
 'Klassisk stor-bladet basilikum til pesto. Intens, sødt aromatisk.',
 false,true, 0.5,18,22,7,14, true,6,
 3,4, null,null, 6,6, 7,9, 60, 25,20,
 'fuld sol','middel',false,'krævet',false,false,
 'Tomat, peberfrugt','Salvie, rosmarin',
 'Elsker varme — trives i polytunnel. Nip blomsterstande for at forlænge produktionen.',
 0.3,0.8,200,true),

-- ============================================================
-- PERSILLE (kan begge dele)
-- ============================================================
('a1000000-0000-0000-0000-000000000042','Gigante d''Italia',true,'Frøsamlerne','urt',
 'Stor, flad italiensk persille med kraftig smag. Foretrukket af kokke.',
 true,true, 0.5,10,18,14,21, false,8,
 3,5, 3,6, 5,6, 7,11, 70, 25,15,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Tomat, asparges, gulerod',null,
 'Langsom spirer — gennemblødes 24 timer. Biennial — overvintrer og skyder blomst 2. år.',
 0.3,0.8,120,true),

-- ============================================================
-- LØG (kan begge dele)
-- ============================================================
('a1000000-0000-0000-0000-000000000070','Sturon',false,null,'løg',
 'Pålideligt og højtydende gult løg. God lageringsevne til februar–marts.',
 true,true, 1.5,10,18,10,14, false,10,
 2,3, 4,5, 5,5, 8,9, null, 25,10,
 'fuld sol','lav',true,'ikke nødvendig',false,false,
 'Gulerod, salat, persille','Bønner, ærter',
 'Forspir fra frø i februar eller sæt sætte-løg i april. Tør i solen inden lagring.',
 3.0,7.0,20,true),

-- ============================================================
-- HVIDLØG (direkte plantning efterår)
-- ============================================================
('a1000000-0000-0000-0000-000000000071','Printanor',false,null,'løg',
 'Stiffneck hvidløg med god smag. Sættes efterår for forårshøst.',
 false,false, 5.0,null,null,null,null, false,null,
 null,null, 9,11, null,null, 6,7, null, 25,15,
 'fuld sol','lav',true,'ikke nødvendig',false,false,
 'Tomat, gulerod, roser','Bønner, ærter',
 'Plant store, ydre fed 5 cm dybt om efteråret. Fjern hamper i juni. Høst når 2/3 af bladene er gule.',
 0.5,1.5,80,true),

-- ============================================================
-- PORRER (indoor)
-- ============================================================
('a1000000-0000-0000-0000-000000000072','Musselburgh',true,'Frøsamlerne','løg',
 'Skotsk heirloom porre. Meget vinterhårdfør — tåler hård frost.',
 false,true, 1.0,10,18,14,21, false,12,
 2,3, null,null, 6,6, 10,3, null, 15,15,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Gulerod, selleri, salat','Bønner, ærter',
 'Udplant i huller stukket 15 cm dybe — fyld ikke, vand i stedet. Høst fra oktober.',
 2.0,5.0,30,true),

-- ============================================================
-- RADISE (direkte såning)
-- ============================================================
('a1000000-0000-0000-0000-000000000024','French Breakfast',false,null,'rod',
 'Langstrakt, rød-hvid radise med mild smag. Klar på 25 dage.',
 true,false, 1.0,7,16,5,10, false,null,
 null,null, 3,9, null,null, 4,10, null, 25,5,
 'fuld sol','middel',false,'ikke nødvendig',false,false,
 'Gulerod, salat, agurk',null,
 'Sår successivt hver 2. uge. Træk op umiddelbart ved modning.',
 0.5,1.5,35,true),

-- ============================================================
-- DILD (direkte såning)
-- ============================================================
('a1000000-0000-0000-0000-000000000043','Dukat',false,null,'urt',
 'Meget bladrig dildsort med langsom blomstring. Standard til restauranter.',
 true,false, 0.5,10,18,7,14, false,null,
 null,null, 4,8, null,null, 5,10, null, 25,15,
 'fuld sol','lav',false,'ikke nødvendig',false,false,
 'Agurk, gulerod, salat','Tomat, fennikel',
 'Sår direkte og successivt. God til at tiltrække nyttige insekter.',
 0.2,0.5,150,true),

-- ============================================================
-- KORIANDER (direkte såning)
-- ============================================================
('a1000000-0000-0000-0000-000000000045','Cilantro',false,null,'urt',
 'Standard koriander til frisk bladhøst. Bolter hurtigt i varme.',
 true,false, 0.5,10,18,7,14, false,null,
 null,null, 3,5, null,null, 4,6, null, 25,10,
 'halvskygge','middel',false,'ikke nødvendig',false,false,
 'Spinat, salat','Fennikel',
 'Sår successivt hver 3. uge. Halvskygge forsinker blomstring.',
 0.1,0.4,200,true),

-- ============================================================
-- TIMIAN (indoor, flerårig)
-- ============================================================
('a1000000-0000-0000-0000-000000000101','Common Thyme',false,null,'urt',
 'Klassisk timian. Flerårig, vinterhårdfør.',
 false,true, 0.5,15,20,14,21, false,10,
 3,4, null,null, 5,6, 6,10, null, 30,25,
 'fuld sol','lav',true,'ikke nødvendig',false,false,
 'Rosmarin, salvie, kål',null,
 'Kræver god dræning. Klip løbende for at holde kompakt.',
 null,null,300,true),

-- ============================================================
-- ROSMARIN (indoor, flerårig)
-- ============================================================
('a1000000-0000-0000-0000-000000000103','Tuscan Blue',false,null,'urt',
 'Opret rosmarin med intenst aromatisk blad. Halvt vinterhårdfør i Danmark.',
 false,true, 0.5,18,22,14,28, false,12,
 3,4, null,null, 5,6, 6,10, null, 50,50,
 'fuld sol','lav',false,'ikke nødvendig',false,false,
 'Timian, salvie, kål',null,
 'Kræver fremragende dræning. Dæk med fiberdug ved frost under -10°C.',
 null,null,350,true),

-- ============================================================
-- ÆBLETRÆER (vedplanter — ingen såning)
-- ============================================================
('a1000000-0000-0000-0000-000000000080','Cox Orange',true,null,'frugt',
 'Den klassiske danske æblesort — syrlig, aromatisk og kompleks. Fremragende til cider.',
 false,false, null,null,null,null,null, false,null,
 null,null, null,null, null,null, 9,10, null, 400,350,
 'fuld sol','lav',true,'ikke nødvendig',false,false,
 'Hvidkløver under træet, løg, purløg',null,
 'Selvsteril — behøver bestøver (Ingrid Marie, Discovery). Høns kan gå under om efteråret.',
 null,null,30,true),

('a1000000-0000-0000-0000-000000000080','Ingrid Marie',true,null,'frugt',
 'Dansk æblesort fra 1910 (Fyn). Sød, rødfarvet. God bestøver til Cox Orange.',
 false,false, null,null,null,null,null, false,null,
 null,null, null,null, null,null, 9,10, null, 400,350,
 'fuld sol','lav',true,'ikke nødvendig',false,false,
 'Hvidkløver under træet','Kartoffel, tomat',
 'Bestøves af Cox Orange og Discovery.',
 null,null,35,true),

('a1000000-0000-0000-0000-000000000080','Discovery',false,null,'frugt',
 'Tidlig, rød æblesort. Klar i august. Ikke til langtidslagring.',
 false,false, null,null,null,null,null, false,null,
 null,null, null,null, null,null, 8,8, null, 400,350,
 'fuld sol','lav',true,'ikke nødvendig',false,false,
 'Hvidkløver, løg',null,
 'Spises frisk — holder kun 2–4 uger. Meget god bestøver for andre sorter.',
 null,null,25,true),

-- ============================================================
-- PÆRETRÆ
-- ============================================================
('a1000000-0000-0000-0000-000000000081','Conference',false,null,'frugt',
 'Den mest pålidelige pæresort til dansk klima. Saftig, sød smag.',
 false,false, null,null,null,null,null, false,null,
 null,null, null,null, null,null, 9,10, null, 400,300,
 'fuld sol','lav',true,'ikke nødvendig',false,false,
 'Hvidkløver, purløg',null,
 'Næsten selvfertil men giver bedre udbytte med bestøver. Modner ved 0–2°C lagring.',
 null,null,30,true),

-- ============================================================
-- BLOMMER
-- ============================================================
('a1000000-0000-0000-0000-000000000082','Opal',false,null,'frugt',
 'Tidlig svensk blommesort. Gul-rød frugt med sød smag. Robust i nordisk klima.',
 false,false, null,null,null,null,null, false,null,
 null,null, null,null, null,null, 8,8, null, 400,300,
 'fuld sol','lav',true,'ikke nødvendig',false,false,
 'Hvidkløver',null,
 'Selvfertil. Beskær kun minimalt efter høst.',
 null,null,40,true),

('a1000000-0000-0000-0000-000000000082','Victoria',false,null,'frugt',
 'Klassisk engelsk blommesort. Stor, rød-gul frugt. Meget produktiv.',
 false,false, null,null,null,null,null, false,null,
 null,null, null,null, null,null, 8,9, null, 400,300,
 'fuld sol','lav',true,'ikke nødvendig',false,false,
 'Hvidkløver',null,
 'Selvfertil. Kræver støtte til grene i gode frugtår. Høns kan gå under efter høst.',
 null,null,35,true),

-- ============================================================
-- KIRSEBÆR
-- ============================================================
('a1000000-0000-0000-0000-000000000083','Stella',false,null,'frugt',
 'Selvfertil sødt kirsebær. Stor, mørkerød frugt. Ingen bestøver nødvendig.',
 false,false, null,null,null,null,null, false,null,
 null,null, null,null, null,null, 6,7, null, 500,400,
 'fuld sol','lav',true,'ikke nødvendig',false,false,
 'Hvidkløver, tagetes',null,
 'Beskær ALDRIG et kirsebærtræ. Dæk med net inden fugle finder frugterne.',
 null,null,80,true),

-- ============================================================
-- SOLBÆR
-- ============================================================
('a1000000-0000-0000-0000-000000000091','Ben Sarek',false,null,'bær',
 'Kompakt solbærbusk med meget store bær. Høj C-vitamin.',
 false,false, null,null,null,null,null, false,null,
 null,null, null,null, null,null, 7,8, null, 150,120,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Hvidkløver under busken',null,
 'Beskær hvert 3. år — fjern ældste grene til jordniveau. Høns holder insekter nede.',
 2.0,5.0,60,true),

-- ============================================================
-- RIBS
-- ============================================================
('a1000000-0000-0000-0000-000000000090','Jonkheer van Tets',false,null,'bær',
 'Hollandsk ribssort med store, røde bær. Fremragende smag. Tidlig sort.',
 false,false, null,null,null,null,null, false,null,
 null,null, null,null, null,null, 7,7, null, 150,120,
 'fuld sol','lav',true,'ikke nødvendig',false,false,
 'Hvidkløver',null,
 'Beskær som solbær. Kan give 3–5 kg pr. busk.',
 2.0,5.0,55,true),

-- ============================================================
-- HINDBÆR
-- ============================================================
('a1000000-0000-0000-0000-000000000084','Tulameen',false,null,'bær',
 'Canadisk sommerbærende hindbær. Store, aromatiske bær. Restaurant-favorit.',
 false,false, null,null,null,null,null, false,null,
 null,null, null,null, null,null, 7,8, null, 60,40,
 'fuld sol','middel',true,'ikke nødvendig',true,false,
 'Hvidkløver, tagetes',null,
 '2-årige skud bærer frugt — skær ned efter høst. 1-årige skud bindes op til næste år.',
 0.5,2.0,70,true),

('a1000000-0000-0000-0000-000000000084','Autumn Bliss',false,null,'bær',
 'Efterårsbærende hindbær. Bærer på nye skud samme år. Forlænger sæsonen til oktober.',
 false,false, null,null,null,null,null, false,null,
 null,null, null,null, null,null, 8,10, null, 60,40,
 'fuld sol','middel',true,'ikke nødvendig',true,false,
 'Hvidkløver',null,
 'Klip ALLE skud ned til jordniveau i februar. Bærer fra august samme år.',
 0.5,2.0,65,true),

-- ============================================================
-- HASSEL
-- ============================================================
('a1000000-0000-0000-0000-000000000110','Cosford',false,null,'nød',
 'Engelsk hasselsort med lange, tyndskalede nødder. Etableret efter 3–5 år.',
 false,false, null,null,null,null,null, false,null,
 null,null, null,null, null,null, 9,10, null, 300,250,
 'fuld sol','lav',true,'ikke nødvendig',false,false,
 'Hvidkløver, persille',null,
 'Fjern 1/3 af ældste stammer til jordniveau hvert år efter løvfald. Høns kan gå under.',
 null,null,120,true),

-- ============================================================
-- BLÅBÆR
-- ============================================================
('a1000000-0000-0000-0000-000000000120','Bluecrop',false,null,'bær',
 'Amerikansk højtydende blåbær. Kræver sur jord (pH 4,5–5,5).',
 false,false, null,null,null,null,null, false,null,
 null,null, null,null, null,null, 7,8, null, 150,120,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 null,'Kalk (hæver pH)',
 'Kræver pH 4,5–5,5. Aldrig kalk. Plant mindst 2 sorter for krydsbefrugtning.',
 null,null,90,true),

-- ============================================================
-- DÆKAFGRØDER / GRØNGØDNING
-- ============================================================
('a1000000-0000-0000-0000-000000000063','Rødkløver',false,null,'dækafgrøde',
 'Stærk kvælstofbinder. Fremragende til grøngødning og som undervækst. Biernes yndlingsplante.',
 true,false, 0.5,7,16,7,14, false,null,
 null,null, 4,8, null,null, null,null, null, 25,5,
 'fuld sol','lav',true,'ikke nødvendig',false,false,
 'Hvidkløver, phacelia',null,
 'Kvælstofbinder: 80–150 kg N/ha/år. Slå ned inden blomstring for at frigive kvælstof.',
 null,null,null,true),

('a1000000-0000-0000-0000-000000000064','Hvidkløver (Grasslands Huia)',false,null,'dækafgrøde',
 'Lavtvoksende hvidkløver. Ideel undervækst under frugttræer og buske. Kvælstofbinder.',
 true,false, 0.5,7,16,7,14, false,null,
 null,null, 4,8, null,null, null,null, null, null,null,
 'fuld sol','lav',true,'ikke nødvendig',false,false,
 'Rødkløver, phacelia',null,
 'Lavtvoksende — ingen slåning nødvendig under frugttræer. Binder kvælstof, fodrer bier.',
 null,null,null,true);
