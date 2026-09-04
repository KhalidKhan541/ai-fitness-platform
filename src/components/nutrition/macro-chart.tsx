import { cn } from "@/lib/utils";
import type { MacroTotals } from "@/types";

interface MacroChartProps {
  current: MacroTotals;
  goal: MacroTotals;
  className?: string;
}

export default function MacroChart({ current, goal, className }: MacroChartProps) {
  const totalGrams = current.protein + current.carbs + current.fat;
  const proteinPct = totalGrams > 0 ? (current.protein / totalGrams) * 100 : 0;
  const carbsPct = totalGrams > 0 ? (current.carbs / totalGrams) * 100 : 0;
  const fatPct = totalGrams > 0 ? (current.fat / totalGrams) * 100 : 0;

  const circumference = 2 * Math.PI * 15.9;
  const proteinDash = (proteinPct / 100) * circumference;
  const carbsDash = (carbsPct / 100) * circumference;
  const fatDash = (fatPct / 100) * circumference;
  const carbsOffset = -(proteinPct / 100) * circumference;
  const fatOffset = -((proteinPct + carbsPct) / 100) * circumference;

  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card p-5", className)}>
      <h3 className="text-sm font-semibold mb-4">Macro Split</h3>
      <div className="flex items-center justify-center gap-6">
        <div className="relative h-32 w-32">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none" stroke="#22c55e" strokeWidth="3"
              strokeDasharray={`${proteinDash} ${circumference}`}
              strokeLinecap="round"
            />
            <circle
              cx="18" cy="18" r="15.9" fill="none" stroke="#0ea5e9" strokeWidth="3"
              strokeDasharray={`${carbsDash} ${circumference}`}
              strokeDashoffset={carbsOffset}
              strokeLinecap="round"
            />
            <circle
              cx="18" cy="18" r="15.9" fill="none" stroke="#8b5cf6" strokeWidth="3"
              strokeDasharray={`${fatDash} ${circumference}`}
              strokeDashoffset={fatOffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-bold">{current.calories}</div>
              <div className="text-[10px] text-muted-foreground">kcal</div>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <MacroRow label="Protein" current={current.protein} goal={goal.protein} color="bg-fitness-500" />
          <MacroRow label="Carbs" current={current.carbs} goal={goal.carbs} color="bg-energy-500" />
          <MacroRow label="Fat" current={current.fat} goal={goal.fat} color="bg-purple-500" />
        </div>
      </div>
    </div>
  );
}

function MacroRow({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs mb-1">
        <span className={cn("h-2 w-2 rounded-full", color)} />
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{current}/{goal}g</span>
      </div>
      <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${Math.min((current / goal) * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}
