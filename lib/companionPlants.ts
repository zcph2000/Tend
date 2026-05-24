export type CompanionFeedback = {
  type: "good" | "bad";
  existingCropName: string;
  reason: string;
  suggestion?: string;
};

// [kilde-familie][nabo-familie] → relation
const RULES: Record<string, Record<string, { type: "good" | "bad"; reason: string; suggestion?: string }>> = {
  "Ærtefamilien": {
    "Løgfamilien":         { type: "bad",  reason: "Løg og hvidløg hæmmer bælgplanters rodknolde og kvælstoffiksering" },
    "Korsblomstfamilien":  { type: "good", reason: "Bælgplanter fikserer kvælstof som kål og roer er glade for" },
    "Natskyggefamilien":   { type: "good", reason: "Kvælstoffiksering fra bælgplanter gavner tomater og kartofler", suggestion: "Overvej tomat eller kartoffel i den anden halvdel" },
    "Amarantfamilien":     { type: "good", reason: "Bede og spinat nyder godt af bælgplanters kvælstoffiksering" },
    "Skærmblomstfamilien": { type: "good", reason: "Bælgplanter gavner rodfrugter og urter med kvælstof" },
    "Græskarfamilien":     { type: "good", reason: "Det klassiske 'Three Sisters' — bønner fikserer kvælstof til squashen", suggestion: "Squash eller agurk i den anden halvdel" },
  },
  "Løgfamilien": {
    "Ærtefamilien":        { type: "bad",  reason: "Løg og hvidløg hæmmer bælgplanters vækst og kvælstoffiksering" },
    "Natskyggefamilien":   { type: "good", reason: "Løg holder bladlus og skadedyr fra tomater og pebre" },
    "Korsblomstfamilien":  { type: "good", reason: "Løg holder kålsommerfugle og bladlus fra kål" },
    "Skærmblomstfamilien": { type: "good", reason: "Løg og gulerødder er klassiske ledsagere — holder gulerodfluen på afstand" },
    "Kurvblomstfamilien":  { type: "good", reason: "Løg holder skadedyr fra salat" },
    "Rosenfamilien":       { type: "good", reason: "Løg og hvidløg holder svampesygdomme fra jordbær" },
  },
  "Korsblomstfamilien": {
    "Ærtefamilien":        { type: "good", reason: "Bælgplanter tilfører kvælstof som kål og broccoli elsker", suggestion: "Ærter eller bønner i den anden halvdel" },
    "Løgfamilien":         { type: "good", reason: "Løg holder kålsommerfugle og bladlus på afstand" },
    "Natskyggefamilien":   { type: "bad",  reason: "Kål og tomater deler svampe- og bakteriesygdomme — undgå tæt naboskab" },
    "Kurvblomstfamilien":  { type: "good", reason: "Salat og kål er klassiske naboer — salaten udnytter lyset i kanten godt" },
  },
  "Natskyggefamilien": {
    "Ærtefamilien":        { type: "good", reason: "Bælgplanter fikserer kvælstof som tomater og kartofler er glade for", suggestion: "Bønner eller ærter i den anden halvdel" },
    "Løgfamilien":         { type: "good", reason: "Løg holder bladlus og skadedyr fra tomater og pebre" },
    "Korsblomstfamilien":  { type: "bad",  reason: "Tomater og kål deler sygdomme — undgå tæt naboskab i bedet" },
    "Kurvblomstfamilien":  { type: "good", reason: "Salat trives godt i skyggen af tomatplanter og brænder ikke af" },
  },
  "Kurvblomstfamilien": {
    "Løgfamilien":         { type: "good", reason: "Løg holder skadedyr fra salat" },
    "Natskyggefamilien":   { type: "good", reason: "Salat trives i skyggen af tomatplanter — udnytter pladsen effektivt" },
    "Ærtefamilien":        { type: "good", reason: "Bælgplanter gavner salat med kvælstof" },
    "Korsblomstfamilien":  { type: "good", reason: "Salat og kål er klassiske naboer" },
  },
  "Skærmblomstfamilien": {
    "Løgfamilien":         { type: "good", reason: "Løg og gulerødder er klassiske ledsagere — holder gulerodfluen på afstand" },
    "Ærtefamilien":        { type: "good", reason: "Bælgplanter gavner rodfrugter med kvælstof" },
    "Natskyggefamilien":   { type: "good", reason: "Gulerødder og persillerod trives godt ved tomater" },
  },
  "Græskarfamilien": {
    "Løgfamilien":         { type: "bad",  reason: "Løg og hvidløg hæmmer squash og agurkers vækst" },
    "Ærtefamilien":        { type: "good", reason: "Det klassiske 'Three Sisters': bønner fikserer kvælstof til squashen", suggestion: "Bønner i den anden halvdel — klassisk kombination" },
  },
  "Rosenfamilien": {
    "Løgfamilien":         { type: "good", reason: "Løg og hvidløg holder svampesygdomme fra jordbær" },
    "Ærtefamilien":        { type: "good", reason: "Jordbær nyder godt af kvælstof fra bønner og ærter" },
  },
  "Amarantfamilien": {
    "Ærtefamilien":        { type: "good", reason: "Bede og spinat nyder godt af kvælstof fra bælgplanter" },
    "Korsblomstfamilien":  { type: "good", reason: "God naboskab — bede og kål konkurrerer ikke om de samme ressourcer" },
  },
};

export function getCompanionFeedback(
  newFamily: string | null,
  existingZones: Array<{ family: string | null; cropName: string }>
): CompanionFeedback[] {
  if (!newFamily) return [];
  const myRules = RULES[newFamily];
  if (!myRules) return [];

  return existingZones
    .filter(z => z.family && myRules[z.family])
    .map(z => ({
      type: myRules[z.family!].type,
      existingCropName: z.cropName,
      reason: myRules[z.family!].reason,
      suggestion: myRules[z.family!].suggestion,
    }));
}

// Anslået udbytte pr. plante pr. plantefamilie (kg) — groft estimat
export const YIELD_KG_PER_PLANT: Partial<Record<string, number>> = {
  "Natskyggefamilien": 2.0,    // tomater ~2-4 kg, pebre ~0.5-1 kg
  "Korsblomstfamilien": 1.0,   // kål 0.5-3 kg, broccoli ~0.4 kg
  "Ærtefamilien": 0.3,         // bønner 0.3-0.5 kg, ærter 0.1-0.2 kg
  "Løgfamilien": 0.2,          // løg 0.1-0.3 kg, porrer 0.2-0.3 kg
  "Skærmblomstfamilien": 0.2,  // gulerødder ~0.1 kg/stk, persillerod ~0.2 kg
  "Amarantfamilien": 0.3,      // bede ~0.3 kg/stk
  "Kurvblomstfamilien": 0.3,   // salat ~0.3 kg/hoved
  "Rosenfamilien": 0.3,        // jordbær ~0.3 kg/plant/år
  "Græskarfamilien": 3.0,      // squash 2-5 kg/plant, agurk 2-3 kg
};

// Fallback: anslåede dage fra udplantning til høst pr. familie (når varietet mangler data)
export const HARVEST_DAYS_FROM_TRANSPLANT: Partial<Record<string, number>> = {
  "Natskyggefamilien": 70,
  "Korsblomstfamilien": 70,
  "Ærtefamilien": 65,
  "Løgfamilien": 150,
  "Skærmblomstfamilien": 90,
  "Amarantfamilien": 60,
  "Kurvblomstfamilien": 45,
  "Rosenfamilien": 40,
  "Græskarfamilien": 55,
};
