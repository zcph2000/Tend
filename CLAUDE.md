# Tend — Projektbriefing til Claude

## Hvad er Tend?
Tend er en regenerativ gårdsstyringsapp bygget som Progressive Web App (Next.js + Supabase).
Den er bygget til Zaki Youssef, Røsnæsgård, Røsnæs, Danmark.
Primært til fårehold efter holistic management / adaptive multi-paddock grazing principper.
Bygget til at lære og blive klogere over tid ved at kombinere brugerdata med vejrdata.

## Fuld kravspecifikation
Se `KRAVSPECIFIKATION.md` for komplet oversigt over vision, features og backlog.

## Tech stack
- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth)
- **Vejr:** Open-Meteo API (gratis, ingen nøgle)
- **Hosting:** Vercel
- **Sprog i UI:** Dansk

## Supabase projekt
- URL: https://gzybigaqfllzxwjuyyua.supabase.co
- Tabeller: farms, fields, sections, animals, animal_events, grazing_records, observations

## Projektstruktur
```
tend/
├── app/
│   ├── (app)/          ← beskyttede sider (kræver login)
│   │   ├── dashboard/
│   │   ├── animals/
│   │   ├── rotation/
│   │   ├── pastures/
│   │   └── settings/
│   └── auth/login/     ← login-side
├── components/ui/      ← BottomNav, TopBar
├── lib/
│   ├── supabase/       ← client.ts + server.ts
│   ├── weather.ts      ← Open-Meteo integration
│   └── utils.ts        ← hjælpefunktioner + rotationslogik
└── types/index.ts      ← TypeScript typer
```

## Design-principper
- Mobil-first, store touch-targets
- Farver: grass-* (grøn), earth-* (brun), sky-* (blå) — defineret i tailwind.config.ts
- CSS-klasser: .card, .btn-primary, .btn-secondary, .input, .label, .badge
- Dansk sprog i hele UI

## Vigtige konventioner
- Server components som default, "use client" kun når nødvendigt
- Supabase RLS (Row Level Security) er aktiveret på alle tabeller
- Rotationsanbefalinger beregnes i `lib/utils.ts` → `getRecommendedGrazingDays()`
- Vejr hentes server-side og caches 1 time

## Hvad er bygget (v1)
- Login/opret konto
- Gårdsopsætning med GPS
- Dashboard med vejr + rotationsstatus
- Fuld dyrstyring med hændelseshistorik
- Markforvaltning med sektioner
- Rotationsmodul med flytning og genopretningsstatus

## Næste prioriteter (se KRAVSPECIFIKATION.md afsnit 5)
1. Push-notifikationer
2. Kortintegration (Mapbox)
3. Automatisk daglig vejrlog til database
4. AI-anbefalinger (Claude API)
