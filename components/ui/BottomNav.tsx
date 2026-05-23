"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, PawPrint, ClipboardList, Map, Compass } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Oversigt", Icon: LayoutDashboard },
  { href: "/animals",   label: "Dyr",      Icon: PawPrint },
  { href: "/drift",     label: "Drift",    Icon: ClipboardList },
  { href: "/pastures",  label: "Marker",   Icon: Map },
  { href: "/tools",     label: "Planlæg",  Icon: Compass },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 pb-safe z-10"
      style={{
        background: "#151a10",
        borderTop: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="max-w-2xl mx-auto flex">
        {nav.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2.5 px-1 transition-colors relative",
                active ? "text-earth-50" : "text-earth-400"
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-clay-500 rounded-full" />
              )}
              <Icon size={20} strokeWidth={active ? 2 : 1.5} />
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
