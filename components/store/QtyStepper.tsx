"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QtyStepper({
  value,
  onChange,
  max,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  max: number;
  size?: "sm" | "md";
}) {
  const btn = size === "sm" ? "h-7 w-7" : "h-10 w-10";
  return (
    <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        className={cn(btn, "grid place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 disabled:opacity-30")}
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="Disminuir cantidad"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className={cn("min-w-8 text-center font-mono tabular-nums", size === "sm" ? "text-xs" : "text-sm")} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={cn(btn, "grid place-items-center rounded-full text-zinc-300 transition hover:bg-white/10 disabled:opacity-30")}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Aumentar cantidad"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
