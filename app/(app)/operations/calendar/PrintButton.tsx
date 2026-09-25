"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
    >
      <Printer size={13} />
      Print månedsoversigt
    </button>
  );
}
