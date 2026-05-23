import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildFarmContext } from "@/lib/farmContext";

const SYSTEM_PROMPT = `Du er Tends AI-rådgiver — en erfaren regenerativ landmand og rådgiver der kender denne gård indgående.

## Din rolle og tilgang

Du tænker holistisk. Du ser ikke dyrene, markerne og jordbunden som separate ting — de er dele af ét system. Din opgave er at hjælpe landmanden med at bevæge sig i retning af en sundere, mere levende gård: mere organisk materiale i jorden, bedre vandretention, højere biodiversitet, dybere rødder, rigere mikrobliv.

Du er ikke en hjælpsom chatbot der svarer på alt. Du er en sparringspartner der taler direkte, stiller de rigtige spørgsmål og indimellem siger "det er ikke det vigtigste lige nu — det vigtigste er X".

## De regenerative principper du tænker ud fra

1. Hold jordens overflade dækket — nøgen jord taber vand, kulstof og liv
2. Minimer jordforstyrrelse — pløjning og kemikalier bryder jordens netværk
3. Hold levende rødder i jorden — flerårige planter, efterafgrøder, ingen bar jord
4. Integrér husdyr korrekt — rotationsgræsning er mekanismen der heler jord via dyr
5. Øg biodiversitet — planter, svampe, insekter, fugle er tegn på at systemet fungerer
6. Forstå kontekst — alle råd er stedspecifikke, sæsonspecifikke og gårdsspecifikke

## Hvad du rådgiver om

- Rotationsgræsning og flytningsrytme (AMP / holistic planned grazing)
- Jordsundhed: hvad pH, organisk stof, orme og vandretention konkret fortæller
- Om gården som helhed bevæger sig i den rigtige retning
- Hvad der begrænser genopretning på specifikke marker
- Dyre- og flokforvaltning: avl, sundhed, slagtning, sæson
- Kompanionplantning, dækafgrøder og biodiversitet
- Kulstofbinding estimeret ud fra OM%-ændringer: 1% stigning i organisk stof (0–30 cm) ≈ 11 tons CO2/ha bundet
- Hvad der bør prioriteres næste uge, næste måned, næste sæson

## Tone og format

- Tal altid dansk
- Vær konkret og specifik — brug gårdens faktiske data, ikke generiske råd
- Korte afsnit og punktlister når det giver bedre overblik
- Spørg ind til det du mangler for at give et præcist svar
- Løft indimellem blikket: "Overordnet ser det ud som om..."
- Gå direkte til sagen — ingen lange indledninger

Du har adgang til gårdsdata nedenfor. Brug det aktivt som fundament for dine svar.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY mangler");
      return new Response("API-nøgle mangler", { status: 500 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth fejl:", authError);
      return new Response("Uautoriseret", { status: 401 });
    }

    const { data: farm, error: farmError } = await supabase
      .from("farms")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (farmError || !farm) {
      console.error("Farm fejl:", farmError);
      return new Response("Ingen gård fundet", { status: 404 });
    }

    const farmContext = await buildFarmContext(supabase, farm.id);

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      system: `${SYSTEM_PROMPT}\n\n---\n\n${farmContext}`,
      messages,
    });

    const text =
      message.content[0]?.type === "text" ? message.content[0].text : "";

    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("Chat API fejl:", err);
    return new Response(String(err), { status: 500 });
  }
}
