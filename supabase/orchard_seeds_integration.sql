-- Kobler Frugtplantage og Frø til den fælles afgrødedatabase, tilføjer
-- beskærings-opgavetype, og udfylder beskærings-/etableringsinfo for
-- frugttræer/-buske (som stod klar i skemaet men var tom for alle rækker).

-- 1. Nye kolonner: fruit_plants og seeds kan nu pege på en rigtig sort.
alter table fruit_plants add column if not exists variety_id uuid references crop_varieties(id) on delete set null;
alter table seeds add column if not exists variety_id uuid references crop_varieties(id) on delete set null;

-- 2. farm_tasks: kobling til et konkret træ/busk + ny opgavetype til beskæring.
alter table farm_tasks add column if not exists fruit_plant_id uuid references fruit_plants(id) on delete cascade;

alter table farm_tasks drop constraint if exists farm_tasks_task_type_check;
alter table farm_tasks add constraint farm_tasks_task_type_check
  check (task_type = any (array['såning','udplantning','lugning','høst','dyrepasning','flokflytning','indkøb','beskæring','andet']));

-- 3. Nye plantefamilier
insert into crop_families (name_da, scientific_name)
values
  ('Vinfamilien', 'Vitaceae'),
  ('Morbærfamilien', 'Moraceae'),
  ('Sølvbladfamilien', 'Elaeagnaceae')
on conflict do nothing;

-- 4. Nye arter (træer/buske)
insert into crop_species (family_id, name_da, scientific_name, plant_type)
select f.id, v.name_da, v.scientific_name, 'vedplante'
from (values
  ('Vindrue', 'Vitis vinifera', 'Vinfamilien'),
  ('Figen', 'Ficus carica', 'Morbærfamilien'),
  ('Morbær', 'Morus nigra', 'Morbærfamilien'),
  ('Havtorn', 'Hippophae rhamnoides', 'Sølvbladfamilien'),
  ('Ildtorn', 'Pyracantha coccinea', 'Rosenfamilien')
) as v(name_da, scientific_name, family_name)
join crop_families f on f.name_da = v.family_name
on conflict do nothing;

-- 5. Sorter på de nye arter + mirabel/madæble på eksisterende arter
insert into crop_varieties (
  species_id, name, row_spacing_cm, plant_spacing_cm, pruning_month_from, pruning_month_to,
  pruning_notes, establishment_years, establishment_notes, years_to_first_harvest,
  description, care_notes, is_system_variety
)
select cs.id, v.name, v.row_sp, v.plant_sp, v.prune_from, v.prune_to,
       v.prune_notes, v.est_years, v.est_notes, v.years_harvest,
       v.descr, v.care, true
from (values
  ('Vindrue', 'Solaris', 150, 150, 11, 2,
   'Vinterbeskæring november–marts (undgå frostperioder). Vælg 2-4 gode sideskud med 40-50 cm afstand, skær resten af årets skud ned til korte "spurs" med 2-5 knopper.',
   3, 'Kræver espalier/opbindingssystem fra plantning. Fjern blomsterklaser år 1-2 for at styrke rodnettet.', 3,
   'Tidligt modnende, robust hvid druesort velegnet til dansk klima — populær til hvidvin og drueavl uden drivhus.',
   'Rækkeafstand mindst 2,5 m ved flere rækker.'),
  ('Vindrue', 'Rondo', 150, 150, 11, 2,
   'Vinterbeskæring november–marts (undgå frostperioder). Vælg 2-4 gode sideskud med 40-50 cm afstand, skær resten af årets skud ned til korte "spurs" med 2-5 knopper.',
   3, 'Kræver espalier/opbindingssystem fra plantning. Fjern blomsterklaser år 1-2 for at styrke rodnettet.', 3,
   'Tidligt modnende, mørk druesort avlet til koldere klimaer — velegnet til rødvin i Danmark.',
   'Rækkeafstand mindst 2,5 m ved flere rækker.'),
  ('Figen', 'Bornholm', 250, 250, 3, 3,
   'Beskær tidligt forår før nye skud sætter — større indgreb bedst i juli-sep (undgå at figen "bløder" mælkesaft). Fjern kun 1-2-årige grene ved større beskæring.',
   3, 'Skal have varm, solrig og læ placering — sydvendt mur er ideel. Beskyt rod og stamme om vinteren de første år (bark-mulch, vintermåtte).', 3,
   'Den mest udbredte hårdføre figensort i danske haver — tåler ned til ca. -12°C og modner frugt under danske forhold.',
   'To høst pr. sæson mulig i gode år (breba-høst forsommer, hovedhøst efterår).'),
  ('Morbær', 'Sort morbær', 400, 400, 1, 2,
   'Beskær mindst muligt — morbær kan bløde kraftigt ved forkert beskæring. Fjern kun døde, beskadigede eller krydsende grene, sent på vinteren mens træet er i hvile.',
   4, 'Trives bedst i de varmeste egne af Danmark (Bornholm, Sydsjælland, Lolland-Falster, Østjyllands kyst). Vælg et lunt, solrigt sted.', 4,
   'Morus nigra — sort morbær med den bedste smag og et dekorativt bladværk. Frugten modner ujævnt og plukkes løbende.',
   'Falder let og pletter — undgå belægning/hvidt terrasse under træet.'),
  ('Havtorn', 'Leikora (hunplante)', 150, 150, 8, 9,
   'Beskær ved høst — fjern de ældste grene (3+ år), da bær kun sætter på 2-3-årige grene. Skær ikke helt ind til stammen; lad en lille stub blive til nye sideskud.',
   3, 'Kræver en hanplante (fx "Pollmix") inden for vindbestøvningsafstand — én han kan bestøve op til 6-10 hunplanter.', 3,
   'Højtydende hunsort med store, orange, C-vitaminrige bær. Kvælstoffikserende — god til jordforbedring i læhegn.',
   'Plantafstand 1-1,2 m i hæk, 2-3 m som fritstående busk.'),
  ('Havtorn', 'Pollmix (hanplante)', 150, 150, 8, 9,
   'Beskær for sund struktur og god blomstring efter høstsæsonen — sætter ikke selv bær.',
   3, 'Bestøver-plante, sættes for hver 6-10 hunplanter.', null,
   'Hanplante uden bær — sikrer bestøvning af hunplanterne. Sættes i samme læhegn/række.',
   null),
  ('Ildtorn', 'Orange Glow', 100, 100, 7, 7,
   'Beskær én gang årligt efter blomstring (juli) — klip til ønsket form/størrelse. Brug handsker pga. torne.',
   2, 'Stedsegrøn — god som tæt, tornet hæk til afskærmning og fuglebeskyttelse.', null,
   'Klassisk orange-rød hækplante. Bærrene er IKKE spiselige for mennesker (kan give mavebesvær) men vigtig vinterføde for fugle.',
   'Op til 3-4 m høj ubeskåret.'),
  ('Ildtorn', 'Soleil d''Or', 100, 100, 7, 7,
   'Beskær én gang årligt efter blomstring (juli) — klip til ønsket form/størrelse. Brug handsker pga. torne.',
   2, 'Stedsegrøn — god som tæt, tornet hæk til afskærmning og fuglebeskyttelse.', null,
   'Gulfrugtet ildtorn. Bærrene er IKKE spiselige for mennesker men vigtig vinterføde for fugle.',
   'Op til 3-4 m høj ubeskåret.'),
  ('Blommetre', 'Mirabelle de Nancy', 400, 350, 7, 8,
   'Beskær KUN i tørt sommervejr (juli-august) — aldrig om vinteren eller det tidlige forår; sår i den kolde periode øger risikoen for sølvskimmel og bakteriekræft.',
   4, null, 4,
   'Lille, gylden mirabelsort (Prunus domestica) — meget sød smag, klassisk til syltning og bagning.',
   null),
  ('Æble', 'Bramley''s Seedling', 400, 350, 1, 3,
   'Beskær i hviletiden (jan-marts) mens strukturen er synlig, eller om sommeren (juli-sep) for at begrænse kraftig genvækst. Skær kun grene under 10 cm i diameter, ved grenkraven — ikke ind i den.',
   4, null, 4,
   'Den klassiske engelske madæble — stort, syrligt æble der falder helt fra hinanden ved kogning. Ikke til rå spisning.',
   null)
) as v(species_name, name, row_sp, plant_sp, prune_from, prune_to, prune_notes, est_years, est_notes, years_harvest, descr, care)
join crop_species cs on cs.name_da = v.species_name
on conflict do nothing;

-- 6. Udfyld beskærings-/etableringsinfo for de EKSISTERENDE frugttræer/-buske
-- (feltet fandtes og blev allerede vist på sorten, men stod tomt for alle rækker).

-- Æble + Pære: kernefrugt — tåler vinterbeskæring, men sommerbeskæring (jul-sep) anbefales i dag for at begrænse genvækst.
update crop_varieties cv set
  pruning_month_from = 1, pruning_month_to = 3,
  pruning_notes = 'Beskær i hviletiden (jan-marts) mens grenstrukturen er synlig, eller om sommeren (juli-sep) hvis du vil begrænse kraftig genvækst/vandskud. Undgå beskæring omkring udspring, blomstring og løvfald. Skær kun grene under 10 cm i diameter, og skær ved grenkraven — ikke ind i den, så såret kan hele.',
  establishment_years = 4,
  establishment_notes = 'Fjern blomster/frugtansats de første 1-2 år så træet bruger kræfterne på rodudvikling. Vand godt de første to somre.',
  years_to_first_harvest = 4
from crop_species cs
where cv.species_id = cs.id and cs.name_da in ('Æble', 'Pære');

-- Blommetre + Kirsebærtræ: stenfrugt — KUN sommerbeskæring pga. sølvskimmel/bakteriekræft-risiko ved vinterskader.
update crop_varieties cv set
  pruning_month_from = 7, pruning_month_to = 8,
  pruning_notes = 'Beskær KUN i tørt sommervejr (juli-august) — aldrig om vinteren eller det tidlige forår. Sår i den kolde årstid øger markant risikoen for sølvskimmel og bakteriekræft, som stenfrugt er meget følsomt over for. Skær tørt og rent i tørvejr.',
  establishment_years = 4,
  years_to_first_harvest = 4
from crop_species cs
where cv.species_id = cs.id and cs.name_da in ('Blommetre', 'Kirsebærtræ');

-- Hassel: beskær sent på vinteren, tynd rodskud, kan drives som stævningstræ.
update crop_varieties cv set
  pruning_month_from = 2, pruning_month_to = 3,
  pruning_notes = 'Beskær sent på vinteren (feb-marts) mens rakler stadig hænger. Fjern rodskud løbende gennem sæsonen. Kan også drives som stævningstræ (skæres helt ned hvert 7.-10. år) i et regenerativt system for konstant løvfoder/brænde.',
  establishment_years = 4,
  years_to_first_harvest = 4
from crop_species cs
where cv.species_id = cs.id and cs.name_da = 'Hassel';

-- Ribs + Solbær + Stikkelsbær: beskær ved/lige efter høst, fjern ældste grene ved basis.
update crop_varieties cv set
  pruning_month_from = 8, pruning_month_to = 8,
  pruning_notes = 'Beskær bedst straks efter høst (august) — fjern ca. 1/3 af de ældste, mørkeste grene helt ved jorden hvert år, så busken hele tiden har en blanding af 1-5-årige grene (bær sættes bedst på 2-5-årige grene). Alternativt sen vinter/tidligt forår før knopspring.',
  establishment_years = 3,
  years_to_first_harvest = 3
from crop_species cs
where cv.species_id = cs.id and cs.name_da in ('Ribs', 'Solbær', 'Stikkelsbær');

-- Blåbær: minimal beskæring de første år, dernæst udtynding af ældste grene.
update crop_varieties cv set
  pruning_month_from = 2, pruning_month_to = 3,
  pruning_notes = 'Undlad beskæring de første 3 år ud over at fjerne døde/svage grene. Derefter: fjern årligt de 1-2 ældste/svageste grene ved basis i februar-marts mens busken er i hvile, for at holde gang i frisk bærgivende vækst.',
  establishment_years = 3,
  establishment_notes = 'Kræver sur jord (pH 4,5-5,5) — tjek/juster jorden før plantning.',
  years_to_first_harvest = 3
from crop_species cs
where cv.species_id = cs.id and cs.name_da = 'Blåbær';

-- Hindbær: sommersort (Tulameen) vs. efterårssort (Autumn Bliss) beskæres helt forskelligt.
update crop_varieties cv set
  pruning_month_from = 8, pruning_month_to = 9,
  pruning_notes = 'Sommerbærende sort: skær de udbårne (grå/brune) stængler helt ned til jorden lige efter høst. Behold årets nye grønne skud — de bærer frugt næste sommer. Bind evt. op på espalier.',
  establishment_years = 2, years_to_first_harvest = 2
from crop_species cs
where cv.species_id = cs.id and cs.name_da = 'Hindbær' and cv.name = 'Tulameen';

update crop_varieties cv set
  pruning_month_from = 2, pruning_month_to = 2,
  pruning_notes = 'Efterårsbærende sort: skær ALLE stængler helt ned til jorden i februar, mens planten er i hvile — den sætter frugt på årets nye skud, så gammel stub giver ingen fordel.',
  establishment_years = 1, years_to_first_harvest = 1
from crop_species cs
where cv.species_id = cs.id and cs.name_da = 'Hindbær' and cv.name = 'Autumn Bliss';

-- Jordbær: ikke træagtig — "beskæring" er reelt oprydning/udtynding af udløbere efter høst.
update crop_varieties cv set
  establishment_years = 1,
  establishment_notes = 'Fjern blomster i plantningsåret på junibærende sorter for stærkere planter året efter (remonterende sorter som Mara des Bois kan derimod høstes samme sæson). Klip gammelt løv og overskydende udløbere væk efter høst.',
  years_to_first_harvest = 1
from crop_species cs
where cv.species_id = cs.id and cs.name_da = 'Jordbær';

-- Rabarber: ingen beskæring — deles i stedet hvert 5.-10. år.
update crop_varieties cv set
  establishment_notes = 'Høst intet i plantningsåret, høst sparsomt år 2 — lad planten opbygge kronen. Del kronen hvert 5.-10. år i det tidlige forår, når den bliver trængt eller udbyttet falder.',
  years_to_first_harvest = 2
from crop_species cs
where cv.species_id = cs.id and cs.name_da = 'Rabarber';
