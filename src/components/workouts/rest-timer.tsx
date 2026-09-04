"use client";

import { cn } from "@/lib/utils";

interface RestTimerProps {
  remaining: number;
  total: number;
  onSkip: () => void;
}

export default function RestTimer({ remaining, total, onSkip }: RestTimerProps) {
  const pct = ((total - remaining) / total) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="rounded-2xl border-2 border-fitness-500/30 bg-fitness-500/5 p-6 text-center">
      <div className="text-sm text-muted-foreground mb-2">Rest Period</div>
      <div className="text-5xl font-mono font-bold text-fitness-500 mb-4">
        {mins}:{secs.toString().padStart(2, "0")}
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-fitness-500 transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>
      <button
        onClick={onSkip}
        className="rounded-xl border border-border px-6 py-2 text-sm font-medium hover:bg-muted transition-colors"
      >
        Skip Rest
      </button>
    </div>
  );
}
