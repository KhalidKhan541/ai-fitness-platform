"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ActiveSet } from "@/types";

interface SetRowProps {
  set: ActiveSet;
  exerciseIndex: number;
  setIndex: number;
  onComplete: (data: { reps?: number; weight?: number; duration?: number }) => void;
}

export default function SetRow({ set, exerciseIndex, setIndex, onComplete }: SetRowProps) {
  const [reps, setReps] = useState(set.reps?.toString() || "");
  const [weight, setWeight] = useState(set.weight?.toString() || "");

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl p-3 transition-colors",
        set.completed
          ? "bg-fitness-500/10 border border-fitness-500/20"
          : set.isCurrent
          ? "bg-muted border border-border"
          : "bg-muted/30"
      )}
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
        set.completed ? "bg-fitness-500 text-white" : "bg-muted text-muted-foreground"
      }`}>
        {set.completed ? "✓" : set.setNumber}
      </div>

      <div className="flex-1 grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">Reps</div>
          <input
            type="number"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            disabled={set.completed}
            placeholder="--"
            className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-fitness-500/50 disabled:opacity-50"
          />
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-0.5">Weight (lbs)</div>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            disabled={set.completed}
            placeholder="--"
            className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-fitness-500/50 disabled:opacity-50"
          />
        </div>
      </div>

      {!set.completed && set.isCurrent && (
        <button
          onClick={() =>
            onComplete({
              reps: reps ? parseInt(reps) : undefined,
              weight: weight ? parseFloat(weight) : undefined,
            })
          }
          className="h-8 rounded-lg bg-fitness-600 px-3 text-xs font-medium text-white hover:bg-fitness-700 transition-colors shrink-0"
        >
          Done
        </button>
      )}

      {set.completed && (
        <span className="text-xs text-fitness-500 font-medium shrink-0">Done</span>
      )}
    </div>
  );
}
