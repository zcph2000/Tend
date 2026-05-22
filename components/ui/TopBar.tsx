"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  // Rotation planner
  if (pathname === "/rotation/planner")
    return [{ label: "Planlæg", href: "/tools" }, { label: "Rotationsplanlægger", href: pathname }];

  // Marker
  if (pathname.match(/^\/pastures\/[^/]+$/))
    return [{ label: "Marker", href: "/pastures" }, { label: "Mark", href: pathname }];

  // Planlæg / tools
  if (pathname.match(/^\/tools\/.+$/))
    return [{ label: "Planlæg", href: "/tools" }, { label: "Værktøj", href: pathname }];

  // Indstillinger
  if (pathname === "/settings")
    return [{ label: "Indstillinger", href: "/settings" }];

  // Topniveau
  const topLabels: Record<string, string> = {
    "/dashboard": "Oversigt",
    "/animals": "Dyr",
    "/drift": "Drift",
    "/rotation": "Rotation",
    "/pastures": "Marker",
    "/tools": "Planlæg",
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
    <header className="bg-white border-b border-earth-100 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-2">

        {isDeep ? (
          <>
            <Link
              href={parent!.href}
              className="flex items-center gap-1 text-earth-400 hover:text-earth-700 transition-colors py-1 pr-1 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">{parent!.label}</span>
            </Link>
            <span className="text-earth-200 flex-shrink-0">/</span>
            <span className="font-semibold text-earth-800 truncate">{current.label}</span>
          </>
        ) : (
          <>
            <span className="text-xl flex-shrink-0">🌿</span>
            <span className="font-semibold text-grass-800">{current.label}</span>
          </>
        )}

        {/* Gear-ikon til Indstillinger */}
        <Link
          href="/settings"
          className={`ml-auto p-1.5 rounded-lg transition-colors flex-shrink-0 ${
            pathname === "/settings"
              ? "text-grass-700 bg-grass-50"
              : "text-earth-300 hover:text-earth-600"
          }`}
          aria-label="Indstillinger"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
