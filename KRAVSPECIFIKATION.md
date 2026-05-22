# Tend — Kravspecifikation
**Version:** 0.1 — Maj 2025  
**Ejer:** Zaki Youssef  
**Status:** Under aktiv udvikling

---

## 1. Vision

Tend er et regenerativt gårdsstyringsværktøj bygget på principper fra **holistic management** og **adaptive multi-paddock grazing (AMP)**. Appen skal hjælpe brugeren med at lære, hvad der virker bedst på deres specifikke jord — ved at kombinere egne observationer med automatisk vejrdata, GPS og dyredata, og over tid give bedre og bedre anbefalinger.

Tend starter som et personligt værktøj til fårehold på Røsnæsgård, men bygges modulært så det på sigt kan bruges til kvæg, høns, geder, svin og andre dyr — og udvides med market garden, sædeskifte og bedplan.

---

## 2. Bruger og kontekst

- **Primær bruger:** Zaki Youssef, Røsnæsgård, Røsnæs, Danmark
- **Platform:** iOS (primær), Mac (sekundær) — Progressive Web App (PWA)
- **Sprog:** Dansk i første version
- **Teknisk niveau:** Ikke-teknisk bruger — appen skal være intuitiv uden dokumentation

### Gårdens udgangspunkt
- 6 hektar i alt
- 2 folde à ca. 3 hektar, aflange rektangler side om side
- Begge folde er indhegnede hele vejen rundt
- Plan: opdele hver fold i sektioner med mobilt inderhegn
- Fårerace: ikke fastlagt endnu
- Vædder til øerne ca. december → lammning april/maj
- Gennemsnitligt 1,5 lam per ø

---

## 3. Teknisk arkitektur

| Komponent | Valg | Begrundelse |
|---|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript | PWA, hurtig, skalérbar |
| Styling | Tailwind CSS | Mobil-first, ensartet |
| Backend/DB | Supabase (PostgreSQL) | Gratis, realtid, auth inkluderet |
| Autentifikation | Supabase Auth | Email/password |
| Vejr | Open-Meteo API | Gratis, ingen API-nøgle, dansk dækning |
| Kort/GPS | Mapbox (fremtidig fase) | Gratis op til 50.000 visninger/md |
| AI-anbefalinger | Claude API (fremtidig fase) | Analyserer akkumuleret data |
| Hosting | Vercel | Gratis, automatisk deploy |

### Database-tabeller (v1)
- `farms` — gårdens stamdata og GPS-koordinater
- `fields` — marker med areal
- `sections` — paddocks inden i marker
- `animals` — individuelle dyr med øremærke
- `animal_events` — hændelser per dyr (vaccination, ormekur, lammede osv.)
- `grazing_records` — rotationshistorik (hvem græssede hvornår hvor)
- `observations` — markobservationer (græshøjde, tilstand)

---

## 4. Funktioner — Version 1 (MVP) ✅

### 4.1 Autentifikation
- [x] Opret konto med email/password
- [x] Log ind / log ud
- [x] Beskyttede ruter — ikke-loggede brugere sendes til login

### 4.2 Gårdsopsætning
- [x] Opret gård med navn og adresse
- [x] Angiv GPS-koordinater manuelt eller via "brug min position"
- [x] Koordinater bruges til præcis lokal vejrudsigt

### 4.3 Dashboard
- [x] Dagens vejr med temperatur, nedbør og vind
- [x] 7-dages vejrudsigt med ikoner
- [x] Antal aktive dyr
- [x] Hvilken sektion flokken er i nu + antal dage
- [x] Alarm når det er tid til at flytte flokken
- [x] Seneste hændelser (vaccination, lammede osv.)

### 4.4 Dyrstyring
- [x] Tilføj dyr med: øremærkenummer, kaldenavn, art, race, køn, fødselsdato, noter
- [x] Liste over alle aktive dyr sorteret på øremærke
- [x] Oversigt: antal øer, væddere, lam
- [x] Dyrkort med fuld historik
- [x] Registrer hændelser per dyr:
  - [x] Vaccination (med præparatnavn)
  - [x] Ormekur (med præparatnavn)
  - [x] Sat til vædder
  - [x] Lammede (med antal lam)
  - [x] Vejet (med kg)
  - [x] Behandling
  - [x] Observation
  - [x] Note

### 4.5 Markforvaltning
- [x] Tilføj marker med navn og areal
- [x] Opdel mark automatisk i X sektioner ved oprettelse
- [x] Tilføj sektioner manuelt efterfølgende
- [x] Oversigt over alle marker og sektioner

### 4.6 Rotation
- [x] Se hvilken sektion flokken er i nu
- [x] Flyt flokken til ny sektion med ét tryk
- [x] Registrer græshøjde ved flytning
- [x] Rotationsanbefaling baseret på årstid og areal
- [x] Genopretningsstatus for alle sektioner (progress-bar)
- [x] Rotationshistorik med datoer og varighed
- [x] Alarm (gul/rød) når flokken bør flyttes

---

## 5. Funktioner — Version 2 (næste fase)

### 5.1 Intelligent rotation
- [ ] Anbefalinger baseret på akkumuleret data fra tidligere rotationer
- [ ] Vejrdata integreret i rotation — fx "nedbør de sidste 3 dage = kortere hvileperiode"
- [ ] Sæsonkorrigerede anbefalinger (vækstrate varierer)
- [ ] Sammenlign rotationer over tid: "Sektion 3 restituerer hurtigere om foråret"

### 5.2 Kortintegration (Mapbox)
- [ ] Tegn marker og sektioner direkte på kort
- [ ] Se præcise arealer fra korttegning
- [ ] Visuel oversigt over alle sektioner med farvekodning (hviler/afgræsses/klar)
- [ ] GPS-tracking af fårenes position

### 5.3 Notifikationer (push)
- [ ] "Tid til at flytte flokken" — baseret på rotation og vejr
- [ ] Påmindelser: "Ormekur om 7 dage", "Vaccination forfaldent"
- [ ] Lammningsalarm i april/maj baseret på satdato

### 5.4 Avanceret dyrstyring
- [ ] Slægtskabsregistrering (mor/far — spor genetik)
- [ ] Flokgrupper (fx øer, lam, vædder separat)
- [ ] Eksport af sundhedsjournal (PDF)
- [ ] Masseregistrering af hændelser for hele flokken

### 5.5 Vejr og observationsanalyse
- [ ] Automatisk log af daglig vejrdata for gårdens koordinater
- [ ] Korrelation: nedbør vs. græsvækst vs. rotationsvarighed
- [ ] Graf over nedbør, temperatur og græstryk over tid

### 5.6 AI-anbefalinger (Claude API)
- [ ] Analysér akkumuleret data og giv natursproglige anbefalinger
- [ ] "Baseret på de sidste 4 rotationer og ugernes nedbør bør du flytte om 2 dage"
- [ ] Årstidsbaserede råd: "Det er nu tid til at sætte vædder til"
- [ ] Lær hvad der virker på netop din jord over tid

---

## 6. Funktioner — Version 3 (fremtidig udvidelse)

### 6.1 Market garden-modul
- [ ] Bedstyring med bednumre og dimensioner
- [ ] Sædskifte og afgrøderotation
- [ ] Såplan og høstkalender
- [ ] Kobling til vejr: "Forventet froststop om X dage"

### 6.2 Multi-dyr support
- [ ] Kvæg (særlige regler for AMP, anden stokningsrate)
- [ ] Høns (mobilt hønsehus, rotation i marker)
- [ ] Geder (tilpasses geternes adfærd)
- [ ] Tilpassede hændelsestyper per dyreart

### 6.3 Fler-bruger / deling
- [ ] Inviter medarbejder eller partner til gård
- [ ] Roller: ejer, redaktør, læser
- [ ] Aktivitetslog: hvem gjorde hvad hvornår

### 6.4 Driftsokonomi (simpel)
- [ ] Registrer indkøb af dyr, foder, remedier
- [ ] Registrer salg af dyr og produkter
- [ ] Simpel oversigt: udgifter vs. indtægter per år

---

## 7. Design og UX-principper

- **Mobil-first** — appen bruges ude på marken med handskerne på
- **Store touch-targets** — knapper og felter let at trykke på
- **Offline-first tankegang** — kritiske funktioner bør virke uden internet (fremtid)
- **Farvepalette:** naturlige jordtoner (grøn, brun, himmelblå)
- **Sprog:** dansk, enkelt og direkte — ingen fagterminologi uden forklaring
- **Feedback:** altid tydelig respons på brugerhandlinger

---

## 8. Rotationsberegning — logik

Anbefalet hvileperiode per årstid (Danmark):

| Periode | Hvileperiode |
|---|---|
| Maj–August (sommer) | 30 dage |
| Marts–April (forår) | 45 dage |
| September–Oktober (efterår) | 50 dage |
| November–Februar (vinter) | 70 dage |

**Antal sektioner** = hvileperiode / antal græsdage per sektion  
**Anbefalet antal græsdage** = max 3-4 dage per sektion (regenerativt princip)

**For 6 ha med ca. 40 øer + lam:**
- Ca. 8 sektioner per fold = 16 sektioner i alt
- Ca. 0,37 ha per sektion
- Rotation: flyt hver 3. dag om sommeren

---

## 9. Data der trackes automatisk

| Data | Kilde | Frekvens |
|---|---|---|
| Temperatur (min/max/mean) | Open-Meteo | Dagligt |
| Nedbør (mm) | Open-Meteo | Dagligt |
| Vindhastighed | Open-Meteo | Dagligt |
| Vejrkode (sol/regn/tåge) | Open-Meteo | Dagligt |

---

## 10. Prioriteret backlog

1. **Push-notifikationer** — "Flyt flokken" og sundhedspåmindelser
2. **Kortintegration** — tegn marker visuelt
3. **Automatisk vejrlog** — gem daglige vejrdata i databasen
4. **Slægtskab** — mor/far registrering
5. **Massehandlinger** — ormekur/vaccination for hele flokken på én gang
6. **AI-anbefalinger** — første version med Claude API
7. **Market garden-modul**
8. **Eksport** — PDF sundhedsjournal

---

*Dokumentet opdateres løbende i takt med udviklingen.*
