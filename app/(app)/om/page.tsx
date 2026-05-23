import Link from "next/link";
import {
  Leaf, Sprout, Worm, Droplets, Wind, Sun,
  RefreshCw, Bot, BarChart2, Heart, ArrowRight,
} from "lucide-react";

function Principle({ icon: Icon, title, children }: {
  icon: React.ComponentType<{ size: number; className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={18} className="text-earth-300" />
      </div>
      <div>
        <p className="font-semibold text-earth-50 text-sm">{title}</p>
        <p className="text-sm text-earth-300 mt-0.5 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function Module({ icon: Icon, title, status, description }: {
  icon: React.ComponentType<{ size: number; className?: string }>;
  title: string;
  status: "bygget" | "næste" | "fremtid";
  description: string;
}) {
  const statusLabel = { bygget: "Klar", næste: "På vej", fremtid: "Vision" }[status];
  const statusColor = {
    bygget: "bg-earth-800 text-earth-300",
    næste:  "bg-earth-800 text-earth-300",
    fremtid: "bg-earth-800 text-earth-500",
  }[status];

  return (
    <div className={`flex items-start gap-3 ${status === "fremtid" ? "opacity-50" : ""}`}>
      <Icon size={16} className="text-earth-300 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium ${status === "fremtid" ? "text-earth-400" : "text-earth-100"}`}>
            {title}
          </p>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
        <p className="text-xs text-earth-400 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default function OmPage() {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-earth-50">Om Tend</h1>
        <p className="text-earth-300 text-sm mt-1 leading-relaxed">
          En app der hjælper os mod en bedre verden for dyr, planter og mennesker
        </p>
      </div>

      {/* Grundtanken */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-earth-50">Grundtanken</h2>
        <p className="text-sm text-earth-200 leading-relaxed">
          Tend er ikke en driftsapp med regenerative features. Det er en <strong className="text-earth-100">regenerativ app</strong> — bygget på det grundlag at landbrug skal helbrede jord, vand, biodiversitet og klima, ikke blot producere effektivt.
        </p>
        <p className="text-sm text-earth-200 leading-relaxed">
          Udgangspunktet er en simpel erkendelse: den måde vi dyrker jord på, har udtømt den. Kompakteret den. Isoleret den fra de kredsløb og organismer der skaber frugtbarhed. Regenerativt landbrug er at vende den retning — at arbejde <em>med</em> naturens processer frem for imod dem.
        </p>
        <p className="text-sm text-earth-200 leading-relaxed">
          Tend hjælper dig med at spore om du bevæger dig i den rigtige retning — ikke bare om dyrene har det godt, men om gården som helhed er ved at blive mere levende, mere frugtbar og mere modstandsdygtig år for år.
        </p>
      </div>

      {/* Principper */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-earth-50">De regenerative principper</h2>
        <div className="space-y-4">
          <Principle icon={Leaf} title="Hold jordens overflade dækket">
            Nøgen jord taber vand, kulstof og liv. Dækafgrøder, planterester og mulch holder fugten, beskytter mikrolivet og reducerer erosion.
          </Principle>
          <Principle icon={Worm} title="Minimer jordforstyrrelse">
            Pløjning bryder svampenetværk, kompakterer dybere lag og frigiver oplagret kulstof. Lad jordens egne organismer gøre arbejdet.
          </Principle>
          <Principle icon={Sprout} title="Hold levende rødder i jorden">
            Rødder ernærer mikrober, strukturerer jordbunden og pumper kulstof ned i dybden. Flerårige planter og efterafgrøder holder rødderne aktive hele året.
          </Principle>
          <Principle icon={Heart} title="Integrér husdyr">
            Dyr er ikke bare produktion — de er en helende kraft. Korrekt rotationsgræsning stimulerer græsvækst, fordeler næring og bygger jordens organiske indhold. Klovene bryder skorpen. Møddinget gøder. Flokken efterligner de store planteæderes naturlige bevægelse.
          </Principle>
          <Principle icon={Sun} title="Øg biodiversitet">
            Et sundt system har mange lag: planter, svampe, insekter, fugle, padder, pattedyr. Biodiversitet er ikke et mål i sig selv — det er tegnet på at systemet fungerer.
          </Principle>
          <Principle icon={Wind} title="Forstå din kontekst">
            Regenerativt landbrug er ikke en opskrift. Det er en tænkemåde. Beslutninger træffes ud fra det specifikke sted, klima, jord, økonomi og det mål du har sat for din gård.
          </Principle>
        </div>
      </div>

      {/* Hvad vi måler */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-earth-50">Hvad vi måler — og hvorfor</h2>
        <p className="text-sm text-earth-300 leading-relaxed">
          Tend er bygget op om den ide at det der bliver målt, bliver forbedret. Men vi måler ikke for målingens skyld — vi måler for at forstå om vi bevæger os mod mere liv eller mindre.
        </p>
        <div className="space-y-3">
          <Module icon={RefreshCw} status="bygget" title="Rotationsgræsning"
            description="Hvile, tæthed og belægningstryk — den direkte mekanisme for jordheling via husdyr" />
          <Module icon={Worm} status="bygget" title="Jordsundhed"
            description="pH, organisk materiale, ormetal, vandretention — tegn på om jordens liv er i fremgang" />
          <Module icon={BarChart2} status="næste" title="Kulstofbinding"
            description="Estimeret CO2-binding baseret på ændringer i organisk materiale over tid" />
          <Module icon={Sprout} status="næste" title="Sædeskifte og bedplaner"
            description="Flerårig rotation og kompanionplantning — biodiversitet i marken" />
          <Module icon={Droplets} status="fremtid" title="Vandkredsløb"
            description="Vandretention, overfladeafstrømning og grundvandsniveau over tid" />
          <Module icon={Sun} status="fremtid" title="Biodiversitetslog"
            description="Observationer af plante- og dyrearter — tegn på økosystemets sundhed" />
        </div>
      </div>

      {/* Rådgiveren */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-earth-300" />
          <h2 className="font-semibold text-earth-50">Rådgiveren</h2>
        </div>
        <p className="text-sm text-earth-200 leading-relaxed">
          Rådgiveren er ikke bare en database-forespørgsel. Den er ment som en erfaren regenerativ rådgiver der kender din gård, dine dyr, dine marker og dine jordmålinger — og kan se mønstre på tværs af dem alle.
        </p>
        <p className="text-sm text-earth-200 leading-relaxed">
          Den kan hjælpe med konkrete spørgsmål som "hvornår skal jeg flytte flokkene?" — men også med de store spørgsmål: "Er vi på rette kurs? Hvad er det vigtigste vi kan gøre for at forbedre jordens sundhed på den her mark?"
        </p>
        <p className="text-sm text-earth-300 text-xs leading-relaxed mt-1">
          Over tid, efterhånden som Tend samler data om din gård, vil rådgiveren blive bedre til at give præcise og stedspecifikke råd.
        </p>
        <Link href="/raadgiver" className="flex items-center gap-2 text-sm text-earth-200 hover:text-earth-100 transition-colors pt-1">
          Åbn rådgiveren <ArrowRight size={14} />
        </Link>
      </div>

      {/* Visionen */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-earth-50">Visionen</h2>
        <p className="text-sm text-earth-200 leading-relaxed">
          Vi tror på at regenerativt landbrug er et af de vigtigste redskaber vi har til at binde kulstof, genoprette vandkredsløb, øge biodiversitet og producere mad på en måde der er bæredygtig på den lange bane.
        </p>
        <p className="text-sm text-earth-200 leading-relaxed">
          Tend er bygget for at gøre det lettere at praktisere regenerativt — ved at gøre det usynlige synligt. At vise at den hvile du giver marken faktisk har en målbar effekt. At dine jordmålinger bevæger sig i den rigtige retning. At de beslutninger du træffer i dag, bygger en bedre gård til i morgen.
        </p>
        <p className="text-sm text-earth-300 italic mt-1">
          Tend er bygget på Røsnæsgård, Røsnæs, Danmark — og er designet til at vokse med gården og dens behov.
        </p>
      </div>

      <Link href="/rotation/planner/info" className="card block hover:brightness-110 transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-earth-100 text-sm">Rotationsplanlæggerens principper</p>
            <p className="text-xs text-earth-300 mt-0.5">Algoritmen og tankerne bag AMP-græsning forklaret</p>
          </div>
          <ArrowRight size={16} className="text-earth-300 flex-shrink-0" />
        </div>
      </Link>

    </div>
  );
}
