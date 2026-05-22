"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Oversigt",  icon: "🏡" },
  { href: "/animals",   label: "Dyr",       icon: "🐑" },
  { href: "/drift",     label: "Drift",     icon: "🔄" },
  { href: "/pastures",  label: "Marker",    icon: "🗺️" },
  { href: "/tools",     label: "Planlæg",   icon: "📐" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-earth-100 pb-safe z-10">
      <div className="max-w-2xl mx-auto flex">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center gap-0.5 py-2 px-1 transition-colors relative",
                active ? "text-grass-700" : "text-earth-400 hover:text-earth-600"
              )}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className={cn(
                "text-[10px] font-medium",
                active ? "text-grass-700" : "text-earth-400"
              )}>
                {item.label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-grass-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
