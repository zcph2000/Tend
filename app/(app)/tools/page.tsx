import Link from "next/link";

export default function ToolsPage() {
  return (
    <div className="space-y-4">

      {/* AI Rådgiver — fremhævet øverst */}
      <Link href="/raadgiver"
        className="card flex items-start gap-4 bg-gradient-to-br from-grass-600 to-grass-800 text-white border-0 hover:shadow-lg transition-shadow group">
        <span className="text-3xl mt-0.5 flex-shrink-0">🤖</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-white">AI Rådgiver</p>
            <span className="text-[10px] font-medium bg-grass-500 text-white rounded-full px-2 py-0.5">
              Ny
            </span>
          </div>
          <p className="text-sm text-grass-200 mt-0.5 leading-snug">
            Stil spørgsmål om rotation, avl og slagtning — rådgiveren kender din gård.
          </p>
        </div>
        <span className="text-grass-300 text-lg group-hover:text-white transition-colors flex-shrink-0 mt-1">→</span>
      </Link>

      <div>
        <p className="text-xs font-semibold text-earth-400 uppercase tracking-wide px-1 mb-2">
          Planlægningsværktøjer
        </p>
        <div className="space-y-3">
          {tools.map((tool) =>
            tool.ready ? (
              <Link key={tool.label} href={tool.href}
                className="card flex items-start gap-4 hover:shadow-md transition-shadow group">
                <span className="text-3xl mt-0.5 flex-shrink-0">{tool.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-earth-900">{tool.label}</p>
                    <span className="text-[10px] font-medium bg-grass-100 text-grass-700 rounded-full px-2 py-0.5">Klar</span>
                  </div>
                  <p className="text-sm text-earth-400 mt-0.5 leading-snug">{tool.description}</p>
                </div>
                <span className="text-earth-300 text-lg group-hover:text-earth-500 transition-colors flex-shrink-0 mt-1">→</span>
              </Link>
            ) : (
              <div key={tool.label} className="card flex items-start gap-4 opacity-50 cursor-default">
                <span className="text-3xl mt-0.5 flex-shrink-0 grayscale">{tool.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-earth-700">{tool.label}</p>
                    <span className="text-[10px] font-medium bg-earth-100 text-earth-400 rounded-full px-2 py-0.5">Kommer snart</span>
                  </div>
                  <p className="text-sm text-earth-400 mt-0.5 leading-snug">{tool.description}</p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

const tools = [
  {
    href: "/rotation/planner",
    icon: "🔄",
    label: "Rotationsplanlægger",
    description: "Beregn sektionsstørrelse, tæthed og hvileperiode ud fra flokstørrelse og areal.",
    ready: true,
  },
  {
    href: "#",
    icon: "📏",
    label: "Sædeskifteplan",
    description: "Planlæg flerårig rotation af afgrøder på tværs af bede og marker.",
    ready: false,
  },
  {
    href: "#",
    icon: "🌱",
    label: "Bedplaner",
    description: "Tegn bede, sæt rækkeafstande og planlæg hvad der går hvad.",
    ready: false,
  },
  {
    href: "#",
    icon: "💧",
    label: "Vandingsplan",
    description: "Behovsstyret vanding baseret på vejr og afgrøde.",
    ready: false,
  },
];

