"use client";

import { cn } from "@/lib/utils";

interface WaterTrackerProps {
  current: number;
  goal: number;
  onIncrement: () => void;
  onDecrement: () => void;
  className?: string;
}

export default function WaterTracker({ current, goal, onIncrement, onDecrement, className }: WaterTrackerProps) {
  const pct = Math.min((current / goal) * 100, 100);

  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card p-5", className)}>
      <h3 className="text-sm font-semibold mb-4">Water Intake</h3>
      <div className="flex items-center justify-center gap-6">
        <div className="relative h-24 w-24">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none" stroke="#0ea5e9" strokeWidth="3"
              strokeDasharray={`${(pct / 100) * 2 * Math.PI * 15.9} ${2 * Math.PI * 15.9}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xl font-bold text-energy-500">{current}</div>
              <div className="text-[10px] text-muted-foreground">glasses</div>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            {current} / {goal} glasses
          </div>
          <div className="flex gap-2">
            <button
              onClick={onDecrement}
              disabled={current <= 0}
              className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              -
            </button>
            <button
              onClick={onIncrement}
              disabled={current >= goal}
              className="h-8 w-8 rounded-lg bg-energy-500 text-white flex items-center justify-center hover:bg-energy-600 transition-colors disabled:opacity-50"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
