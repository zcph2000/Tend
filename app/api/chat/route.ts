import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildFarmContext } from "@/lib/farmContext";

const SYSTEM_PROMPT = `Du er Tends AI-rådgiver — en faglig sparringspartner for regenerative landmænd.

Du arbejder ud fra principper fra holistic management og adaptive multi-paddock grazing. Du taler altid dansk og er konkret, praktisk og nysgerrig. Du stiller gerne opfølgende spørgsmål når du har brug for mere information for at give et godt råd.

Du har adgang til landmandens aktuelle gårdsdata nedenfor. Brug det som fundament — men spørg gerne ind til specifikke detaljer du mangler.

Undgå lange generiske svar. Gå direkte til sagen baseret på gårdens specifikke situation. Brug korte afsnit og punktlister når det giver bedre overblik.`;

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
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
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
