import Link from "next/link";
import { Map, ChevronRight, Rows3, FlaskConical, Apple, Sprout, Wind } from "lucide-react";

const SECTIONS = [
  {
    href: "/pastures",
    Icon: Map,
    label: "Marker",
    desc: "Markindeling, sektioner, jordsundhed og hegnsplan",
  },
  {
    href: "/jordbrug/bede",
    Icon: Rows3,
    label: "Bede",
    desc: "Afgrøder, såtider, høst og kompanionplanter",
  },
  {
    href: "/jordbrug/polytunnel",
    Icon: Wind,
    label: "Polytunnel",
    desc: "Drivhus og overdækket dyrkning",
  },
  {
    href: "/jordbrug/frugtplantage",
    Icon: Apple,
    label: "Frugtplantage",
    desc: "Træer, buske og flerårige afgrøder",
  },
  {
    href: "/jordbrug/kompost",
    Icon: FlaskConical,
    label: "Kompost",
    desc: "Bunker og nedbrydning — næring tilbage til jord",
  },
  {
    href: "/jordbrug/fro",
    Icon: Sprout,
    label: "Frø og forspiring",
    desc: "Frølager, spiringsvinduer og forspiringsplan",
  },
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

      <div className="space-y-3">
        {SECTIONS.map(({ href, Icon, label, desc }) => (
          <Link key={href} href={href}
            className="card flex items-start gap-4 hover:brightness-110 transition-all group">
            <Icon size={22} className="flex-shrink-0 mt-0.5 text-earth-300" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-earth-50">{label}</p>
              <p className="text-sm text-earth-300 mt-0.5 leading-snug">{desc}</p>
            </div>
            <ChevronRight size={18} className="text-earth-300 group-hover:text-earth-100 transition-colors flex-shrink-0 mt-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
