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
- Dyrliste med art, race, øremærke, status
- Dyroprettelse med alle felter: art, race, køn, fødselsdato, vægt, øremærke, navn
- Dyrdetalje med hændelseshistorik (kalvning, sygdom, behandling, flytning, vejning, slut, andet)
- Floktilknytning og gruppetilknytning
- Flokke: opret, vis, administrer dyr i flok
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

**Bede (`/farming/beds`)**
- Bedeoversigtsliste med status og section-gruppering
- Bede-kort (SVG-overblik over alle sektioner og bede med farvekodning) (`/farming/beds/map`)
- Opret nyt bed med sektion, mål, placeringstype (friland/polytunnel/drivhus)
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

**Polytunnel (`/farming/polytunnel`)**
- Liste over polytunnels
- Polytunnel-detaljeside med plantninger
- Tilføj polytunnel-plantning
- Opret ny polytunnel

**Kompost (`/farming/compost`)**
- Oversigt over kompostbunker og tilsætninger

**Frø (`/farming/seeds`)**
- Frøoversigt (frøbeholdning)

**Frugtplantage (`/farming/orchard`)**
- Frugtplantage-oversigt

### Operations (`/operations`)
Oversigt med links til undermoduler:

**Kalender (`/operations/calendar`)**
- Opgaveliste opdelt i overdue, i dag, kommende
- Opgaver med kategori (jordbrug/dyr/admin/økonomi/andet), timing (exact/week/month), status (pending/done/skipped)
- Opret manuel opgave (AddTaskForm)
- Marker opgave som udført/sprunget over (CheckTaskButton)
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

### Database-tabeller
| Tabel | Formål |
|-------|--------|
| `farms` | Én gård pr. bruger — navn, lokation, GPS, AI-profiltekst |
| `fields` | Marker/pastures med geokoordinater og jordtype |
| `sections` | Sektioner inden for marker (GeoJSON polygoner) |
| `grazing_records` | Aktive afgræsningsregistreringer pr. sektion/flok |
| `animals` | Individuelle dyr med art, race, køn, fødselsdato, øremærke |
| `animal_events` | Hændelseshistorik pr. dyr (kalvning, sygdom, vejning osv.) |
| `flocks` | Flokke med navn og farm_id |
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
| `crop_varieties` | Sorter med dage til høst, uger til udplantning, planteafstande |
| `farm_tasks` | Kalenderopgaver med kategori, timing, status, source_type |
| `harvest_logs` | Høstregistreringer knyttet til bed_plantings |
| `animal_product_logs` | Dyreprodukter: mælk, æg, uld osv. |
| `farm_expenses` | Udgifter med kategori og beløb |
| `chat_messages` | AI-rådgiver-chathistorik pr. farm |

### farm_tasks schema (vigtigt — bruges mange steder)
```sql
farm_id uuid, title text, due_date date,
category text,      -- jordbrug | dyr | admin | økonomi | andet
timing_type text,   -- exact | week | month
status text,        -- pending | done | skipped
source_type text    -- manual | planting | rotation | animal_event
```

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
│   │   │   ├── polytunnel/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── AddPolytunnelPlantingForm.tsx
│   │   │   ├── compost/page.tsx
│   │   │   ├── seeds/page.tsx
│   │   │   └── orchard/page.tsx
│   │   ├── operations/
│   │   │   ├── page.tsx
│   │   │   ├── CheckTaskButton.tsx
│   │   │   ├── calendar/
│   │   │   │   ├── page.tsx
│   │   │   │   └── AddTaskForm.tsx
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
│   ├── bedGeometry.ts                  ← Geometriberegninger til bedkort
│   ├── bedPlantingLayout.ts            ← calcLayout(), zoneColor(), FAMILY_COLORS, PlantingZone type
│   ├── companionPlants.ts              ← YIELD_KG_PER_PLANT, HARVEST_DAYS_FROM_TRANSPLANT, companion-regler
│   ├── farmContext.ts                  ← Bygger gårdskontekst til AI-rådgiver
│   ├── geodata.ts                      ← GeoJSON-hjælpere
│   ├── groups.ts                       ← Gruppe-hjælpefunktioner
│   ├── utils.ts                        ← getGrazingRecommendation(), daysSince()
│   └── weather.ts                      ← Open-Meteo API-kald
│
├── supabase/
│   ├── jordbrug.sql                    ← beds, bed_sections, bed_plantings, crop-tabeller
│   ├── bede_migration.sql              ← Tilføjelser til bede-tabeller
│   ├── bede_map_migration.sql          ← Bedekorttabeller
│   ├── crop_database_schema.sql        ← crop_species, crop_families, crop_varieties
│   ├── crop_database_seed.sql          ← Frødata til crop_varieties
│   ├── spacing_migration.sql           ← row_spacing_cm, plant_spacing_cm til bed_plantings
│   ├── tasks_economy_migration.sql     ← farm_tasks, farm_expenses, harvest_logs
│   ├── harvest_animal_migration.sql    ← animal_product_logs
│   ├── flock_economics_migration.sql   ← Økonomi knyttet til flokke
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
- `PREFERS_WARMTH = new Set(["Natskyggefamilien", "Græskarfamilien"])` — bruges til at sortere polytunnel/drivhus-bede frem
- Vejr hentes server-side og caches 1 time via `next: { revalidate: 3600 }`
- Kalenderopgaver har altid `farm_id`, `title`, `due_date`, `category`, `timing_type`, `status`, `source_type`
- bed_plantings med `status='planlagt'` er fremtidsplanlagte (ikke udført endnu)

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
