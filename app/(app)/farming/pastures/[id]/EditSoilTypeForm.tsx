"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";

export const JB_TYPES = [
  {
    key: "JB1",
    label: "JB1 — Grovsand",
    desc: "Over 90% sand, meget lidt ler. Dræner hurtigt, tørrer let ud.",
    pølse: "Kan slet ikke rulles til en pølse — smuldrer straks.",
    modifier: 1.45,
  },
  {
    key: "JB2",
    label: "JB2 — Finsand",
    desc: "Fin sandfraktion, under 10% ler. Let med lidt bedre vandretention end JB1.",
    pølse: "Hænger akkurat sammen, men brækker ved mindste tryk.",
    modifier: 1.35,
  },
  {
    key: "JB3",
    label: "JB3 — Let lerblandet grovsand",
    desc: "10–15% ler. Begynder at have lidt sammenhæng. Stadig let og luftig.",
    pølse: "Kan formes til en kort pølse, men brækker straks.",
    modifier: 1.2,
  },
  {
    key: "JB4",
    label: "JB4 — Let lerblandet finsand",
    desc: "10–15% ler, over 35% finsand. Lidt bedre kohæsion end JB3.",
    pølse: "Kan formes til en ca. 3–4 cm pølse, brækker let.",
    modifier: 1.1,
  },
  {
    key: "JB5",
    label: "JB5 — Grovsandet lerjord",
    desc: "15–25% ler. Den klassiske midterjord — godt for de fleste afgrøder.",
    pølse: "Kan rulles til ca. 5 cm. Brækker når du prøver at bøje den.",
    modifier: 1.0,
  },
  {
    key: "JB6",
    label: "JB6 — Finsandet lerjord",
    desc: "15–25% ler med over 35% finsand. God vandretention, arbejdbar.",
    pølse: "Ca. 10 cm pølse mulig. Brækker stadig ved skarp bøjning.",
    modifier: 0.95,
  },
  {
    key: "JB7",
    label: "JB7 — Lerjord",
    desc: "25–45% ler. God fugtighed, kræver omtanke for at undgå kompaktering.",
    pølse: "Lang, blank pølse. Kan bøjes forsigtigt uden at brække.",
    modifier: 0.85,
  },
  {
    key: "JB8",
    label: "JB8 — Svær lerjord",
    desc: "Over 45% ler. Meget høj vandretention, kan klumpe og komme.",
    pølse: "Lang, glinsende pølse der kan vikles om fingeren.",
    modifier: 0.8,
  },
  {
    key: "JB9",
    label: "JB9 — Sandblandet humusjord",
    desc: "Over 5% organisk stof. Mørk, svampet jord med høj biologisk aktivitet.",
    pølse: "Føles svampet og porøs. Smuldrer lidt — danner ikke rigtig pølse.",
    modifier: 0.75,
  },
  {
    key: "JB10",
    label: "JB10 — Humusjord / mosejord",
    desc: "Over 12% organisk stof. Tørvepræget, meget mørk og let.",
    pølse: "Meget mørk og trevlet — danner slet ingen pølse.",
    modifier: 0.7,
  },
];

export default function EditSoilTypeForm({
  fieldId,
  currentSoilType,
}: {
  fieldId: string;
  currentSoilType: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [selected, setSelected] = useState(currentSoilType ?? "");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function save() {
    setSaving(true);
    await supabase
      .from("fields")
      .update({ soil_type: selected || null })
      .eq("id", fieldId);
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  const current = JB_TYPES.find(s => s.key === currentSoilType);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-xl px-3 py-2.5 border border-white/10 hover:bg-white/5 transition-colors flex items-center justify-between"
      >
        <span className="text-sm">
          {current ? (
            <>
              <span className="font-medium text-earth-100">{current.key} — {current.label.split("—")[1].trim()}</span>
              <span className="ml-2 text-earth-400 text-xs">{current.desc.split(".")[0]}</span>
            </>
          ) : (
            <span className="text-earth-400">Ingen jordtype valgt — tryk for at sætte</span>
          )}
        </span>
        <span className="text-earth-500 text-xs flex-shrink-0 ml-2">Rediger</span>
      </button>
    );
  }

  return (
    <div className="space-y-3">

      {/* Pølsetest-guide */}
      <button
        onClick={() => setShowGuide(g => !g)}
        className="w-full text-left rounded-xl px-3 py-2.5 bg-white/5 border border-white/10 text-xs text-earth-300"
      >
        <span className="font-semibold text-earth-200 flex items-center gap-1.5">
          <FlaskConical size={13} className="flex-shrink-0" />
          Usikker på jordtypen? Lav pølsetesten
        </span>
        {showGuide && (
          <p className="mt-2 text-earth-400 leading-relaxed">
            Tag en håndfuld jord, fugt den let og prøv at rulle den til en pølse i hånden.
            Konsistensen afslører lerindholdet. Se beskrivelserne nedenfor og find den der passer.
          </p>
        )}
      </button>

      {/* JB-vælger */}
      <div className="space-y-1.5 max-h-96 overflow-y-auto pr-0.5">
        {JB_TYPES.map(s => (
          <button
            key={s.key}
            onClick={() => setSelected(s.key)}
            className={`w-full text-left rounded-xl px-3 py-2.5 border transition-colors ${
              selected === s.key
                ? "border-earth-300 bg-white/5"
                : "border-white/10 hover:bg-white/5"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                selected === s.key ? "border-earth-300" : "border-earth-600"
              }`}>
                {selected === s.key && (
                  <span className="w-2 h-2 rounded-full bg-earth-300 block" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-earth-100">{s.label}</p>
                <p className="text-xs text-earth-400 mt-0.5">{s.desc}</p>
                {showGuide && (
                  <p className="text-xs text-earth-500 mt-1 italic flex items-start gap-1">
                    <FlaskConical size={11} className="flex-shrink-0 mt-0.5" />
                    {s.pølse}
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Annuller</button>
        <button onClick={save} disabled={saving} className="btn-primary flex-1">
          {saving ? "Gemmer..." : "Gem"}
        </button>
      </div>
    </div>
  );
}
