import Link from "next/link";
import { Leaf, RefreshCw, Clock, Users, BarChart2, Sprout } from "lucide-react";

function Section({ icon: Icon, title, children }: {
  icon: React.ComponentType<{ size: number; className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-earth-300 flex-shrink-0" />
        <h2 className="font-semibold text-earth-50">{title}</h2>
      </div>
      <div className="space-y-2 text-sm text-earth-200 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export default function PlannerInfoPage() {
  return (
    <div className="space-y-4">
      <Link href="/rotation/planner" className="text-sm text-earth-300 flex items-center gap-1">
        ← Rotationsplanlægger
      </Link>

      <div>
        <h1 className="text-xl font-bold text-earth-50">Principper og algoritme</h1>
        <p className="text-sm text-earth-300 mt-0.5">
          Hvad betyder tallene, og hvad er idéen bag?
        </p>
      </div>

      <Section icon={Leaf} title="Hvad er regenerativ rotationsgræsning?">
        <p>
          Regenerativ rotationsgræsning — eller adaptiv multi-paddock-græsning (AMP) — er ikke bare en driftsmetode. Det er en måde at arbejde <em>med</em> naturens processer frem for imod dem.
        </p>
        <p>
          Princippet er enkelt: dyr græsser intensivt på et lille areal i kort tid, og flokkes derefter videre. Arealet der er afgræsset får lang hvile — tid nok til at græsset fuldt ud regenererer og rødderne vokser sig dybe ned i jorden.
        </p>
        <p>
          Dybe rødder binder kulstof i jorden. Dyretrykket stimulerer mikrobelivet. Møg og urin gøder. Klovne bryder jordskorpen og tilfører frø. Det er helbredende landbrug — ikke udtømmende.
        </p>
      </Section>

      <Section icon={Clock} title="De to ting der afgør om planen virker">
        <p>
          Planlæggeren balancerer to ting som altid er i spænding med hinanden:
        </p>
        <div className="space-y-2 mt-1">
          <div className="rounded-xl p-3 border border-white/10 bg-white/5">
            <p className="font-medium text-earth-100">1. Hviletid</p>
            <p className="mt-1">Græsset skal have tid nok til at gro fuldt ud igen, inden dyren vender tilbage. For kort hvile = udtømt mark. For lang hvile = gammelt, næringsfattigt græs.</p>
            <p className="mt-1 text-earth-300">Anbefalet hvile varierer med sæsonen — om sommeren vokser græs hurtigt (30 dage), om vinteren langsomt (90 dage).</p>
          </div>
          <div className="rounded-xl p-3 border border-white/10 bg-white/5">
            <p className="font-medium text-earth-100">2. Belægningstryk</p>
            <p className="mt-1">Flokken skal være tæt nok til at afgræsse en sektion ordentligt — ikke selektivt plukke de bedste totter og efterlade resten. Det kræver min. 5–20 dyr/ha pr. sektion.</p>
            <p className="mt-1 text-earth-300">Meget høj tæthed (mob-græsning, 50–300+ dyr/ha) kræver til gengæld meget hyppige flytninger — dagligt eller hvert andet dag.</p>
          </div>
        </div>
      </Section>

      <Section icon={Users} title="Hvad betyder dyr/ha?">
        <p>
          "Dyr pr. hektar pr. sektion" er den øjeblikkelige tæthed i den sektion der grasses nu. Det er <em>ikke</em> det samme som det samlede dyretryk på hele arealet.
        </p>
        <p>
          Forestil dig 20 får på 1 ha: de er tæt nok til at afgræsse koordineret, stimulerer jordbunden og bevæger sig som en flok. Samme 20 får spredt over 10 ha: selektiv afgræsning, svage stier, dårlig gødningsfordeling.
        </p>

        <p className="font-medium text-earth-100 mt-1">Får og lam</p>
        <div className="space-y-1.5">
          {[
            { range: "Under 5/ha", label: "For lav", desc: "Selektiv afgræsning, ingen mob-effekt" },
            { range: "5–20/ha",    label: "Let",     desc: "Virker, men under optimalt" },
            { range: "20–80/ha",   label: "God mob", desc: "Standard AMP — 2–4-dages flytning" },
            { range: "80–300/ha",  label: "Intensiv", desc: "Kræver daglig eller 2-dages flytning" },
          ].map(r => (
            <div key={r.range} className="flex gap-3 text-xs">
              <span className="text-earth-300 w-20 flex-shrink-0">{r.range}</span>
              <span><span className="font-medium text-earth-100">{r.label}</span>{" — "}{r.desc}</span>
            </div>
          ))}
        </div>

        <p className="font-medium text-earth-100 mt-2">Kvæg</p>
        <p className="text-xs text-earth-300">
          Kvæg er meget større dyr — 1 ko svarer til ca. 6–7 får i afgræsningseffekt. Tæthedsgrænser i antal hoveder er derfor langt lavere:
        </p>
        <div className="space-y-1.5">
          {[
            { range: "Under 1/ha",  label: "For lav", desc: "Ingen mob-effekt" },
            { range: "2–5/ha",      label: "Let",     desc: "Fungerer ved 3–4-dages flytning" },
            { range: "5–12/ha",     label: "God mob", desc: "Intensiv rotationsgræsning med kvæg" },
          ].map(r => (
            <div key={r.range} className="flex gap-3 text-xs">
              <span className="text-earth-300 w-20 flex-shrink-0">{r.range}</span>
              <span><span className="font-medium text-earth-100">{r.label}</span>{" — "}{r.desc}</span>
            </div>
          ))}
        </div>

        <p className="font-medium text-earth-100 mt-2">Høns / egg-mobile</p>
        <p className="text-xs text-earth-300">
          Høns følger typisk 3–5 dage <em>efter</em> kvæg eller får. De prikker i møddingen, bryder parasitcyklussen og gøder arealet. Opholdet er meget kortvarigt — timer til én dag — ved meget høj tæthed (200–1000+ høns/ha).
        </p>
      </Section>

      <Section icon={BarChart2} title="Sådan beregner algoritmen">
        <p>Formlen er gennemsigtig — der er ingen skjulte variabler:</p>
        <div className="rounded-xl p-3 border border-white/10 bg-white/5 font-mono text-xs space-y-1 text-earth-100">
          <p>hviledage = (sektioner − 1) × dage pr. sektion</p>
          <p>tæthed = dyr ÷ (samlet ha ÷ sektioner)</p>
        </div>
        <p>
          Algoritmen vurderer planen ud fra om hviledagene nærmer sig det sæsonmæssige mål, og om tætheden er inden for det fornuftige interval for den valgte opholdsperiode.
        </p>
        <p>
          Jordtype påvirker det anbefalede hvileinterval — sandet jord med langsom vækst kræver mere hvile end god muld med hurtig genopretning.
        </p>
      </Section>

      <Section icon={RefreshCw} title="Hvad er en god plan i praksis?">
        <p>
          Der er ingen universel rigtig plan. En god plan er én du <em>faktisk kan følge</em> — som passer til dit hegn, din tid og dine dyr. Start enkelt: 4–6 sektioner, 3-dages flytning. Juster derefter.
        </p>
        <p>
          Det vigtigste er rytmen: dyr ind, dyr ud, lang hvile. Gentag. Over tid vil du se græsset blive tættere, jordbunden blødere og marker der tidligere var overudnyttede begynde at komme sig.
        </p>
      </Section>

      <Section icon={Sprout} title="Regenerative principper i appen">
        <p>
          Tend er bygget på de regenerative principper som ramme — ikke kun som en organisationsapp, men som et redskab til at spore om vi bevæger os i den rigtige retning:
        </p>
        <div className="space-y-1.5 mt-1">
          {[
            "Integrér husdyr i markdriften",
            "Hold jordoverfladen dækket hele året",
            "Minimér jordforstyrrelse (pløjning, kemikalier)",
            "Hold levende rødder i jorden mest muligt",
            "Øg biodiversitet — planter, insekter, svampe, mikrober",
            "Mål og spor jordens sundhed over tid",
          ].map((p, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="text-earth-400 flex-shrink-0 mt-0.5">·</span>
              <span>{p}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-earth-300">
          Jordmålinger, organisk materiale, kulstofbinding og vandretention er på vej som funktioner i Tend.
        </p>
      </Section>

      <Link href="/rotation/planner" className="btn-primary w-full text-center block">
        Tilbage til planlæggeren
      </Link>
    </div>
  );
}
