import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildFarmContext } from "@/lib/farmContext";

const SYSTEM_PROMPT = `Du er Tends AI-rådgiver — en faglig sparringspartner for regenerative landmænd.

Du arbejder ud fra principper fra holistic management og adaptive multi-paddock grazing. Du taler altid dansk og er konkret, praktisk og nysgerrig. Du stiller gerne opfølgende spørgsmål når du har brug for mere information for at give et godt råd.

Du har adgang til landmandens aktuelle gårdsdata nedenfor. Brug det som fundament — men spørg gerne ind til specifikke detaljer du mangler.

Undgå lange generiske svar. Gå direkte til sagen baseret på gårdens specifikke situation. Brug korte afsnit og punktlister når det giver bedre overblik.`;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Uautoriseret", { status: 401 });

  const { data: farm } = await supabase
    .from("farms")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!farm) return new Response("Ingen gård fundet", { status: 404 });

  const farmContext = await buildFarmContext(supabase, farm.id);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const stream = anthropic.messages.stream({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1500,
    system: `${SYSTEM_PROMPT}\n\n---\n\n${farmContext}`,
    messages,
  });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
