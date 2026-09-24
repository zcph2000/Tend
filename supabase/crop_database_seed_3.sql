-- ============================================================
-- AFGRØDEDATABASEN — Tillæg 3
-- Kør EFTER crop_database_seed_2.sql
-- Dækker Zakis liste over afgrøder der skal kunne vælges i Tend.
-- De fleste stod allerede i seed.sql/seed_2.sql (gulerod, tomat,
-- broccoli, jordbær, purløg m.fl.) — dette tillæg dækker det der
-- reelt manglede: nye arter (jordskok, chili, kikærter, limabønner,
-- rosenkål, forårsløg, løvstikke, tagetes, kapucinerkarse, feldsalat)
-- og nye sorter på eksisterende arter der stod helt uden (aubergine)
-- eller manglede en bestemt variant (rødløg, persillerod, skoleagurk,
-- spidskål, ærteskud).
-- ============================================================

-- Nye arter
insert into crop_species (id, family_id, name_da, scientific_name, plant_type) values
  ('a1000000-0000-0000-0000-000000000130', 'f1000000-0000-0000-0000-000000000005', 'Løvstikke',     'Levisticum officinale',  'flerårig'),
  ('a1000000-0000-0000-0000-000000000131', 'f1000000-0000-0000-0000-000000000004', 'Tagetes',       'Tagetes patula',         'etårig'),
  ('a1000000-0000-0000-0000-000000000132', null,                                    'Kapucinerkarse','Tropaeolum majus',       'etårig'),
  ('a1000000-0000-0000-0000-000000000133', null,                                    'Feldsalat',     'Valerianella locusta',   'etårig'),
  ('a1000000-0000-0000-0000-000000000134', 'f1000000-0000-0000-0000-000000000004', 'Jordskokker',   'Helianthus tuberosus',   'flerårig'),
  ('a1000000-0000-0000-0000-000000000135', 'f1000000-0000-0000-0000-000000000001', 'Chili',         'Capsicum annuum',        'etårig'),
  ('a1000000-0000-0000-0000-000000000136', 'f1000000-0000-0000-0000-000000000007', 'Kikærter',      'Cicer arietinum',        'etårig'),
  ('a1000000-0000-0000-0000-000000000137', 'f1000000-0000-0000-0000-000000000007', 'Limabønner',    'Phaseolus lunatus',      'etårig'),
  ('a1000000-0000-0000-0000-000000000138', 'f1000000-0000-0000-0000-000000000003', 'Rosenkål',      'Brassica oleracea var. gemmifera', 'etårig'),
  ('a1000000-0000-0000-0000-000000000139', 'f1000000-0000-0000-0000-000000000008', 'Forårsløg',     'Allium fistulosum',      'etårig')
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
-- LØVSTIKKE (flerårig — bliver stor, 1,5-2 m)
-- ============================================================
('a1000000-0000-0000-0000-000000000130','Standard løvstikke',false,null,'urt',
 'Flerårig krydderurt med intens, bouillon-agtig smag. Bliver et stort, staudeagtigt "træ" af en plante.',
 true,true, 1.0,15,20,14,21, false,8,
 3,4, null,null, 5,6, 5,10, null, 80,80,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Gulerod, æbletræ',null,
 'Bliver meget stor — giv den plads eller sæt den i kanten af bedet. Blade og frø kan begge bruges.',
 null,null,180,true),

-- ============================================================
-- TAGETES (companion-/spiseblomst)
-- ============================================================
('a1000000-0000-0000-0000-000000000131','Fløjlsblomst (standard)',false,null,'blomst',
 'Klassisk companion-plante der afskrækker nematoder og bladlus. Kronbladene er spiselige og bruges som garniture.',
 true,true, 0.5,15,20,5,10, false,5,
 3,4, 5,6, 5,6, 6,10, 55, 30,25,
 'fuld sol','middel',false,'ikke nødvendig',false,false,
 'Tomat, kål, agurk',null,
 'Plant mellem tomater og kål for skadedyrsbekæmpelse. Fjern visne blomster løbende for flere nye.',
 null,null,null,true),

-- ============================================================
-- KAPUCINERKARSE (spiseblomst — også "fælde-plante" for bladlus)
-- ============================================================
('a1000000-0000-0000-0000-000000000132','Kapucinerkarse (standard)',false,null,'blomst',
 'Hurtigtvoksende spiseblomst med pebret smag. Blade og blomster spises begge — populær restaurantgarniture.',
 true,false, 2.0,15,20,7,14, false,null,
 null,null, 5,6, null,null, 6,10, null, 30,30,
 'fuld sol','lav',false,'ikke nødvendig',false,false,
 'Kål, agurk, æbletræ',null,
 'Tiltrækker bladlus væk fra andre afgrøder ("fælde-plante") — plant gerne lidt afsides fra sarte planter. Sås let direkte.',
 null,null,null,true),

-- ============================================================
-- FELDSALAT (vintersalat — kun direkte såning)
-- ============================================================
('a1000000-0000-0000-0000-000000000133','Vit',false,null,'grøntsag',
 'Meget frostfast vintersalat med mild, nøddeagtig smag. Fylder hullet mellem efterårets og forårets øvrige salater.',
 true,false, 0.5,5,15,10,21, false,null,
 null,null, 8,10, null,null, 10,3, null, 15,5,
 'halvskygge','middel',true,'anbefalet',false,false,
 'Radise, gulerod',null,
 'Tåler ned til -15°C under polytunnel/fiberdug. Sås tæt — høstes som hele små roser.',
 1.0,2.0,80,true),

-- ============================================================
-- JORDSKOKKER (flerårig — plantes som knolde, spreder sig kraftigt)
-- ============================================================
('a1000000-0000-0000-0000-000000000134','Fuseau',false,null,'rod',
 'Aflang, glat jordskoksort — nemmere at skrælle end de knudrede typer. Sød, artiskok-agtig smag.',
 false,false, 10.0,null,null,null,null, false,null,
 null,null, null,null, 3,4, 10,2, null, 60,40,
 'fuld sol','lav',true,'ikke nødvendig',false,false,
 'Majs, solsikke','Fennikel',
 'ADVARSEL: spreder sig meget kraftigt via knolde — afgræns bedet eller giv den sit eget hjørne. Kan blive stående og høstes hele vinteren.',
 3.0,6.0,20,true),

-- ============================================================
-- CHILI
-- ============================================================
('a1000000-0000-0000-0000-000000000135','Cayenne',false,null,'grøntsag',
 'Klassisk, pålidelig stærk chili. Lange, tynde frugter. God produktion selv i dansk sommer under tag.',
 false,true, 0.5,20,26,10,21, true,10,
 2,3, null,null, 5,6, 8,10, 80, 40,35,
 'fuld sol','middel',false,'krævet',true,false,
 'Basilikum, tomat, peberfrugt','Fennikel',
 'Kræver mere varme og længere sæson end sød peberfrugt — polytunnel er reelt et krav i Danmark.',
 1.0,2.5,150,true),

-- ============================================================
-- KIKÆRTER (marginal i dansk klima — kræver lang, varm sommer)
-- ============================================================
('a1000000-0000-0000-0000-000000000136','Standard kikært',false,null,'grøntsag',
 'Bælgplante med nøddeagtig smag. Marginal i dansk klima — kræver en lang, varm sommer for at lykkes godt.',
 true,false, 3.0,10,20,10,21, false,null,
 null,null, 5,5, null,null, 9,9, null, 30,10,
 'fuld sol','lav',false,'anbefalet',false,false,
 'Gulerod, majs','Løg, hvidløg',
 'Usikker afgrøde i dansk friland — bedst chance i en varm, tør sommer eller under polytunnel. Sås ikke før jorden er varm.',
 0.3,0.8,80,true),

-- ============================================================
-- LIMABØNNER (marginal — kræver varme, polytunnel anbefales stærkt)
-- ============================================================
('a1000000-0000-0000-0000-000000000137','Standard limabønne',false,null,'grøntsag',
 'Cremet, stivelsesrig bønne. Kræver lang, varm sæson — reelt kun realistisk i polytunnel i Danmark.',
 false,true, 2.5,18,24,7,14, true,4,
 5,5, null,null, 6,6, 9,10, 90, 40,15,
 'fuld sol','middel',false,'krævet',true,false,
 'Majs, solsikke','Løg',
 'Ærlig besked: dette er en varmekrævende afgrøde der kæmper på dansk friland. Overvej at starte i lille skala i polytunnel.',
 0.5,1.5,90,true),

-- ============================================================
-- ROSENKÅL (lang sæson, høstes efter frost)
-- ============================================================
('a1000000-0000-0000-0000-000000000138','Standard rosenkål',false,null,'grøntsag',
 'Klassisk rosenkål. Lang sæson, men smagen bliver markant bedre efter de første nattefroster.',
 false,true, 1.0,18,22,5,10, true,6,
 3,4, null,null, 5,6, 10,1, 120, 60,60,
 'fuld sol','middel',true,'ikke nødvendig',true,false,
 'Løg, salat, dild','Tomat, jordbær',
 'Høst nedefra og op efterhånden som de modner. Kan blive stående i frost — smager bedst efter kulde.',
 1.5,3.0,35,true),

-- ============================================================
-- FORÅRSLØG (hurtig, sås successivt)
-- ============================================================
('a1000000-0000-0000-0000-000000000139','Standard forårsløg',false,null,'løg',
 'Hurtigtvoksende, mild løg der høstes grøn og ung — hele planten spises. God til successiv såning hele sæsonen.',
 true,true, 1.0,10,18,7,14, false,6,
 2,7, 3,8, 4,9, 5,10, null, 15,5,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Gulerod, salat, radise','Bønner, ærter',
 'Sås successivt hver 2.–3. uge for løbende høst. Høst når stænglen er blyantstyk.',
 1.0,2.5,60,true),

-- ============================================================
-- SALAT — romain/cos
-- ============================================================
('a1000000-0000-0000-0000-000000000030','Romain (Cos)',false,null,'grøntsag',
 'Opret voksende hovedsalat med sprøde, faste blade. Klassisk til caesarsalat og grillet salat.',
 true,true, 0.3,10,16,5,10, false,4,
 3,8, 3,9, 4,9, 5,11, 55, 30,25,
 'fuld sol','middel',false,'ikke nødvendig',false,false,
 'Gulerod, radise, dild','Selleri',
 'Tager lidt længere tid end løs bladsalat, men holder bedre til opbevaring og grill.',
 1.5,2.5,30,true),

-- ============================================================
-- AUBERGINE — stod uden nogen sort
-- ============================================================
('a1000000-0000-0000-0000-000000000003','Rosa Bianca',true,'Frøsamlerne','grøntsag',
 'Italiensk heirloom-aubergine med lyserosa-hvid, stribet frugt. Mild, cremet smag uden bitterhed.',
 false,true, 0.5,22,28,10,21, true,10,
 2,3, null,null, 5,6, 8,10, 80, 50,45,
 'fuld sol','middel',false,'krævet',true,false,
 'Basilikum, bønner, peberfrugt','Fennikel',
 'Kræver mere varme end tomat — polytunnel er reelt et krav i dansk klima. Opbind stænglen, den bliver tung med frugt.',
 2.0,4.0,55,true),

-- ============================================================
-- AGURK — skoleagurk (lille snackagurk)
-- ============================================================
('a1000000-0000-0000-0000-000000000010','Mini-agurk (skoleagurk)',false,null,'grøntsag',
 'Lille, sprød snackagurk — den klassiske "skoleagurk". Kompakt plante, meget produktiv, spises med skræl.',
 false,true, 1.0,18,24,5,8, true,4,
 4,5, null,null, 6,6, 7,9, 45, 60,35,
 'fuld sol','høj',false,'anbefalet',false,false,
 'Dild, bønner','Kartoffel',
 'Høst ved 8–12 cm for den klassiske størrelse — høst hyppigt, jo mere du høster jo mere sætter planten.',
 3.0,6.0,40,true),

-- ============================================================
-- LØG — rødløg
-- ============================================================
('a1000000-0000-0000-0000-000000000070','Red Baron',false,null,'løg',
 'Rødt løg med god farve og mild, sødlig smag rå. Populær til salater og syltning.',
 true,true, 1.5,10,18,10,14, false,10,
 2,3, 4,5, 5,5, 8,9, null, 25,10,
 'fuld sol','lav',true,'ikke nødvendig',false,false,
 'Gulerod, salat, persille','Bønner, ærter',
 'Lidt mindre løg end gule sorter, men bedre farve og smag rå. Sæt sætteløg eller forspir fra frø.',
 2.5,5.5,30,true),

-- ============================================================
-- TOMAT — en pålidelig standardsort mere
-- ============================================================
('a1000000-0000-0000-0000-000000000001','Moneymaker',false,null,'grøntsag',
 'Klassisk, meget pålidelig rund rød tomat. Højtydende og robust — mindre kompleks smag end heirloom-sorterne, men et sikkert bud til store mængder.',
 false,true, 0.5,16,22,7,14, true,8,
 2,3, null,null, 5,6, 7,10, 65, 50,40,
 'fuld sol','middel',false,'anbefalet',true,true,
 'Basilikum, løg, tagetes','Fennikel',
 'Nip sideskud løbende. God til sauce og konserves i store mængder.',
 3.5,7.0,35,true),

-- ============================================================
-- HVIDKÅL — spidskål (tidlig, spises frisk, ikke til lagring)
-- ============================================================
('a1000000-0000-0000-0000-000000000023','Spidskål (tidlig)',false,null,'grøntsag',
 'Klassisk tidlig spidskål med mørt, sødligt blad. Spises frisk — modsat Filderkraut er den ikke til lagring.',
 false,true, 1.0,18,22,5,10, true,4,
 2,7, null,null, 4,8, 6,10, 60, 40,35,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Løg, salat','Tomat, jordbær',
 'Kan sås successivt hele sæsonen for løbende høst. Mør og sødlig — bruges typisk rå eller let dampet.',
 2.0,3.5,20,true),

-- ============================================================
-- PERSILLE — persillerod (samme art, dyrket for roden)
-- ============================================================
('a1000000-0000-0000-0000-000000000042','Persillerod (Halblange)',false,null,'rod',
 'Samme plante som bladpersille, men dyrket for den hvide, sødligt-milde rod. Klassisk i suppe og gryderetter.',
 true,false, 1.5,10,18,14,21, false,null,
 null,null, 4,5, null,null, 9,11, null, 25,8,
 'fuld sol','middel',true,'ikke nødvendig',false,false,
 'Gulerod, løg',null,
 'Sås tyndere end bladpersille og gives hele sæsonen til at udvikle rod. Kan blive stående i jorden til efter frost.',
 2.0,3.5,30,true),

-- ============================================================
-- ÆRT — bælgært til udbælgning + ærteskud
-- ============================================================
('a1000000-0000-0000-0000-000000000060','Kelvedon Wonder',false,null,'grøntsag',
 'Klassisk bælgært til udbælgning — modsat Sugar Snap spises kun de modne ærter, ikke bælgen.',
 true,false, 3.0,7,16,7,16, false,null,
 null,null, 3,5, null,null, 6,8, null, 20,5,
 'fuld sol','middel',true,'ikke nødvendig',true,false,
 'Gulerod, radise, salat','Løg, hvidløg',
 'Høst når bælgene er fyldte men stadig friske og grønne. Kræver net eller hegn at klatre på.',
 1.0,2.5,45,true),

('a1000000-0000-0000-0000-000000000060','Ærteskud',false,null,'grøntsag',
 'Almindelige ærter sået meget tæt og høstet som unge skud efter 2–3 uger — ikke til bælgudvikling. Populær restaurant-topping.',
 true,true, 3.0,7,16,7,16, false,null,
 null,null, 3,9, null,null, null,null, null, 10,2,
 'fuld sol','middel',true,'anbefalet',false,false,
 null,null,
 'Sås meget tæt (næsten som en dækafgrøde). Høst med saks ved 10–15 cm højde, 15–20 dage efter såning. Kan gentages i samme bed flere gange pr. sæson.',
 0.4,0.8,180,true);
