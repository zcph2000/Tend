import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function daysSince(date: string | Date): number {
  const d = new Date(date);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function daysUntil(date: string | Date): number {
  const d = new Date(date);
  const now = new Date();
  return Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================
// Holistic Management / AMP grazing beregninger
// Baseret på Savory Institute principper
// ============================================

// LSU (Livestock Unit) konvertering
// Standard: 1 LSU = 500kg dyr
const LSU_WEIGHTS: Record<string, number> = {
  sheep: 65,    // gennemsnitlig ø
  cattle: 500,
  goats: 50,
  pigs: 100,
  chickens: 2,
  other: 65,
};

export function toLSU(species: string, count: number): number {
  const weight = LSU_WEIGHTS[species] ?? 65;
  return (weight / 500) * count;
}

export interface GrazingRecommendation {
  grazeDays: number;           // Anbefalede græsdage
  restDays: number;            // Anbefalede hviledage
  stockingDensity: number;     // Aktuel tæthed (dyr/ha)
  lsuPerHa: number;            // LSU pr. hektar
  densityStatus: "low" | "ok" | "high";
  advice: string;              // Natursproglig anbefaling
  shouldMove: boolean;         // Skal flokken flyttes nu?
}

export function getGrazingRecommendation(
  areaHa: number,
  animalCount: number,
  daysGrazed: number,
  month: number,
  species = "sheep"
): GrazingRecommendation {
  // Hvileperiode baseret på sæson (tempereret klima, Danmark)
  let restDays: number;
  if (month >= 5 && month <= 8) restDays = 30;       // Sommer: hurtig vækst
  else if (month >= 4 && month <= 4) restDays = 45;  // Forår
  else if (month >= 3 && month <= 3) restDays = 50;  // Tidligt forår
  else if (month >= 9 && month <= 10) restDays = 55; // Efterår
  else restDays = 90;                                 // Vinter: langsom vækst

  // Tæthed
  const stockingDensity = areaHa > 0 ? animalCount / areaHa : 0;
  const lsuPerHa = toLSU(species, animalCount) / (areaHa || 1);

  // AMP grazing: altid max 4 dage på samme sektion (undgår selektiv afgræsning)
  // Minimum tæthed for mob grazing effekt: ~5 dyr/ha (eller 0.65 LSU/ha)
  const MIN_DENSITY = 5;
  const IDEAL_DENSITY_MIN = 10;

  let densityStatus: "low" | "ok" | "high";
  let advice: string;
  let grazeDays: number;

  const MIN_ABSOLUTE = 5; // Minimum antal dyr for meningsfuld mob-græsning

  if (animalCount < MIN_ABSOLUTE) {
    // For få dyr til meningsfuld mob-græsning uanset tæthed
    densityStatus = "low";
    grazeDays = 5;
    advice = `${animalCount} dyr er for lidt til effektiv mob-græsning uanset sektionsstørrelse — selv om tætheden ser ok ud (${stockingDensity.toFixed(1)} dyr/ha). Min. ${MIN_ABSOLUTE} dyr anbefales for at opnå den trample- og afgræsningseffekt der kendetegner holistic management.`;
  } else if (stockingDensity < MIN_DENSITY) {
    densityStatus = "low";
    grazeDays = Math.min(7, Math.max(3, Math.round(areaHa / (animalCount * 0.05))));
    advice = `Tætheden er for lav (${stockingDensity.toFixed(1)} dyr/ha). For effektiv mob-græsning anbefales min. ${MIN_DENSITY} dyr/ha. Gør sektionen mindre — se "Optimal sektionsplan" nedenfor.`;
  } else if (stockingDensity < IDEAL_DENSITY_MIN) {
    densityStatus = "ok";
    grazeDays = 4;
    advice = `Tætheden er acceptabel (${stockingDensity.toFixed(1)} dyr/ha). Flyt flokken efter 4 dage for at undgå selektiv afgræsning.`;
  } else {
    densityStatus = "high";
    grazeDays = 2;
    advice = `God mob-græsning tæthed (${stockingDensity.toFixed(1)} dyr/ha). Flyt flokken efter 2-3 dage — græsset er under højt tryk.`;
  }

  const shouldMove = daysGrazed >= grazeDays;

  if (shouldMove && densityStatus !== "low") {
    advice = `⚠️ Flokken har været her ${daysGrazed} dage — tid til at flytte! ${advice}`;
  }

  return {
    grazeDays,
    restDays,
    stockingDensity,
    lsuPerHa,
    densityStatus,
    advice,
    shouldMove,
  };
}

// Beregn anbefalet antal sektioner ud fra LSU og areal
export function getRecommendedSectionCount(
  totalHa: number,
  animalCount: number,
  month: number,
  species = "sheep"
): number {
  const rec = getGrazingRecommendation(totalHa / 8, animalCount, 0, month, species);
  return Math.max(6, Math.ceil(rec.restDays / rec.grazeDays));
}

// Beregn praktisk rotationsplan ud fra faktisk areal og flokstørrelse
export interface SectionSizeRecommendation {
  // Primær anbefaling (20 dyr/ha)
  sectionHa: number;
  sectionsInLand: number;
  sectionsIdeal: number;
  actualRestDays: number;
  idealRestDays: number;
  grazeDays: number;
  surplusHa: number;
  verdict: "good" | "ok" | "tight" | "toofew";
  // Alternativ: mindre sektioner for at ramme ideal hviletid med dit areal
  altSectionHa: number | null;   // Sektionsstørrelse der giver idealRestDays
  altDensity: number | null;     // Tæthed ved alternativ sektionsstørrelse
  altFeasible: boolean;          // Om alternativet er realistisk (< 150 dyr/ha)
}

export function getOptimalSectionSize(
  totalHa: number,
  animalCount: number,
  month: number,
  species = "sheep",
  targetDensity = 20
): SectionSizeRecommendation {
  let idealRestDays: number;
  if (month >= 5 && month <= 8) idealRestDays = 30;
  else if (month >= 3 && month <= 4) idealRestDays = 45;
  else if (month >= 9 && month <= 10) idealRestDays = 55;
  else idealRestDays = 90;

  const grazeDays = 3;

  // Primær: sektionsstørrelse ved target-tæthed (20 dyr/ha)
  const sectionHa = Math.max(0.05, animalCount / targetDensity);
  const sectionsInLand = Math.max(2, Math.floor(totalHa / sectionHa));
  const sectionsIdeal = Math.ceil(idealRestDays / grazeDays) + 1;
  const actualRestDays = (sectionsInLand - 1) * grazeDays;
  const surplusHa = Math.max(0, totalHa - sectionsIdeal * sectionHa);

  const restRatio = actualRestDays / idealRestDays;
  let verdict: SectionSizeRecommendation["verdict"];
  if (animalCount < 5) verdict = "toofew";
  else if (restRatio >= 0.9) verdict = "good";
  else if (restRatio >= 0.6) verdict = "ok";
  else verdict = "tight";

  // Alternativ: beregn den sektionsstørrelse der netop giver idealRestDays
  // For at opnå idealRestDays med grazeDays: n = idealRestDays/grazeDays + 1 sektioner
  // Sektionsstørrelse = totalHa / n
  let altSectionHa: number | null = null;
  let altDensity: number | null = null;
  let altFeasible = false;

  if (verdict === "tight" || verdict === "ok") {
    const sectionsNeeded = Math.ceil(idealRestDays / grazeDays) + 1;
    const alt = totalHa / sectionsNeeded;
    const density = animalCount / alt;
    altSectionHa = Math.round(alt * 10000) / 10000; // 4 decimaler → vis i m²
    altDensity = Math.round(density);
    altFeasible = density <= 150; // Over 150 dyr/ha er urealistisk
  }

  return {
    sectionHa: Math.round(sectionHa * 100) / 100,
    sectionsInLand,
    sectionsIdeal,
    actualRestDays,
    idealRestDays,
    grazeDays,
    surplusHa: Math.round(surplusHa * 100) / 100,
    verdict,
    altSectionHa,
    altDensity,
    altFeasible,
  };
}

// Bagudkompatibel wrapper
export function getRecommendedGrazingDays(
  areaHa: number,
  animalCount: number,
  month: number
): { graze: number; rest: number } {
  const rec = getGrazingRecommendation(areaHa, animalCount, 0, month, "sheep");
  return { graze: rec.grazeDays, rest: rec.restDays };
}

export function getSectionCount(totalHa: number, animalCount: number): number {
  const month = new Date().getMonth() + 1;
  return getRecommendedSectionCount(totalHa, animalCount, month);
}
