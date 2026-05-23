"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatInterface({
  userId,
  farmId,
}: {
  userId: string;
  farmId: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  // Indlæs beskeder fra Supabase ved første render
  useEffect(() => {
    async function loadHistory() {
      const { data } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("user_id", userId)
        .eq("farm_id", farmId)
        .order("created_at", { ascending: true })
        .limit(60);

      if (data && data.length > 0) {
        setMessages(data as Message[]);
        setHydrated(true);
      } else {
        // Ingen historik — kør automatisk briefing
        setHydrated(true);
        await sendBriefing();
      }
    }
    loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, farmId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [input]);

  async function saveMessages(msgs: { role: string; content: string }[]) {
    if (!msgs.length) return;
    await supabase.from("chat_messages").insert(
      msgs.map((m) => ({
        user_id: userId,
        farm_id: farmId,
        role: m.role,
        content: m.content,
      }))
    );
  }

  async function clearConversation() {
    await supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", userId)
      .eq("farm_id", farmId);
    setMessages([]);
    await sendBriefing();
  }

  // Streamer et svar fra /api/chat og returnerer den fulde tekst
  async function streamResponse(
    body: object,
    onChunk: (accumulated: string) => void
  ): Promise<string> {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => "Fejl");
      throw new Error(errText);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value, { stream: true });
      onChunk(accumulated);
    }

    return accumulated;
  }

  // Auto-briefing: kaldes ved tom historik eller efter sletning
  async function sendBriefing() {
    setLoading(true);
    setMessages([{ role: "assistant", content: "" }]);

    try {
      const text = await streamResponse({ briefing: true }, (accumulated) => {
        setMessages([{ role: "assistant", content: accumulated }]);
      });

      await saveMessages([{ role: "assistant", content: text }]);
    } catch {
      setMessages([{
        role: "assistant",
        content: "Kunne ikke hente gårdsoverblik — prøv at genindlæse siden.",
      }]);
    }

    setLoading(false);
  }

  async function send(content: string) {
    if (!content.trim() || loading) return;

    const userMsg: Message = { role: "user", content: content.trim() };
    const next = [...messages, userMsg];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    await saveMessages([userMsg]);

    try {
      const text = await streamResponse(
        { messages: next.slice(-20) },
        (accumulated) => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: accumulated };
            return updated;
          });
        }
      );

      await saveMessages([{ role: "assistant", content: text }]);
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Noget gik galt — prøv igen.",
        };
        return updated;
      });
    }

    setLoading(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  if (!hydrated) return null;

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 7rem)" }}>

      {/* Beskedstrøm */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-clay-600 text-white rounded-br-sm"
                  : "bg-earth-800 border border-white/10 text-earth-100 rounded-bl-sm"
              }`}
            >
              {msg.content ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
              ) : (
                <div className="flex gap-1.5 py-1 px-1">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="w-2 h-2 bg-earth-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Ryd samtale */}
        {messages.length > 0 && !loading && (
          <div className="flex justify-center pt-2">
            <button
              onClick={clearConversation}
              className="flex items-center gap-1.5 text-xs text-earth-500 hover:text-earth-300 transition-colors py-1 px-3"
            >
              <Trash2 size={11} />
              Ryd samtale og få nyt overblik
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 pt-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            className="flex-1 input resize-none py-2.5 leading-snug"
            style={{ minHeight: "44px", maxHeight: "120px" }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Stil et spørgsmål eller bed om råd..."
            rows={1}
            disabled={loading}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="btn-primary px-4 py-2.5 flex-shrink-0 disabled:opacity-40 disabled:cursor-default"
          >
            Send
          </button>
        </div>
        <p className="text-[10px] text-earth-400 mt-1.5 text-center">
          Enter sender · Shift+Enter linjeskift · Samtalen huskes på tværs af enheder
        </p>
      </div>
    </div>
  );
}
