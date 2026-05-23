# Tend — Jordbrug: Vision og arkitekturplan

Dette dokument beskriver den fulde vision for jordbrugsdelen af Tend-appen, samt den planlagte arkitektur og rækkefølgen hvori det bygges. Det er skrevet så en ny samtale eller session kan forstå konteksten og fortsætte uden at miste tråden.

---

## Kontekst: Hvem er brugeren og hvad er situationen

Tend er bygget til og af Zaki Youssef. Han bor på **Morbærgård** og er i gang med at etablere et regenerativt landbrug der på sigt skal levere grøntsager, kød og æg til **Røsnæsgård** (restaurant og naturformidlingscenter). Intet er i fuld drift endnu — han er i etableringsfasen og bruger appen primært som planlægningsredskab og intelligent sparringspartner.

Røsnæsgård er ikke et egentligt landbrug. Det er et sted med restaurant, skolehaver, sansehaver og naturformidling. Morbærgård forsyner restauranten.

---

## Det overordnede princip for jordbrugsdelen

Jordbrugsdelen af Tend skal have den samme dybde og kompleksitet som dyre- og rotationsdelen. Det er ikke en simpel notesbog — det er et fuldt markedshave-styringssystem inspireret af:

- **Charles Dowding** (no-dig metoden, kompostprincipper)
- **Richard Perkins** (regenerativ markedshave, Ridgedale Permaculture)
- **Heirloom-appen** (kompleksiteten i planlægning og sortsdata)
- **Frøsamlerne** (heritage-sorter, dansk frøkultur)

Systemet skal kunne bruges til **planlægning** (hvad planter jeg hvornår og hvor) og **drift** (hvad sker der i dag, hvad skal gøres, hvad høstede vi). De to lag skal hænge sammen og feed ind i rådgiveren.

---

## De seks søjler

### 1. Kortlag — fysisk placering af alt
Alle growing spaces placeres på et kort med GPS-koordinater og orientering (nord/syd/øst/vest). Dette gælder:
- Bede og sektioner (grupper af bede)
- Polytunnel-bede
- Frugttræer og bærbuske (enkeltvis)
- Kompostbunker

Orientering er ikke kosmetisk — i Danmark er der ofte kold vind fra NV, og sydvendte bede varmer op hurtigst. Rådgiveren bruger dette aktivt.

En **sektion** er en gruppe bede med definerede dimensioner og gangbredder. Fx: "10 bede à 10×0,75 m med 0,40 m flis-gang imellem." Sektionen placeres samlet på kortet. Polytunnel-bede fungerer på samme måde — samme kortlogik, men markeret som overdækket.

### 2. Afgrøde- og sortsbase (fundamentet)
Dette er kernen som alt andet bygger på. Databasen eksisterer på **sortniveau**:

- *Solanum lycopersicum* 'Black Cherry' og *Solanum lycopersicum* 'Pineapple' er to forskellige poster — ikke bare "tomat"
- Botanisk navn + sortnavn + handelsnavn + evt. heritage-klassifikation
- Agronomiske data per sort:
  - Rækkeafstand og planteafstand
  - Sådybde
  - Direkte såning vs. forspiring
  - Forspiringsuger inden udplantning
  - Temperaturkrav til spiring (bund- og lufttemperatur)
  - Udplantningsdato (baseret på sidst forventede nattefrost for lokation)
  - Plejetrin: nipning af sideskud, opbinding, afblomstring, osv.
  - Høstvindue (fra/til)
  - Udbytte-estimat pr. m² (til økonomi-laget)
- Flerårige planter (frugttræer, flerårige urter) har en anden logik end etårige:
  - Etableringsfase (første 1–3 år)
  - Løbende plejetrin (beskæring, timing per art)
  - Dyreintegration: kan høns gå under æbletræer? Kan moskusænder holde snegle væk?
- Heritage-sorter markeres særskilt med bevaringsværdi og evt. kilde (Frøsamlerne, egne frø osv.)
- Databasen pre-seedes med de mest gængse afgrøder + danske heritage-sorter
- Brugeren kan tilføje egne sorter med alle de samme felter
- Systemet er bygget til at udvides: nye felter kan tilføjes over tid uden at bryde eksisterende data

### 3. Planlægningsværktøjer
Planleggeren binder kortlaget og afgrødedatabasen sammen:

- **Bedplanner**: Vælg et bed på kortet → vælg en sort → systemet foreslår afstande, beregner antal planter der passer, og foreslår sådato baseret på udplantningsdato
- **Forspiringsoverblik**: Hvad skal sås hvornår? Systemet beregner baglæns fra planlagt udplantning
- **Forspiringssetup**: Systemet ved hvad du har (vindueskarmen, et lille koldt drivhus, et opvarmet drivhus) og justerer anbefalinger derefter. 200 kvm opvarmet drivhus = man kan starte tidligere. Vindueskarmen = begrænset plads og lys.
- **Successionsplanlægning**: Samme bed kan have 2–3 afgrøder henover sæsonen. Planleggeren håndterer dette.
- **Sædeskifteplan**: På tværs af år — planleggeren husker hvad der stod i bed 3 sidste år og advarer mod at plante kålfamilien der igen

### 4. Frø og forspiring
Frølageret er ikke isoleret — det kommunikerer med planleggeren:

- Planleggeren beregner: "Du har brug for 60 tomattfrø til din plan. Du har 40g 'Black Cherry' (ca. 200 frø). Du mangler 'Pineapple'."
- Frødatabasen (fra sortsbasen) ved:
  - Om frøene skal i køleskab inden såning (stratificering)
  - Om de skal skarificeres (ridses/files)
  - Om de er lysspirere eller mørksporere
  - Holdbarhed (år) og forventet spiringsprocent over tid
- På sigt: generér indkøbsliste direkte til fx Frøsamlerne eller lignende
- Frølageret tracker hvad der er på lager, hvad der er sået, og hvad der er tilbage

### 5. Drift og observation
Alt hvad der sker på et bed, et træ eller en kompostbunke logges:

**Bede:**
- Muld/kompost tilsat (cm og dato)
- Vanding (håndvanding, drypvanding installeret, regnvand)
- Lugning (tid brugt — feeds ind i økonomi)
- Plantesundhed-observationer
- Høstregistrering med mængde og dato

**Frugttræer og buske:**
- Beskæringslog (dato, hvad der blev gjort, billede)
- Vanding i etableringsfasen
- Sygdom og skadedyr
- Høstregistrering

**Kompost (Charles Dowding-principper):**
- Bunke-dimensioner (m³)
- Temperaturlog — hvornår sidst målt, hvad er temp
- Påmindelser om vending (baseret på temperatur og tid)
- Grønt/brunt-ratio tracker
- Tilsat materiale log: hvad, hvornår, mængde
- Er der tilsat kompostorme?
- Observationer: omsat-grad, lugt, fugtighed, svampevækst
- Guide til hvad god kompost kræver (Dowding-principper bygget ind)

### 6. Økonomi
Økonomi-laget gør Tend til et forretningsredskab, ikke bare et registreringsværktøj:

- **Høst → salgspris**: Hvad solgte vi, til hvem, for hvad? (Røsnæsgård er primær aftager)
- **Input-omkostninger**: Frø, planter (indkøbte), kompost (egenfremstillet vs. købt), vand, dækafgrøder
- **Arbejdstid**: Log timer pr. opgave pr. bed — systemet kan beregne timeomkostning
- **Afkast pr. m²**: Hvilken afgrøde gav mest kr./m² i forhold til indsats?
- **Beslutningsstøtte**:
  - "Din direkte-såede spinat kostede dig 3,5 timer i lugning. Til den arbejdsløn er det billigere at købe færdige planter."
  - "Nye kartofler koster 90 kr./kg på markedet. Du har kapacitet til at dyrke 200 kg. Det er 18.000 kr. i potentielt salg."
  - "Dine tomater fra bed 4 gav 42 kg og solgte for 34 kr./kg. Det er 1.428 kr. fra 6 m². Ingen anden afgrøde matcher det."
- **Sæson-sammenligning**: Hvad gik op, hvad gik ned, hvad skal justeres næste år?

---

## Arkitekturen — hvad der bygges i hvilken rækkefølge

### Fase 1: Afgrødedatabasen (fundamentet)
*Intet andet kan bygges ordentligt uden dette.*

Tabeller:
- `crop_families` — plantefamilier (Solanaceae, Brassicaceae osv.)
- `crop_species` — artsniveau (*Solanum lycopersicum*)
- `crop_varieties` — sortniveau ('Black Cherry', 'Brandywine') med alle agronomiske data
- `growing_calendar` — per sort, per klimazone: hvornår sås, forspires, udplantes, høstes

Pre-seedes med ~200 af de mest relevante sorter for dansk klima + markedshave + heritage-sorter fra Frøsamlerne.

Bygges så brugeren kan tilføje egne sorter med alle de samme felter.

### Fase 2: Kortlaget — spatial layer
Unified kortlag der håndterer:
- Growing sections (grupper af bede) med mål og orientering
- Individuelle bede inden i sektioner
- Polytunnel-sektioner (markeret som overdækket)
- Individuelle frugttræer/buske med position og art

Bygger videre på det GPS/kort-system der allerede findes til marker og sektioner.

### Fase 3: Planleggeren
Binder fase 1 og 2 sammen:
- Vælg bed → vælg sort → systemet foreslår plan
- Forspiringsoverblik med kalender
- Frøberegner der tæller hvad planleggeren kræver og hvad lageret har
- Successionsplanlægning

### Fase 4: Drift og observation
Bygger på planleggeren:
- Opgavegenerering fra planteplaner (automatiske påmindelser)
- Observationslog pr. bed, træ og kompostbunke
- Høstregistrering
- Kompost-tracking med Dowding-principper

### Fase 5: Økonomi
Bygger på høst- og inputdata fra fase 4:
- Høst → salgspris
- Inputomkostninger
- Afkast-beregning pr. afgrøde
- Beslutningsstøtte og sæson-sammenligning

---

## Hvad der er bygget nu (maj 2025) — og hvad der skal erstattes

De simple bede/polytunnel/frø/kompost/frugtplantage-sider der blev bygget i den første iteration er for overfladiske. SQL-tabellerne sidder i databasen og gør ingen skade, men siderne skal erstattes med de nye, dybere sektioner efterhånden som faserne bygges.

Følgende er allerede bygget og fungerer som de skal:
- Dyr og flokke (fuld kompleksitet)
- Rotation og AMP-planlægger
- Marker og sektioner med jordsundhed
- Biodiversitetslog
- AI-rådgiver med streaming, vejrdata, rotationshistorik og auto-briefing

---

## Designprincipper der skal overholdes

- **Udvidbart fra dag ét**: Nye felter på afgrødedatabasen må ikke kræve at eksisterende data migreres manuelt
- **Planning og drift hænger sammen**: En plan genererer opgaver; opgaver lukkes med observationer; observationer feed ind i næste plan
- **Rådgiveren ser alt**: Alt der registreres i jordbrug-systemet skal med i farmContext.ts og dermed i rådgiverens kontekst
- **Samme designsprog**: Mørkt organisk tema, Lucide icons (ingen emojis), dansk sprog i hele UI
- **Mobil-first**: Store touch-targets, kortformat der fungerer på en telefon ude på marken
