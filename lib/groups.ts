import { GroupColor } from "@/types";
import { PawPrint, Bird, type LucideIcon } from "lucide-react";

export const SPECIES_ICONS: Record<string, LucideIcon> = {
  sheep:    PawPrint,
  cattle:   PawPrint,
  goats:    PawPrint,
  chickens: Bird,
  pigs:     PawPrint,
  other:    PawPrint,
};

export const GROUP_COLORS: Record<GroupColor, { bg: string; text: string; border: string; dot: string }> = {
  grass:  { bg: "bg-earth-800", text: "text-earth-200", border: "border-earth-700", dot: "bg-grass-500"  },
  amber:  { bg: "bg-earth-800", text: "text-earth-200", border: "border-earth-700", dot: "bg-amber-500"  },
  sky:    { bg: "bg-earth-800", text: "text-earth-200", border: "border-earth-700", dot: "bg-sky-500"    },
  earth:  { bg: "bg-earth-800", text: "text-earth-200", border: "border-earth-700", dot: "bg-earth-400"  },
  red:    { bg: "bg-earth-800", text: "text-earth-200", border: "border-earth-700", dot: "bg-red-500"    },
  purple: { bg: "bg-earth-800", text: "text-earth-200", border: "border-earth-700", dot: "bg-purple-500" },
};


export const SPECIES_LSU: Record<string, number> = {
  sheep: 65 / 500,
  cattle: 1.0,
  goats: 50 / 500,
  chickens: 2 / 500,
  pigs: 100 / 500,
  other: 65 / 500,
};
