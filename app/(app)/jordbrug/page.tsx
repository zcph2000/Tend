import Link from "next/link";
import { Map, ChevronRight, Rows3, FlaskConical, Apple, Sprout } from "lucide-react";

const COMING_SOON = [
  { Icon: Rows3,        label: "Bede",        desc: "Afgrøder, såtider, høst og kompanionplanter" },
  { Icon: Sprout,       label: "Polytunnel",  desc: "Drivhus og overdækket dyrkning" },
  { Icon: Apple,        label: "Frugtplantage", desc: "Træer, buske og flerårige afgrøder" },
  { Icon: FlaskConical, label: "Kompost",     desc: "Bunker, temperatur og ingredienser" },
];

export default function JordbrugPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-earth-50">Jordbrug</h1>
        <p className="text-earth-300 text-sm mt-0.5">
          Marker, bede, plantage og alt der gror
        </p>
      </div>

      {/* Marker — bygget */}
      <div>
        <p className="text-xs font-semibold text-earth-400 uppercase tracking-wide px-1 mb-2">
          Tilgængeligt nu
        </p>
        <Link href="/pastures"
          className="card flex items-start gap-4 hover:brightness-110 transition-all group">
          <Map size={24} className="flex-shrink-0 mt-0.5 text-earth-300" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-earth-50">Marker</p>
            <p className="text-sm text-earth-300 mt-0.5 leading-snug">
              Markindeling, sektioner, jordsundhed og hegnsplan
            </p>
          </div>
          <ChevronRight size={18} className="text-earth-300 group-hover:text-earth-100 transition-colors flex-shrink-0 mt-1" />
        </Link>
      </div>

      {/* Kommende undersider */}
      <div>
        <p className="text-xs font-semibold text-earth-400 uppercase tracking-wide px-1 mb-2">
          Kommer snart
        </p>
        <div className="space-y-3">
          {COMING_SOON.map(({ Icon, label, desc }) => (
            <div key={label} className="card flex items-start gap-4 opacity-40 cursor-default">
              <Icon size={24} className="text-earth-300 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-earth-300">{label}</p>
                  <span className="text-[10px] font-medium bg-earth-800 text-earth-400 rounded-full px-2 py-0.5">
                    Kommer snart
                  </span>
                </div>
                <p className="text-sm text-earth-300 mt-0.5 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
