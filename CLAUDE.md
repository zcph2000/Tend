# Tend — Projektbriefing til Claude

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

## Hvad vi bygger — nu og på sigt

### Bygget (v1)
- Login og gårdsopsætning med GPS
- Dashboard med vejr og rotationsstatus
- Fuld dyrstyring med hændelseshistorik og stamtavle
- Markforvaltning med sektioner og hegnsplan
- Rotationsmodul med AMP-anbefalinger og planlægger
- AI-rådgiver (Claude) med gårdskontekst
- Jordsundhedsmålinger på marker (pH, OM%, orme, vandretention)

### Næste lag
- **Carbon sequestration tracking** — estimeret CO2-binding baseret på OM%-ændringer over tid
- **Biodiversitetslog** — observationer af insekter, fugle og plantearter
- **Sædeskifteplan** — flerårig rotationsplan for afgrøder
- **Bedplaner** — plantning, rækkeafstande, kompanionplanter
- **Push-notifikationer** — flytningsalarmer, opgavepåmindelser
- **Automatisk vejrlog** — daglig vejrdata til database

## AI-rådgiverens rolle

Rådgiveren skal tænkes bredt og regenerativt — ikke kun svare på spørgsmål om rotation. Den kender:
- Gårdens dyr, flokke, hændelseshistorik
- Marker, sektioner, jordmålinger, vejrdata
- Aktive grazings og hvileperioder
- Sæson og geografisk placering

Den skal kunne give råd som:
- "Er vi på rette kurs overordnet?"
- "Marken har haft for kort hvile — overvej at lade den ligge til næste forår"
- "Ormetal er lavt på Mark 2 — det kan skyldes for kompakt jord eller for intensiv afgræsning"
- "Tagetes imellem tomaterne tiltrækker bier og holder bladlus væk"
- "Din OM% er steget 0.4 point — det svarer til ~4 tons CO2/ha bundet det sidste år"

Rådgiveren skal tale *som en erfaren regenerativ landmand og rådgiver*, ikke som en database-forespørgsel.

## Tech stack
- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Vejr:** Open-Meteo API (gratis, ingen nøgle)
- **AI:** Claude API (Anthropic)
- **Hosting:** Vercel
- **Sprog i UI:** Dansk

## Supabase projekt
- URL: https://gzybigaqfllzxwjuyyua.supabase.co
- Tabeller: farms, fields, sections, animals, animal_events, grazing_records, observations, soil_observations

## Projektstruktur
```
tend/
├── app/
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── animals/         ← dyr, flokke, grupper
│   │   ├── rotation/        ← rotation + planlægger
│   │   ├── pastures/        ← marker + jordsundhed
│   │   ├── tools/           ← planlægningsværktøjer + om-side
│   │   ├── raadgiver/       ← AI-rådgiver
│   │   └── settings/
│   ├── om/                  ← regenerativt manifest og principper
│   └── auth/login/
├── components/ui/
├── lib/
│   ├── supabase/
│   ├── weather.ts
│   └── utils.ts
└── types/index.ts
```

## Design-principper
- Mobil-first, store touch-targets
- Mørkt organisk tema: `--bg: #1a1e14` (dyb skovgrøn), `--surface-raised: #3a3022` (varm brun)
- Farvelogik: orange (clay) = primær action, grøn (grass) = positive states, earth = alt andet
- Hover: `hover:brightness-110 transition-all` på kort, `hover:bg-white/5` på transparente rækker
- CSS-klasser: `.card`, `.btn-primary`, `.btn-secondary`, `.input`, `.label`, `.badge`
- Ét orange knap pr. side, altid nederst
- Dansk sprog i hele UI

## Vigtige konventioner
- Server components som default, "use client" kun når nødvendigt
- Supabase RLS aktiveret på alle tabeller
- Rotationsanbefalinger i `lib/utils.ts` → `getGrazingRecommendation()`
- Vejr hentes server-side og caches 1 time
- Alle nye tabeller skal have RLS-politik der begrænser adgang til brugerens egne data
