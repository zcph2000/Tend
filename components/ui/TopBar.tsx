"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Settings } from "lucide-react";

interface Crumb {
  label: string;
  href: string;
}

function getBreadcrumbs(pathname: string): Crumb[] {
  // Dyr
  if (pathname.match(/^\/animals\/[^/]+\/edit$/)) {
    const id = pathname.split("/")[2];
    return [
      { label: "Dyr", href: "/animals" },
      { label: "Dyr", href: `/animals/${id}` },
      { label: "Rediger", href: pathname },
    ];
  }
  if (pathname.match(/^\/animals\/flocks\/[^/]+$/))
    return [{ label: "Dyr", href: "/animals" }, { label: "Flokke", href: "/animals/flocks" }, { label: "Flok", href: pathname }];
  if (pathname.match(/^\/animals\/groups\/[^/]+$/))
    return [{ label: "Dyr", href: "/animals" }, { label: "Grupper", href: "/animals/groups" }, { label: "Gruppe", href: pathname }];
  if (pathname === "/animals/flocks")
    return [{ label: "Dyr", href: "/animals" }, { label: "Flokke", href: pathname }];
  if (pathname === "/animals/groups")
    return [{ label: "Dyr", href: "/animals" }, { label: "Grupper", href: pathname }];
  if (pathname === "/animals/ungrouped")
    return [{ label: "Dyr", href: "/animals" }, { label: "Ikke-grupperede", href: pathname }];
  if (pathname === "/animals/new")
    return [{ label: "Dyr", href: "/animals" }, { label: "Nyt dyr", href: pathname }];
  if (pathname.match(/^\/animals\/[^/]+$/))
    return [{ label: "Dyr", href: "/animals" }, { label: "Dyr", href: pathname }];

  // Drift-undersider
  if (pathname === "/drift/kalender")
    return [{ label: "Drift", href: "/drift" }, { label: "Kalender", href: pathname }];
  if (pathname === "/rotation")
    return [{ label: "Drift", href: "/drift" }, { label: "Dyr & flokke", href: pathname }];

  // AI Rådgiver
  if (pathname === "/raadgiver")
    return [{ label: "Planlæg", href: "/tools" }, { label: "AI Rådgiver", href: pathname }];

  // Rotation planner
  if (pathname === "/rotation/planner")
    return [{ label: "Planlæg", href: "/tools" }, { label: "Rotationsplanlægger", href: pathname }];

  // Jordbrug + undersider
  if (pathname === "/pastures")
    return [{ label: "Jordbrug", href: "/jordbrug" }, { label: "Marker", href: pathname }];
  if (pathname.match(/^\/pastures\/[^/]+$/))
    return [{ label: "Marker", href: "/pastures" }, { label: "Mark", href: pathname }];
  if (pathname === "/jordbrug/afgroder")
    return [{ label: "Jordbrug", href: "/jordbrug" }, { label: "Afgrødedatabase", href: pathname }];
  if (pathname === "/jordbrug/afgroder/ny")
    return [{ label: "Afgrødedatabase", href: "/jordbrug/afgroder" }, { label: "Ny sort", href: pathname }];
  if (pathname.match(/^\/jordbrug\/afgroder\/[^/]+$/))
    return [{ label: "Afgrødedatabase", href: "/jordbrug/afgroder" }, { label: "Sort", href: pathname }];
  if (pathname === "/jordbrug/bede")
    return [{ label: "Jordbrug", href: "/jordbrug" }, { label: "Bede", href: pathname }];
  if (pathname === "/jordbrug/bede/kort")
    return [{ label: "Bede", href: "/jordbrug/bede" }, { label: "Kortvisning", href: pathname }];
  if (pathname === "/jordbrug/bede/ny")
    return [{ label: "Bede", href: "/jordbrug/bede" }, { label: "Nyt bed", href: pathname }];
  if (pathname.match(/^\/jordbrug\/bede\/[^/]+$/))
    return [{ label: "Bede", href: "/jordbrug/bede" }, { label: "Bed", href: pathname }];
  if (pathname === "/jordbrug/polytunnel")
    return [{ label: "Jordbrug", href: "/jordbrug" }, { label: "Polytunnel", href: pathname }];
  if (pathname === "/jordbrug/polytunnel/ny")
    return [{ label: "Polytunnel", href: "/jordbrug/polytunnel" }, { label: "Ny polytunnel", href: pathname }];
  if (pathname.match(/^\/jordbrug\/polytunnel\/[^/]+$/))
    return [{ label: "Polytunnel", href: "/jordbrug/polytunnel" }, { label: "Polytunnel", href: pathname }];
  if (pathname === "/jordbrug/frugtplantage")
    return [{ label: "Jordbrug", href: "/jordbrug" }, { label: "Frugtplantage", href: pathname }];
  if (pathname === "/jordbrug/kompost")
    return [{ label: "Jordbrug", href: "/jordbrug" }, { label: "Kompost", href: pathname }];
  if (pathname === "/jordbrug/fro")
    return [{ label: "Jordbrug", href: "/jordbrug" }, { label: "Frø og forspiring", href: pathname }];

  // Planlæg / tools
  if (pathname.match(/^\/tools\/.+$/))
    return [{ label: "Planlæg", href: "/tools" }, { label: "Værktøj", href: pathname }];

  // Indstillinger
  if (pathname === "/settings")
    return [{ label: "Indstillinger", href: "/settings" }];

  // Topniveau
  const topLabels: Record<string, string> = {
    "/dashboard":    "Oversigt",
    "/animals":      "Dyr",
    "/drift":        "Drift",
    "/rotation":     "Rotation",
    "/pastures":     "Marker",
    "/jordbrug":     "Jordbrug",
    "/tools":        "Planlæg",
    "/biodiversitet":"Natur",
    "/om":           "Om Tend",
  };
  const base = "/" + pathname.split("/")[1];
  return [{ label: topLabels[base] ?? "Tend", href: base }];
}

export default function TopBar() {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname);
  const isDeep = crumbs.length > 1;
  const parent = isDeep ? crumbs[crumbs.length - 2] : null;
  const current = crumbs[crumbs.length - 1];

  return (
    <header
      className="sticky top-0 z-10"
      style={{
        background: "#151a10",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-2">

        {isDeep ? (
          <>
            <Link
              href={parent!.href}
              className="flex items-center gap-1 transition-colors py-1 pr-1 flex-shrink-0 hover:opacity-80"
              style={{ color: "var(--text-muted)" }}
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
              <span className="text-sm font-medium">{parent!.label}</span>
            </Link>
            <span className="flex-shrink-0" style={{ color: "rgba(255,255,255,0.15)" }}>/</span>
            <span className="font-semibold truncate" style={{ color: "var(--text)" }}>
              {current.label}
            </span>
          </>
        ) : (
          <Link href="/dashboard" className="flex flex-col leading-none gap-0.5 hover:opacity-80 transition-opacity">
            <span className="text-base font-semibold tracking-tight" style={{ color: "var(--text)" }}>
              Tend
            </span>
            <span
              className="text-[10px] font-medium tracking-widest uppercase"
              style={{ color: "var(--text-subtle)" }}
            >
              {current.label}
            </span>
          </Link>
        )}

        <Link
          href="/settings"
          className="ml-auto p-1.5 rounded-lg transition-opacity hover:opacity-70 flex-shrink-0"
          style={{ color: pathname === "/settings" ? "var(--text)" : "var(--text-subtle)" }}
          aria-label="Indstillinger"
        >
          <Settings size={20} strokeWidth={1.6} />
        </Link>
      </div>
    </header>
  );
}
