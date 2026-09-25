import type { Species, EventType } from "@/types";

// Delt kilde til alle art-afhængige tekster i dyre-delen af appen.
// Erstatter tidligere kopier i dashboard/page.tsx, animals/[id]/page.tsx,
// AddEventButton.tsx, farmContext.ts og groups/page.tsx.

export const SPECIES_LABELS: Record<Species, string> = {
  sheep: "Får",
  cattle: "Kvæg",
  goats: "Geder",
  chickens: "Høns",
  pigs: "Svin",
  other: "Andet",
};

// Arter der registreres som flok (antal), ikke ét kort pr. individ.
export const IS_BATCH_SPECIES: ReadonlySet<Species> = new Set(["chickens"]);

export function isBatchSpecies(species: Species): boolean {
  return IS_BATCH_SPECIES.has(species);
}

export const SEX_LABELS: Record<Species, { female: string; male: string; castrated: string; unknown: string }> = {
  sheep:    { female: "Får",  male: "Vædder", castrated: "Kastreret", unknown: "Ukendt" },
  cattle:   { female: "Ko",   male: "Tyr",    castrated: "Kastreret", unknown: "Ukendt" },
  goats:    { female: "Ged",  male: "Buk",    castrated: "Kastreret", unknown: "Ukendt" },
  pigs:     { female: "So",   male: "Orne",   castrated: "Kastreret", unknown: "Ukendt" },
  chickens: { female: "Høne", male: "Hane",   castrated: "Kastreret", unknown: "Ukendt" },
  other:    { female: "Hun",  male: "Han",    castrated: "Kastreret", unknown: "Ukendt" },
};

// Betegnelse for unge/afkom — bruges kun for individdyr (flokdyr har ikke
// individuelle fødselsdatoer at regne alder ud fra).
export const YOUNG_LABEL: Record<Species, string> = {
  sheep: "Lam",
  cattle: "Kalve",
  goats: "Kid",
  pigs: "Grise",
  chickens: "Kyllinger",
  other: "Unger",
};

export const BREEDING_EVENT_LABEL: Record<Species, string> = {
  sheep: "Sat til vædder",
  cattle: "Sat til tyr",
  goats: "Sat til buk",
  pigs: "Sat til orne",
  chickens: "Parring",
  other: "Parring",
};

export const BIRTH_EVENT_LABEL: Record<Species, string> = {
  sheep: "Lammede",
  cattle: "Kælvede",
  goats: "Kidede",
  pigs: "Farede",
  chickens: "Fik unger",
  other: "Fik unger",
};

const BASE_EVENT_LABELS: Partial<Record<EventType, string>> = {
  vaccination:  "Vaccination",
  worming:      "Ormekur",
  weighing:     "Vejet",
  treatment:    "Behandling",
  observation:  "Observation",
  note:         "Note",
  slaughtering: "Slagtet",
  sale:         "Solgt",
};

export function eventTypeLabel(type: EventType, species: Species): string {
  if (type === "tupping") return BREEDING_EVENT_LABEL[species];
  if (type === "lambing") return BIRTH_EVENT_LABEL[species];
  return BASE_EVENT_LABELS[type] ?? type;
}

// Formål — individdyr bruger de eksisterende avls-orienterede valg;
// flokdyr (høns) sætter formål til kød eller æg.
export const INDIVIDUAL_PURPOSE_OPTIONS = [
  { value: "moderdyr",   label: "Moderdyr" },
  { value: "avlsvædder", label: "Avlshandyr" },
  { value: "opfedning",  label: "Til opfedning / slagtning" },
  { value: "naturpleje", label: "Naturpleje" },
  { value: "salgsdyr",   label: "Til videresalg" },
];

export const BATCH_PURPOSE_OPTIONS = [
  { value: "æg",  label: "Æg" },
  { value: "kød", label: "Kød" },
];
