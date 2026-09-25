# Tend — Projektbriefing til Claude

## Arbejdsproces

Før du går i gang med nogen opgave:
1. Læs CLAUDE.md og gennemgå den eksisterende kode der er relevant for opgaven.
2. Præsenter altid dit forslag og din plan til brugeren og vent på godkendelse — implementer aldrig noget uden at planen er bekræftet.
3. Stil afklarende spørgsmål hvis opgaven er uklar frem for at gætte.
4. Brugeren er ikke teknisk — forklar hvad du har tænkt dig i plain dansk inden du koder.
5. Opdater CLAUDE.md efter hver session.

---

## Grundtanken — hvad Tend egentlig er

Tend er ikke en driftsapp med regenerative features. Det er en **regenerativ app** — bygget på det grundlag at landbrug skal helbrede jord, vand, biodiversitet og klima, ikke blot producere effektivt.

Udgangspunktet er de regenerative principper:
- **Hold jordens overflade dækket** hele år — planterester, dækafgrøder, mulch
- **Minimer jordforstyrrelse** — ingen unødig pløjning, minimal kemibrug
- **Hold levende rødder i jorden** mest muligt — flerårige planter, efterafgrøder
- **Integrér husdyr** — dyr er ikke bare produktion, de er en helende kraft i landskabet
- **Øg biodiversitet** — planter, svampe, insekter, mikrober, fugle, pattedyr
- **Forstå kontekst** — alle beslutninger træffes ud fra det specifikke sted, klima og mål

Tend hjælper brugeren med at *spore om de bevæger sig i den rigtige retning* — ikke bare om dyrene har det godt eller marken er inddelt rigtigt, men om gården som helhed er ved at blive mere levende, mere frugtbar og mere modstandsdygtig over tid.

---

## Hvad er bygget (faktisk nuværende tilstand)

### Auth & Gårdsopsætning
- Login med email/password via Supabase Auth
- Gårdsopsætning med navn, adresse, GPS-koordinater og AI-profiltekst
- Én gård pr. bruger (1:1 farm↔user)

### Dashboard (`/dashboard`)
- Vejr (Open-Meteo, server-side, caches 1 time)
- Rotationsstatus for aktive flokke
- Oversigt over kommende kalenderopgaver

### Dyr (`/animals`)
- Multi-dyr: "Tilføj dyr" er et to-trins flow — vælg art først, så tilpasser resten af formularen sig
  - **Individdyr** (får/kvæg/geder/svin/andet): øremærke, race, køn, fødselsdato — som hidtil
  - **Flokdyr** (høns, udvidbart senere): ét kort pr. flok med antal høner/haner og formål (kød/æg), intet øremærke
- Alle art-afhængige tekster (hændelsestyper, kønsbetegnelser, ungebetegnelser) kommer fra `lib/animalTerms.ts` — ikke hardcodet fåresprog
- Dyrliste med art-opdelte oversigtstal, race, øremærke, status
- Dyrdetalje med hændelseshistorik (kalvning/lamning/farring alt efter art, sygdom, behandling, flytning, vejning, slut, andet)
- Slet dyr (med bekræftelse) fra redigeringssiden — fanger fejl hvis dyret er registreret som mor/far til et andet dyr
- Floktilknytning og gruppetilknytning
- Flokke: opret (med art — bruges til korrekt rotationsberegning), vis, administrer dyr i flok
- Grupper: opret, vis, administrer dyr i gruppe
- Dyr uden gruppe: `ungrouped`-side

### Rotation (`/rotation`)
- Oversigt over aktive grazings med AMP-anbefalinger
- Flyt flok-knap: logger flytning og opdaterer grazing_records

### Farming (`/farming`)
Oversigtside med links til undermoduler:

**Marker (`/farming/pastures`)**
- Liste over marker
- Markdetalje: sektioner med geokoordinater, hegnsplan (FenceGuide), jordtype
- Tilføj sektion med korteditor (MapSectionEditor)
- Jordmålinger: pH, organisk materiale %, orme/m², vandretention
- Rediger jordtype

**Bede (`/farming/beds`)** — dækker friland, polytunnel og opvarmet drivhus i ét system
- Bedeoversigtsliste med status og section-gruppering
- Bede-kort (SVG-overblik over alle sektioner og bede med farvekodning) (`/farming/beds/map`)
- Opret nyt bed med sektion, mål, placeringstype (friland/polytunnel/drivhus_opvarmet) — en sektion mærket "Polytunnel" er den rigtige måde at oprette en polytunnel på; bedene i den arver automatisk placeringstypen
- `/farming/polytunnel` (det gamle, separate polytunnel-modul) redirecter nu ind i dette flow — de gamle `polytunnels`/`polytunnel_plantings`-tabeller er ubrugte men ikke slettet
- Bede-sektion-detaljeside (`/farming/beds/section/[id]`)
- Bed-detaljeside (`/farming/beds/[id]`):
  - BedLayoutSVG: visuel SVG-tegning af bedet med plantningszoner i farver
  - Aktive plantninger (PlantingCard) med sow/transplant/harvest-datoer
  - PlantingPlannerForm: genvej til at planlægge ny plantning direkte fra bedet
  - AddPlantingForm: registrér faktisk udført plantning
  - EditPlantingForm: rediger eksisterende plantning
  - KompostForm: log kompost-tilsætning
- Rediger bed (`/farming/beds/[id]/edit`)

**Afgrøder (`/farming/crops`)**
- Database over afgrødearter og sorter fra `crop_species`/`crop_varieties`
- Afgrøde-detaljeside med sorter, planteafstand, dage til høst
- Opret ny afgrøde/sort

**Kompost (`/farming/compost`)**
- Oversigt over kompostbunker og tilsætninger

**Frø (`/farming/seeds`)**
- Frøoversigt (frøbeholdning)

**Frugtplantage (`/farming/orchard`)**
- Frugtplantage-oversigt

### Operations (`/operations`)
Oversigt med links til undermoduler:

**Kalender (`/operations/calendar`)**
- Månedsvisning som standardside (Google Calendar-stil) — 7-kolonners gitter, navigér måned-til-måned via `?m=YYYY-MM`, klik en dag → dagsvisning på `/operations/calendar/[date]`
- Periode-opgaver (`due_date_end` på farm_tasks) vises som farvede bjælker der strækker sig hen over de relevante dage/uger — beregnes og lægges i "lanes" pr. uge-række i `calendar/page.tsx` (`layoutBarsForWeek`)
- Punkt-opgaver (kun `due_date`) vises som små ikon+label-rækker i dagcellen
- Dagsvisning viser alle opgaver for én dag inkl. "Dag X af Y" for periode-opgaver der er i gang, samme kort-stil som det gamle "I DAG"-kort
- Opgaver med kategori (jordbrug/dyr/admin/økonomi/andet), status (pending/done/skipped)
- Opret manuel opgave (AddTaskForm) — inkl. valgfrit "Til og med"-datofelt der sætter `due_date_end` for periode-opgaver
- Marker opgave som udført/sprunget over (CheckTaskButton)
- Print-venlig CSS (`@media print` i `globals.css`) skjuler TopBar/BottomNav og lysner temaet, så månedsvisningen kan printes og hænges op
- Delt event-beregning (rotation, høst, farm_tasks) i `lib/calendarEvents.ts` — `getCalendarEvents(supabase, farmId, rangeStart, rangeEnd)` — bruges af både måneds- og dagsvisning
- Opgaver oprettes automatisk fra plantningsplanlæggeren

**Økonomi (`/operations/economy`)**
- Oversigt over høstlogning og dyreprodukter og udgifter
- Log høst fra plantning (PlantingHarvestRow)
- Log dyreprodukt: mælk, æg, uld osv. (AnimalProductForm)
- Log udgift (ExpenseForm)

### Biodiversitet (`/biodiversity`)
- Log biodiversitetsobservationer: insekter, fugle, planter, svampe, pattedyr
- Oversigt over observationer med dato og kategori

### Planlæg / Tools (`/tools`)
- Oversigtsside med links til planlægningsværktøjer

**AI Rådgiver (`/tools/advisor`)**
- Chatgrænseflade til Claude API med fuld gårdskontekst (dyr, marker, bede, plantninger, vejr)
- Beskeder gemmes i `chat_messages`-tabellen
- ChatInterface client component

**Rotationsplanlægger (`/tools/rotation-planner`)**
- Beregner sektionsstørrelse, tæthed, hvileperiode ud fra flokstørrelse og markens areal
- Info-side med forklaringer (`/tools/rotation-planner/info`)

**Forspiringsoverblik (`/tools/propagation`)**
- Fase 1 (Plan): Vælg afgrøde/sort, vælg dato-mode (fra udplantning / fra høst), beregn spiredato og frøkøb
- Fase 2 (Vælg bed): Sorter bede efter ledigt plads og varmeafgrøde-match (polytunnel/drivhus foreslås til natskyggefamilien og græskarfamilien), vælg zone-placering
- Gemmer `bed_planting` med status='planlagt' og opretter opgaver i kalenderen (køb frø, spir, udplant, høst)
- Baseret på `crop_varieties` og `beds` fra Supabase

**Sæsonplan (`/tools/season-plan`)**
- Sæt hele restaurantens behov ind på én gang (afgrøde + ønsket kg for sæsonen + prioritet) og få en samlet plan tilbage
- Grådig, prioritetsstyret allokering mod bedenes ledige plads lige nu (ingen succession endnu — det er en fremtidig udvidelse)
- Én afgrøde kan spredes over flere bede; datoer beregnes automatisk ud fra hver afgrødes eget høstvindue
- Deler logik med Forspiringsoverblikket via `lib/cropPlanning.ts` og `lib/seasonPlanAllocator.ts`

**Sædeskifteplan** — *Kommer snart*
**Vandingsplan** — *Kommer snart*

### Indstillinger (`/settings`)
- Rediger gårdsoplysninger: navn, adresse, GPS, AI-profiltekst
- Log ud

### Om (`/about`)
- Regenerativt manifest og principper bag Tend

---

## Tech stack
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Vejr:** Open-Meteo API (gratis, ingen nøgle)
- **AI:** Claude API (Anthropic), model `claude-opus-4-5`
- **Hosting:** Vercel
- **Sprog i UI:** Dansk
- **GitHub:** github.com/zcph2000/tend (gh CLI autentificeret)

---

## Supabase projekt
- URL: https://gzybigaqfllzxwjuyyua.supabase.co
- Projekt-ID: gzybigaqfllzxwjuyyua
- Direkte adgang fra Claude: `npx supabase db query --linked "<sql>"` eller `-f fil.sql`
  virker når `SUPABASE_ACCESS_TOKEN` er sat (personligt access-token fra
  supabase.com/dashboard/account/tokens — bed brugeren om et nyt hvis du
  ikke har et). Kør nye `supabase/*.sql`-filer direkte i stedet for at
  bede brugeren copy-paste dem i SQL Editor.

### Database-tabeller
| Tabel | Formål |
|-------|--------|
| `farms` | Én gård pr. bruger — navn, lokation, GPS, AI-profiltekst |
| `fields` | Marker/pastures med geokoordinater og jordtype |
| `sections` | Sektioner inden for marker (GeoJSON polygoner) |
| `grazing_records` | Aktive afgræsningsregistreringer pr. sektion/flok |
| `animals` | Individuelle dyr ELLER flokdyr — se `is_batch`/`head_count_female`/`head_count_male` nedenfor |
| `animal_events` | Hændelseshistorik pr. dyr (kalvning, sygdom, vejning osv.) |
| `flocks` | Rotationsflokke — navn, farm_id, `species` (bruges af `getGrazingRecommendation`/`getOptimalSectionSize` til korrekt LSU-beregning) |
| `flock_memberships` | Many-to-many: dyr ↔ flok |
| `animal_groups` | Grupper (bruges til adskilt håndtering) |
| `group_memberships` | Many-to-many: dyr ↔ gruppe |
| `observations` | Biodiversitetsobservationer |
| `soil_observations` | Jordmålinger på marker (pH, OM%, orme, vandretention) |
| `bed_sections` | Bede-sektioner med navn og orientering |
| `beds` | Individuelle bede med mål og placeringstype |
| `bed_plantings` | Plantninger i bede med datoer, afstande, status, sæson |
| `crop_species` | Afgrødearter med dansk navn og familie |
| `crop_families` | Afgrødefamilier (Natskyggefamilien, Græskarfamilien osv.) |
| `crop_varieties` | Sorter med dage til høst, uger til udplantning, planteafstande, `yield_kg_per_sqm_min/max` (bruges nu af `estimateYieldKgPerPlant()` i `lib/cropPlanning.ts`, foretrukket frem for familie-fallback) |
| `farm_tasks` | Kalenderopgaver — kategori, timing, status, source_type, `bed_planting_id` (on delete cascade, så opgaver ryddes automatisk op når en plantning slettes) |
| `harvest_logs` | Høstregistreringer knyttet til bed_plantings |
| `animal_product_logs` | Dyreprodukter: mælk, æg, uld osv. |
| `farm_expenses` | Udgifter med kategori og beløb |
| `chat_messages` | AI-rådgiver-chathistorik pr. farm |

### farm_tasks schema (vigtigt — bruges mange steder)
```sql
farm_id uuid, title text, due_date date, due_date_end date,
category text,      -- jordbrug | dyr | admin | økonomi | andet
timing_type text,   -- exact | week | month (kun "exact" bruges reelt i UI — se nedenfor)
status text,        -- pending | done | skipped
source_type text,   -- manual | planting | rotation | animal_event
bed_planting_id uuid -- valgfri FK til bed_plantings, on delete cascade
```
`due_date_end` (valgfri) gør en opgave til en **periode-opgave** — aktiv fra `due_date` til og med
`due_date_end`, vist som en bjælke i kalenderens månedsvisning i stedet for en enkelt prik. Sættes
via "Strækker sig over flere dage"/"Strækker sig over dage" i hhv. `AddTaskForm.tsx` (kalender) og
`AreaTaskForm.tsx` (bede/sektioner) — se `lib/calendarEvents.ts`. Adskilt fra `task_series`
(gentagende opgaver, se nedenfor) — en periode-opgave er ÉN opgave der er aktiv hen over et vindue,
ikke flere selvstændige forekomster.
Alle tre planlægnings-flows (ForspiringsTool, PlantingPlannerForm, SeasonPlanTool)
sætter `bed_planting_id` når de opretter opgaver — ellers bliver opgaverne
"spøgelsesopgaver" der ikke ryddes op når plantningen slettes igen.

### animals — individ vs. flokdyr
```sql
ear_tag text,             -- nullable — kun individdyr
sex text,                 -- nullable — kun individdyr
is_batch boolean,         -- true for flokdyr (fx høns)
head_count_female integer,-- kun flokdyr
head_count_male integer,  -- kun flokdyr
purpose text               -- individdyr: moderdyr/avlsvædder/opfedning/naturpleje/salgsdyr
                            -- flokdyr: æg/kød
```
Brug `lib/animalTerms.ts` (`SPECIES_LABELS`, `SEX_LABELS`, `YOUNG_LABEL`,
`eventTypeLabel()`, `isBatchSpecies()`) til alt art-afhængigt UI-tekst —
ikke hardcodede fåre-ord. `IS_BATCH_SPECIES` afgør individ- vs. flok-flow.

### bed_plantings status-værdier
- `planlagt` — fremtidig plantning (oprettet af ForspiringsTool/PlantingPlannerForm)
- `spiret` — sået og spiret
- `plantet` — udplantet
- `høstklar` — klar til høst
- `høstet` — afsluttet

---

## Projektstruktur
```
tend/
├── app/
│   ├── (app)/
│   │   ├── layout.tsx               ← TopBar + BottomNav wrapper
│   │   ├── dashboard/page.tsx
│   │   ├── animals/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   ├── ungrouped/page.tsx
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── edit/page.tsx
│   │   │   │   ├── AddEventButton.tsx
│   │   │   │   ├── AssignFlockButton.tsx
│   │   │   │   └── AssignGroupButton.tsx
│   │   │   ├── flocks/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── CreateFlockForm.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── ManageFlockAnimals.tsx
│   │   │   └── groups/
│   │   │       ├── page.tsx
│   │   │       ├── CreateGroupForm.tsx
│   │   │       └── [id]/
│   │   │           ├── page.tsx
│   │   │           └── ManageGroupAnimals.tsx
│   │   ├── rotation/
│   │   │   ├── page.tsx
│   │   │   └── MoveFlockButton.tsx
│   │   ├── farming/
│   │   │   ├── page.tsx
│   │   │   ├── pastures/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── AddFieldForm.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── AddSectionForm.tsx
│   │   │   │       ├── AddSoilObservationForm.tsx
│   │   │   │       ├── EditSoilTypeForm.tsx
│   │   │   │       └── FenceGuide.tsx
│   │   │   ├── beds/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   ├── map/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── BedSectionMap.tsx
│   │   │   │   ├── section/[id]/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── edit/page.tsx
│   │   │   │       ├── AddPlantingForm.tsx
│   │   │   │       ├── BedLayoutSVG.tsx
│   │   │   │       ├── EditPlantingForm.tsx
│   │   │   │       ├── KompostForm.tsx
│   │   │   │       ├── PlantingCard.tsx
│   │   │   │       └── PlantingPlannerForm.tsx
│   │   │   ├── crops/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── AfgrodeList.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── polytunnel/              ← page.tsx + new/page.tsx redirecter nu ind i beds-flowet
│   │   │   │   ├── page.tsx
│   │   │   │   └── new/page.tsx
│   │   │   ├── compost/page.tsx
│   │   │   ├── seeds/page.tsx
│   │   │   └── orchard/page.tsx
│   │   ├── operations/
│   │   │   ├── page.tsx
│   │   │   ├── CheckTaskButton.tsx
│   │   │   ├── calendar/
│   │   │   │   ├── page.tsx              ← Månedsvisning (default)
│   │   │   │   ├── AddTaskForm.tsx
│   │   │   │   ├── PrintButton.tsx
│   │   │   │   └── [date]/page.tsx       ← Dagsvisning
│   │   │   └── economy/
│   │   │       ├── page.tsx
│   │   │       ├── AnimalProductForm.tsx
│   │   │       ├── ExpenseForm.tsx
│   │   │       └── PlantingHarvestRow.tsx
│   │   ├── biodiversity/
│   │   │   ├── page.tsx
│   │   │   └── AddObservationForm.tsx
│   │   ├── tools/
│   │   │   ├── page.tsx
│   │   │   ├── advisor/
│   │   │   │   ├── page.tsx
│   │   │   │   └── ChatInterface.tsx
│   │   │   ├── propagation/
│   │   │   │   ├── page.tsx             ← server component: henter varieties + beds
│   │   │   │   └── ForspiringsTool.tsx  ← 2-fase klient-tool
│   │   │   ├── season-plan/
│   │   │   │   ├── page.tsx             ← server component: henter varieties + beds
│   │   │   │   └── SeasonPlanTool.tsx   ← behovsliste → grådig prioritetsallokering → bekræft
│   │   │   └── rotation-planner/
│   │   │       ├── page.tsx
│   │   │       ├── RotationPlanner.tsx
│   │   │       └── info/page.tsx
│   │   ├── settings/
│   │   │   ├── page.tsx
│   │   │   ├── FarmSettingsForm.tsx
│   │   │   └── LogoutButton.tsx
│   │   └── about/page.tsx
│   ├── api/chat/route.ts               ← Claude API proxy med farmContext
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── callback/route.ts
│   ├── layout.tsx                      ← root layout
│   └── page.tsx                        ← redirect til /dashboard
│
├── components/
│   ├── MapFieldEditor.tsx              ← Leaflet-kort til marker
│   ├── MapSectionEditor.tsx            ← Leaflet-kort til sektioner
│   └── ui/
│       ├── BottomNav.tsx               ← 6 faner: Oversigt, Dyr, Drift, Jordbrug, Natur, Planlæg
│       ├── EventIcon.tsx               ← Ikon pr. dyrhændelsestype
│       └── TopBar.tsx                  ← Øverste bar med gårdsnavn
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   ← createClient() til client components
│   │   └── server.ts                   ← createClient() til server components
│   ├── calendarEvents.ts               ← getCalendarEvents() — delt kalenderlogik (rotation/høst/opgaver) til måneds- og dagsvisning
│   ├── bedGeometry.ts                  ← Geometriberegninger til bedkort
│   ├── bedPlantingLayout.ts            ← calcLayout(), zoneColor(), FAMILY_COLORS, PlantingZone type
│   ├── companionPlants.ts              ← YIELD_KG_PER_PLANT, HARVEST_DAYS_FROM_TRANSPLANT, companion-regler
│   ├── cropPlanning.ts                 ← Delt planlægningslogik: estimateYieldKgPerPlant(), requiredZoneLengthM(), computeDatesFromWindow(), sortBedsForFamily(), isWarmBed()
│   ├── seasonPlanAllocator.ts          ← allocateSeasonPlan() — grådig prioritetsallokering til Sæsonplan
│   ├── animalTerms.ts                  ← Art-afhængige tekster: SPECIES_LABELS, SEX_LABELS, YOUNG_LABEL, eventTypeLabel(), isBatchSpecies()
│   ├── farmContext.ts                  ← Bygger gårdskontekst til AI-rådgiver
│   ├── geodata.ts                      ← GeoJSON-hjælpere
│   ├── groups.ts                       ← Gruppe-hjælpefunktioner, SPECIES_LSU (dyrevægte til rotationsberegning)
│   ├── utils.ts                        ← getGrazingRecommendation(), getOptimalSectionSize(), daysSince() — tag altid species-param med, default er "sheep"
│   └── weather.ts                      ← Open-Meteo API-kald
│
├── supabase/
│   ├── jordbrug.sql                    ← beds, bed_sections, bed_plantings, crop-tabeller
│   ├── bede_migration.sql              ← Tilføjelser til bede-tabeller
│   ├── bede_map_migration.sql          ← Bedekorttabeller, location_type på beds/bed_sections
│   ├── crop_database_schema.sql        ← crop_species, crop_families, crop_varieties
│   ├── crop_database_seed.sql          ← Frødata til crop_varieties (grundlaget, ~54 sorter)
│   ├── crop_database_seed_2.sql        ← Familienavne-rettelse + broccoli/blomkål/hvidkål/pastinak/fennikel m.fl.
│   ├── crop_database_seed_3.sql        ← Afgrøder fra brugerens egen liste (jordskok, chili, rosenkål, forårsløg m.fl.)
│   ├── crop_database_seed_4.sql        ← Glaskål, spiseblomster, dansk landsort-ært ("Ingrid")
│   ├── spacing_migration.sql           ← row_spacing_cm, plant_spacing_cm til bed_plantings
│   ├── tasks_economy_migration.sql     ← farm_tasks, farm_expenses, harvest_logs
│   ├── farm_tasks_bed_planting_link.sql← bed_planting_id på farm_tasks (on delete cascade)
│   ├── harvest_animal_migration.sql    ← animal_product_logs
│   ├── flock_economics_migration.sql   ← Økonomi knyttet til flokke
│   ├── multi_species_animals.sql       ← is_batch/head_count_* på animals, species på flocks
│   ├── biodiversity_observations.sql   ← observations-tabel
│   ├── soil_observations.sql           ← soil_observations-tabel
│   ├── chat_messages.sql               ← chat_messages-tabel
│   └── demo_seed.sql                   ← Demo-data til demo@tend.dk (Mosegård Demo)
│
└── types/index.ts                      ← Alle TypeScript-typer (Farm, Animal, Bed osv.)
```

---

## Bottom Navigation (6 faner)
| Fane | Route | Ikon |
|------|-------|------|
| Oversigt | `/dashboard` | Home |
| Dyr | `/animals` | PawPrint |
| Drift | `/operations` | ClipboardList |
| Jordbrug | `/farming` | Shovel |
| Natur | `/biodiversity` | Leaf |
| Planlæg | `/tools` | Lightbulb |

---

## Design-principper
- Mobil-first, store touch-targets
- Mørkt organisk tema: `--bg: #1a1e14` (dyb skovgrøn), `--surface-raised: #3a3022` (varm brun)
- Farvelogik: orange (clay) = primær action, grøn (grass) = positive states, earth = alt andet
- Hover: `hover:brightness-110 transition-all` på kort, `hover:bg-white/5` på transparente rækker
- CSS-klasser: `.card`, `.btn-primary`, `.btn-secondary`, `.input`, `.label`, `.badge`
- Ét orange knap pr. side, altid nederst
- Dansk sprog i hele UI

---

## Vigtige konventioner
- Server components som default — `"use client"` kun når der er interaktivitet
- Supabase RLS aktiveret på alle tabeller
- Alle nye tabeller skal have RLS-politik der begrænser adgang til brugerens egne data
- `router.refresh()` efter Supabase-writes i client components (ikke redirect medmindre nødvendigt)
- `calcLayout()` fra `lib/bedPlantingLayout.ts`: `rowSpacingCm` = på tværs af bedet (bredde), `plantSpacingCm` = langs bedet (længde)
- `PREFERS_WARMTH`/`isWarmBed()`/`WARM_LOCATION_TYPES` bor i `lib/cropPlanning.ts` — brug dem, byg dem ikke lokalt igen (der har allerede været en bug hvor et sted tjekkede `"drivhus"` i stedet for den rigtige DB-værdi `"drivhus_opvarmet"`)
- Alt art-afhængigt dyretekst (hændelsestyper, kønsbetegnelser) kommer fra `lib/animalTerms.ts` — ikke lokale label-maps (der har været 5 duplikerede kopier af samme labels før oprydning)
- `getGrazingRecommendation()`/`getOptimalSectionSize()` skal altid have `flock.species` med (default er `"sheep"` hvis udeladt — det er nemt at glemme og give forkert rotationsanbefaling for ikke-får)
- Vejr hentes server-side og caches 1 time via `next: { revalidate: 3600 }`
- Kalenderopgaver har altid `farm_id`, `title`, `due_date`, `category`, `timing_type`, `status`, `source_type`, og bør have `bed_planting_id` når de stammer fra en plantning (ellers bliver de spøgelsesopgaver ved sletning)
- bed_plantings med `status='planlagt'` er fremtidsplanlagte (ikke udført endnu)
- Kør nye `supabase/*.sql`-migreringer direkte via `npx supabase db query --linked -f fil.sql` (se Supabase-sektionen) — ikke kun som en fil brugeren selv skal køre
- **Datoer, aldrig `.toISOString().slice(0,10)`**: brug `toISODate()` fra `lib/calendarEvents.ts` (bygger "YYYY-MM-DD" af Date-objektets LOKALE år/måned/dag) til at formatere en Date som kalenderdato-streng. `.toISOString()` konverterer til UTC først og rykker datoen en dag tilbage for brugere i tidszoner foran UTC (fx Danmark) — gav konkret en "i dag er faktisk i går"-bug i kalenderens quick-add, indtil den blev rettet.

---

## Demo-login
- Email: `demo@tend.dk`
- Password: `tend2026`
- Kræver: opret bruger i Supabase Auth → kør `supabase/demo_seed.sql` i SQL Editor
- Demo-gård: Mosegård Demo (Odsherred) med 8 lam, 12 høns, 6 bede, 10 plantninger, 8 opgaver

---

## AI-rådgiverens rolle
Rådgiveren taler som en erfaren regenerativ landmand og rådgiver — ikke som en database-forespørgsel. Den kender via `farmContext.ts`:
- Gårdens dyr, flokke, hændelseshistorik
- Marker, sektioner, jordmålinger
- Bede, aktive og planlagte plantninger
- Vejrdata for gårdens GPS-position
- Gårdens AI-profiltekst fra settings

Den skal give råd som:
- "Er vi på rette kurs overordnet?"
- "Marken har haft for kort hvile — overvej at lade den ligge til næste forår"
- "Tagetes imellem tomaterne tiltrækker bier og holder bladlus væk"
- "Din OM% er steget 0.4 point — det svarer til ~4 tons CO2/ha bundet det sidste år"
