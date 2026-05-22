import { GroupColor } from "@/types";

export const GROUP_COLORS: Record<GroupColor, { bg: string; text: string; border: string; dot: string }> = {
  grass:  { bg: "bg-grass-100",  text: "text-grass-800",  border: "border-grass-300",  dot: "bg-grass-500" },
  amber:  { bg: "bg-amber-100",  text: "text-amber-800",  border: "border-amber-300",  dot: "bg-amber-500" },
  sky:    { bg: "bg-sky-100",    text: "text-sky-800",    border: "border-sky-300",    dot: "bg-sky-500" },
  earth:  { bg: "bg-earth-200",  text: "text-earth-800",  border: "border-earth-300",  dot: "bg-earth-500" },
  red:    { bg: "bg-red-100",    text: "text-red-800",    border: "border-red-300",    dot: "bg-red-500" },
  purple: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300", dot: "bg-purple-500" },
};

export const SPECIES_ICONS: Record<string, string> = {
  sheep: "🐑",
  cattle: "🐄",
  goats: "🐐",
  chickens: "🐓",
  pigs: "🐖",
  other: "🐾",
};

export const SPECIES_LSU: Record<string, number> = {
  sheep: 65 / 500,
  cattle: 1.0,
  goats: 50 / 500,
  chickens: 2 / 500,
  pigs: 100 / 500,
  other: 65 / 500,
};
