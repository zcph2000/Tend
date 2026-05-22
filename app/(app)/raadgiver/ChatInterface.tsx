"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTED = [
  "Hvad er den bedste rotationsplan for mine flokke lige nu?",
  "Hvornår bør jeg sætte vædderne til i år?",
  "Hvilke lam er sandsynligvis klar til slagtning snart?",
  "Lav en overordnet plan for resten af sæsonen",
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  async function send(content: string) {
    if (!content.trim() || loading) return;

    const userMsg: Message = { role: "user", content: content.trim() };
    const next = [...messages, userMsg];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok) throw new Error("Fejl");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        const current = text;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: current };
          return updated;
        });
      }
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

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 7rem)" }}>

      {/* Beskedstrøm */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-3">
        {messages.length === 0 ? (
          <div className="space-y-3">
            {/* Velkomst */}
            <div className="card bg-gradient-to-br from-grass-600 to-grass-800 text-white border-0">
              <p className="text-grass-200 text-xs font-medium uppercase tracking-wide">
                AI Rådgiver
              </p>
              <p className="font-bold text-lg mt-1">
                Hvad vil du arbejde med i dag?
              </p>
              <p className="text-grass-300 text-sm mt-1 leading-snug">
                Jeg har adgang til din gårds data og kan hjælpe med
                planlægning, rotation, avl, slagtning og meget mere.
              </p>
            </div>

            {/* Foreslåede spørgsmål */}
            <p className="text-xs font-semibold text-earth-400 uppercase tracking-wide px-1">
              Forslag til at komme i gang
            </p>
            {SUGGESTED.map((q, i) => (
              <button
                key={i}
                onClick={() => send(q)}
                className="w-full text-left card hover:shadow-md transition-shadow py-3 group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-grass-500 group-hover:text-grass-700 transition-colors flex-shrink-0">
                    →
                  </span>
                  <p className="text-sm font-medium text-earth-800">{q}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-grass-600 text-white rounded-br-sm"
                    : "bg-white border border-earth-100 text-earth-800 rounded-bl-sm shadow-sm"
                }`}
              >
                {msg.content ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                ) : (
                  /* Loading dots */
                  <div className="flex gap-1.5 py-1 px-1">
                    {[0, 150, 300].map((delay) => (
                      <span
                        key={delay}
                        className="w-2 h-2 bg-earth-300 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-earth-100 pt-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            className="flex-1 input resize-none py-2.5 leading-snug"
            style={{ minHeight: "44px", maxHeight: "120px" }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Skriv et spørgsmål..."
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
        <p className="text-[10px] text-earth-300 mt-1.5 text-center">
          Enter sender · Shift+Enter linjeskift
        </p>
      </div>
    </div>
  );
}
