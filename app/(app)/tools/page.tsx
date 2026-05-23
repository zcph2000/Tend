import Link from "next/link";
import { Bot, RefreshCw, Ruler, Sprout, Droplets, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default function ToolsPage() {
  return (
    <div className="space-y-4">

      {/* AI Rådgiver — fremhævet øverst */}
      <Link href="/raadgiver"
        className="card flex items-start gap-4 bg-gradient-to-br from-grass-600 to-grass-800 text-white border-0 hover:shadow-lg transition-shadow group">
        <Bot size={28} className="flex-shrink-0 mt-0.5 text-earth-100" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-earth-50">AI Rådgiver</p>
            <span className="text-[10px] font-medium bg-grass-500 text-white rounded-full px-2 py-0.5">
              Ny
            </span>
          </div>
          <p className="text-sm text-grass-200 mt-0.5 leading-snug">
            Stil spørgsmål om rotation, avl og slagtning — rådgiveren kender din gård.
          </p>
        </div>
        <ChevronRight size={18} className="text-grass-300 group-hover:text-white transition-colors flex-shrink-0 mt-1" />
      </Link>

      <div>
        <p className="text-xs font-semibold text-earth-200 uppercase tracking-wide px-1 mb-2">
          Planlægningsværktøjer
        </p>
        <div className="space-y-3">
          {tools.map((tool) =>
            tool.ready ? (
              <Link key={tool.label} href={tool.href}
                className="card flex items-start gap-4 hover:brightness-110 transition-all group">
                <tool.Icon size={24} className="text-earth-200 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-earth-50">{tool.label}</p>
                    <span className="text-[10px] font-medium bg-grass-100 text-grass-700 rounded-full px-2 py-0.5">Klar</span>
                  </div>
                  <p className="text-sm text-earth-200 mt-0.5 leading-snug">{tool.description}</p>
                </div>
                <ChevronRight size={18} className="text-earth-200 group-hover:text-earth-100 transition-colors flex-shrink-0 mt-1" />
              </Link>
            ) : (
              <div key={tool.label} className="card flex items-start gap-4 opacity-40 cursor-default">
                <tool.Icon size={24} className="text-earth-200 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-earth-200">{tool.label}</p>
                    <span className="text-[10px] font-medium bg-earth-800 text-earth-200 rounded-full px-2 py-0.5">Kommer snart</span>
                  </div>
                  <p className="text-sm text-earth-200 mt-0.5 leading-snug">{tool.description}</p>
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
    href: "/rotation/planner",
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
    href: "#",
    Icon: Sprout,
    label: "Bedplaner",
    description: "Tegn bede, sæt rækkeafstande og planlæg hvad der går hvad.",
    ready: false,
  },
  {
    href: "#",
    Icon: Droplets,
    label: "Vandingsplan",
    description: "Behovsstyret vanding baseret på vejr og afgrøde.",
    ready: false,
  },
];
