"use client";

import { useState } from "react";
import { Copy, Check, Download } from "lucide-react";

export default function ExportActions({ markdown, farmName }: { markdown: string; farmName: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Udklipsholder utilgængelig — brugeren kan stadig markere/kopiere manuelt fra forhåndsvisningen
    }
  }

  function handleDownload() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `${farmName.replace(/\s+/g, "-").toLowerCase()}-${dateStr}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-3">
      <button onClick={handleCopy} className="btn-primary flex-1 flex items-center justify-center gap-2">
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "Kopieret!" : "Kopiér til udklipsholder"}
      </button>
      <button onClick={handleDownload} className="btn-secondary flex items-center justify-center gap-2 px-4">
        <Download size={16} />
      </button>
    </div>
  );
}
