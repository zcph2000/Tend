-- ============================================================
-- AFGRØDEDATABASEN — Tillæg 2
-- Kør EFTER crop_database_seed.sql (samme mønster som resten af /supabase)
-- Retter familienavne så de matcher koden (FAMILY_COLORS, PREFERS_WARMTH,
-- YIELD_KG_PER_PLANT i lib/), og udfylder arter der stod uden sorter
-- (broccoli, blomkål, hvidkål, pastinak, fennikel osv.) samt to nye arter
-- (knold- og bladselleri) der manglede helt.
-- ============================================================

-- Ret familienavne så de stemmer overens med de navne appens kode bruger
-- (FAMILY_COLORS/PREFERS_WARMTH/YIELD_KG_PER_PLANT i lib/bedPlantingLayout.ts
-- og lib/companionPlants.ts). Uden dette bliver fx squash/agurk aldrig
-- foreslået til polytunnel, og kålfamilien/salatfamilien får ingen
-- udbytte-estimat-fallback.
update crop_families set name_da = 'Græskarfamilien'    where name_da = 'Agurk- og græskarfamilien';
update crop_families set name_da = 'Korsblomstfamilien' where name_da = 'Kålfamilien';
update crop_families set name_da = 'Kurvblomstfamilien' where name_da = 'Kurvblomsterne';

-- To arter der manglede helt
insert into crop_species (id, family_id, name_da, scientific_name, plant_type) values
  ('a1000000-0000-0000-0000-000000000046', 'f1000000-0000-0000-0000-000000000005', 'Knoldselleri', 'Apium graveolens var. rapaceum', 'etårig'),
  ('a1000000-0000-0000-0000-000000000047', 'f1000000-0000-0000-0000-000000000005', 'Bladselleri',   'Apium graveolens var. dulce',    'etårig')
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
-- BROCCOLI
-- ============================================================
('a1000000-0000-0000-0000-000000000021','Marathon',false,null,'grøntsag',
 'Pålidelig F1-hybrid med stort hoved og gode sideskud efter hovedhøst. Standard restaurantsort.',
 false,true, 1.0,18,22,5,10, true,5,
 3,4, null,null, 5,6, 8,10, 70, 50,45,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Løg, salat, dild','Tomat, jordbær',
 'Høst hovedet før knopperne åbner sig. Sideskud giver løbende høst i ugerne efter.',
 2.0,3.5,45,true),

-- ============================================================
-- BLOMKÅL
-- ============================================================
('a1000000-0000-0000-0000-000000000022','Aalsmeer',false,null,'grøntsag',
 'Klassisk hvid blomkål med stort, tæt hoved. Sen sommer/efterårssort.',
 false,true, 1.0,18,22,5,10, true,5,
 3,4, null,null, 5,6, 8,10, 85, 60,50,
 'fuld sol','høj',true,'ikke nødvendig',false,false,
 'Løg, salat','Tomat, jordbær',
 'Kræver jævn vanding for at undgå små hoveder. Bind bladene over hovedet for at holde det hvidt.',
 2.0,3.0,35,true),

-- ============================================================
-- HVIDKÅL
-- ============================================================
('a1000000-0000-0000-0000-000000000023','Golden Acre',false,null,'grøntsag',
 'Tidlig, kompakt spidskål-agtig hvidkål. Klar på under 3 måneder.',
 false,true, 1.0,18,22,5,10, true,5,
 3,4, null,null, 5,6, 7,9, 65, 45,40,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Løg, salat, dild','Tomat, jordbær',
 'Høst før hovedet springer. God til hurtig omsætning tidligt på sæsonen.',
 3.0,5.0,15,true),

('a1000000-0000-0000-0000-000000000023','Filderkraut',true,'Frøsamlerne','grøntsag',
 'Spids, tysk heirloom-lagerkål. Meget lang holdbarhed — velegnet til vintersalat og syrning.',
 false,true, 1.0,18,22,5,10, true,5,
 3,4, null,null, 5,6, 9,11, 100, 60,50,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Løg, salat','Tomat, jordbær',
 'Lagres køligt i flere måneder. Klassisk til hjemmelavet surkål.',
 4.0,6.0,12,true),

-- ============================================================
-- PASTINAK (kun direkte såning)
-- ============================================================
('a1000000-0000-0000-0000-000000000041','White Gem',false,null,'rod',
 'Klassisk pastinak med sød, nøddeagtig smag der forstærkes af frost.',
 true,false, 1.5,10,18,14,21, false,null,
 null,null, 4,6, null,null, 10,2, null, 25,8,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Porrer, løg','Dild, fennikel',
 'Langsom spirer — hold jorden fugtig. Smager bedst efter de første nattefroster. Kan overvintre i jorden.',
 2.0,4.0,25,true),

-- ============================================================
-- FENNIKEL
-- ============================================================
('a1000000-0000-0000-0000-000000000044','Zefa Fino',false,null,'grøntsag',
 'Bolde-fennikel med stor, mild knold. Bolter mindre villigt end ældre sorter.',
 false,true, 1.0,15,20,7,14, false,4,
 4,5, null,null, 6,6, 8,10, 65, 35,25,
 'fuld sol','middel',false,'ikke nødvendig',false,false,
 'Salat, agurk, dild','Tomat, bønne',
 'Følsom over for kuldechok efter udplantning — kan udløse tidlig blomstring. Dæk let ved kolde nætter.',
 2.0,4.0,45,true),

-- ============================================================
-- PURLØG (flerårig)
-- ============================================================
('a1000000-0000-0000-0000-000000000073','Standard purløg',false,null,'urt',
 'Flerårig løgurt. Sås én gang, høstes i årevis. Lilla blomster tiltrækker bier.',
 true,true, 0.5,10,18,10,14, false,8,
 3,4, 4,5, 5,6, 5,10, null, 20,15,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Gulerod, roser, tomat',null,
 'Klip løbende 2–3 cm over jorden. Del touen hvert 3.–4. år for at holde den vital.',
 0.5,1.5,150,true),

-- ============================================================
-- SKALOTTELØG
-- ============================================================
('a1000000-0000-0000-0000-000000000074','Banana',false,null,'løg',
 'Aflang skalotteløg med mild, sødlig smag. Sætteløg — deler sig i klaser.',
 true,true, 2.0,10,18,10,14, false,10,
 2,3, 3,4, 4,4, 7,8, null, 20,10,
 'fuld sol','lav',true,'ikke nødvendig',false,false,
 'Gulerod, salat, persille','Bønner, ærter',
 'Sæt sætteløg direkte i april. Hver løg deler sig til en klase på 4–8. Tør inden lagring.',
 2.5,5.0,60,true),

-- ============================================================
-- JORDBÆR (flerårig, plantes som udløbere)
-- ============================================================
('a1000000-0000-0000-0000-000000000085','Honeoye',false,null,'frugt',
 'Tidlig, junibærende jordbær. Meget produktiv og pålidelig. Standard i danske haver.',
 false,false, null,null,null,null,null, false,null,
 null,null, null,null, 4,9, 6,7, null, 30,30,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Hvidløg, løg, purløg','Kål',
 'Plant udløbere forår eller sensommer. Mulches med halm for at holde bærrene rene og fugten stabil.',
 1.5,3.0,60,true),

('a1000000-0000-0000-0000-000000000085','Malwina',false,null,'frugt',
 'Sen sort der bærer i august-september. Forlænger jordbærsæsonen betydeligt.',
 false,false, null,null,null,null,null, false,null,
 null,null, null,null, 4,9, 8,9, null, 30,30,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Hvidløg, løg','Kål',
 'God til at dække hullet mellem sommerens hindbær og efterårets øvrige høst.',
 1.0,2.5,65,true),

-- ============================================================
-- BLADCIKORIE
-- ============================================================
('a1000000-0000-0000-0000-000000000031','Rød Verona',true,'Frøsamlerne','grøntsag',
 'Klassisk radicchio med tæt, vinrødt hoved. Bitter-sødlig smag, populær på restauranttallerkener.',
 true,true, 0.5,15,20,7,14, false,5,
 4,5, 5,7, 6,7, 9,11, 80, 30,25,
 'fuld sol','middel',false,'ikke nødvendig',false,false,
 'Salat, gulerod','Selleri',
 'Smagen bliver mildere og sødere efter let frost. Kan skæres tilbage til ny vækst.',
 1.5,3.0,55,true),

-- ============================================================
-- STIKKELSBÆR
-- ============================================================
('a1000000-0000-0000-0000-000000000092','Hinnomaki Red',false,null,'bær',
 'Finsk stikkelsbærsort med røde, søde bær. Robust og meget hårdfør.',
 false,false, null,null,null,null,null, false,null,
 null,null, null,null, null,null, 7,8, null, 150,120,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Hvidkløver under busken',null,
 'Beskær åbent i midten for luft og lys — mindsker meldug. Torne — brug handsker ved høst.',
 1.5,3.0,65,true),

-- ============================================================
-- SALVIE (flerårig)
-- ============================================================
('a1000000-0000-0000-0000-000000000102','Berggarten',false,null,'urt',
 'Bredbladet salvie med kraftig, klassisk aroma. Flerårig og vinterhårdfør.',
 false,true, 0.5,18,22,14,28, false,8,
 3,4, null,null, 5,6, 6,10, null, 40,40,
 'fuld sol','lav',true,'ikke nødvendig',false,false,
 'Rosmarin, timian, kål',null,
 'Kræver god dræning — rådner let i vådt ler. Klip tilbage om foråret for kompakt vækst.',
 null,null,250,true),

-- ============================================================
-- MYNTE (flerårig — spredningsvillig)
-- ============================================================
('a1000000-0000-0000-0000-000000000104','Marokkansk mynte',false,null,'urt',
 'Klassisk mynte til te og køkken. Flerårig, meget hårdfør og hurtigt spredende.',
 false,true, 0.5,15,20,10,20, false,6,
 3,4, null,null, 5,6, 5,10, null, 30,30,
 'halvskygge','høj',true,'ikke nødvendig',false,false,
 'Kål, tomat',null,
 'ADVARSEL: meget invasiv via rodudløbere — plant i nedgravet spand eller afgrænset bed.',
 0.5,1.5,150,true),

-- ============================================================
-- AGURK — en polytunnel-slangeagurk mere
-- ============================================================
('a1000000-0000-0000-0000-000000000010','Diva',false,null,'grøntsag',
 'Sødagurk uden kerner, egnet til polytunnel. Glat skræl, ingen bitterhed.',
 false,true, 1.0,18,24,5,8, true,4,
 4,5, null,null, 6,6, 7,9, 50, 100,50,
 'fuld sol','høj',false,'krævet',true,false,
 'Dild, bønner','Kartoffel, aromatiske urter',
 'Klatreplante — opbind til net eller snor. Trives markant bedre i polytunnel end på friland i DK.',
 3.5,7.0,35,true),

-- ============================================================
-- SALAT — en fast hovedsalat mere
-- ============================================================
('a1000000-0000-0000-0000-000000000030','Batavia (sprød)',false,null,'grøntsag',
 'Sprød, halvfast hovedsalat mellem iceberg og butterhead. God holdbarhed efter høst.',
 true,true, 0.3,10,16,5,10, false,4,
 3,8, 3,9, 4,9, 5,11, 45, 30,25,
 'fuld sol','middel',false,'ikke nødvendig',false,false,
 'Gulerod, radise, dild','Selleri',
 'Tåler transport og opbevaring bedre end blad-salater — god til restaurantleverance.',
 1.5,2.5,35,true),

-- ============================================================
-- KNOLDSELLERI
-- ============================================================
('a1000000-0000-0000-0000-000000000046','Giant Prague',false,null,'rod',
 'Klassisk knoldselleri med stor, glat knold. Lang sæson men holdbar til lagring.',
 false,true, 0.5,18,22,14,21, true,10,
 2,3, null,null, 5,6, 9,11, 100, 40,35,
 'fuld sol','høj',false,'ikke nødvendig',false,false,
 'Løg, porrer, tomat','Gulerod, pastinak',
 'Lang forspiringstid — sås tidligt (februar-marts). Kræver jævn, rigelig vanding hele sæsonen.',
 2.0,4.0,35,true),

-- ============================================================
-- BLADSELLERI
-- ============================================================
('a1000000-0000-0000-0000-000000000047','Tall Utah',false,null,'grøntsag',
 'Klassisk bladselleri med lange, sprøde stængler. Restaurant-stabel til bouillon og mirepoix.',
 false,true, 0.5,18,22,14,21, true,10,
 2,3, null,null, 5,6, 8,10, 90, 30,25,
 'fuld sol','høj',false,'anbefalet',false,false,
 'Løg, porrer, tomat','Gulerod, pastinak',
 'Meget vandkrævende — tørke giver seje, hule stængler. Polytunnel giver mere ensartet stængelkvalitet.',
 2.0,4.0,55,true);
