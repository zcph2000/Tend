import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buildFarmContext } from "@/lib/farmContext";
import { buildEconomyContext } from "@/lib/economyContext";
import ExportActions from "./ExportActions";

export default async function ExportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: farm } = await supabase.from("farms").select("id, name").eq("user_id", user!.id).single();

  if (!farm) {
    return (
      <div className="card text-center py-8">
        <p className="text-earth-300 text-sm">Opret din gård i Indstillinger først</p>
      </div>
    );
  }

  const [farmMarkdown, economyMarkdown] = await Promise.all([
    buildFarmContext(supabase, farm.id),
    buildEconomyContext(supabase, farm.id),
  ]);
  const fullMarkdown = farmMarkdown + economyMarkdown;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Link href="/tools" className="text-earth-300">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-earth-50">Eksportér gårdsdata</h1>
          <p className="text-earth-300 text-sm mt-0.5">
            Til at give en anden AI-samtale (Claude, ChatGPT osv.) kontekst om {farm.name}
          </p>
        </div>
      </div>

      <div className="rounded-xl p-3 text-xs text-earth-300" style={{ background: "rgba(163,230,53,0.06)", border: "1px solid rgba(163,230,53,0.15)" }}>
        Kopiér teksten herunder og sæt den ind øverst i en samtale, sammen med dit spørgsmål —
        fx "vi har nu kørt i tre år, hjælp mig med at evaluere hele driften" eller
        "hvilken afdeling skal jeg satse mere på?". Indeholder marker, dyr, jordsundhed,
        biodiversitet og økonomi (afdelinger, budget, rentabilitet, projekter).
      </div>

      <ExportActions markdown={fullMarkdown} farmName={farm.name} />

      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="px-4 py-3 text-sm font-semibold text-earth-100 border-b border-white/5">Forhåndsvisning</p>
        <pre className="px-4 py-3 text-[11px] text-earth-300 whitespace-pre-wrap break-words max-h-[60vh] overflow-y-auto">
          {fullMarkdown}
        </pre>
      </div>
    </div>
  );
}
