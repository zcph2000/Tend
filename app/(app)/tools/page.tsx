import Link from "next/link";
import { Bot, RefreshCw, Ruler, Sprout, Droplets, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default function ToolsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-earth-50">Planlæg</h1>
        <p className="text-earth-300 text-sm mt-0.5">
          AI-rådgiver og planlægningsværktøjer
        </p>
      </div>

      {/* AI Rådgiver */}
      <Link href="/tools/advisor"
        className="card flex items-start gap-4 hover:brightness-110 transition-all group">
        <Bot size={24} className="flex-shrink-0 mt-0.5 text-earth-300" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-earth-50">AI Rådgiver</p>
          <p className="text-sm text-earth-300 mt-0.5 leading-snug">
            Stil spørgsmål om rotation, jordsundhed og regenerative valg — rådgiveren kender din gård.
          </p>
        </div>
        <ChevronRight size={18} className="text-earth-300 group-hover:text-earth-100 transition-colors flex-shrink-0 mt-1" />
      </Link>

      <div>
        <p className="text-xs font-semibold text-earth-300 uppercase tracking-wide px-1 mb-2">
          Planlægningsværktøjer
        </p>
        <div className="space-y-3">
          {tools.map((tool) =>
            tool.ready ? (
              <Link key={tool.label} href={tool.href}
                className="card flex items-start gap-4 hover:brightness-110 transition-all group">
                <tool.Icon size={24} className="text-earth-300 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-earth-50">{tool.label}</p>
                  <p className="text-sm text-earth-300 mt-0.5 leading-snug">{tool.description}</p>
                </div>
                <ChevronRight size={18} className="text-earth-300 group-hover:text-earth-100 transition-colors flex-shrink-0 mt-1" />
              </Link>
            ) : (
              <div key={tool.label} className="card flex items-start gap-4 opacity-40 cursor-default">
                <tool.Icon size={24} className="text-earth-300 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-earth-300">{tool.label}</p>
                    <span className="text-[10px] font-medium bg-earth-800 text-earth-400 rounded-full px-2 py-0.5">Kommer snart</span>
                  </div>
                  <p className="text-sm text-earth-300 mt-0.5 leading-snug">{tool.description}</p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

const tools: { href: string; Icon: LucideIcon; label: string; description: string; ready: boolean }[] = [
  {
    href: "/tools/rotation-planner",
    Icon: RefreshCw,
    label: "Rotationsplanlægger",
    description: "Beregn sektionsstørrelse, tæthed og hvileperiode ud fra flokstørrelse og areal.",
    ready: true,
  },
  {
    href: "#",
    Icon: Ruler,
    label: "Sædeskifteplan",
    description: "Planlæg flerårig rotation af afgrøder på tværs af bede og marker.",
    ready: false,
  },
  {
    href: "/tools/propagation",
    Icon: Sprout,
    label: "Forspiringsoverblik",
    description: "Planlæg hvad du vil dyrke, hvornår du skal sætte det til at spire, og hvor mange frø du skal købe.",
    ready: true,
  },
  {
    href: "#",
    Icon: Droplets,
    label: "Vandingsplan",
    description: "Behovsstyret vanding baseret på vejr og afgrøde.",
    ready: false,
  },
];
