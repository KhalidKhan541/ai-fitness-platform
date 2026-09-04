import { cn } from "@/lib/utils";
import type { Goal } from "@/types";

interface GoalCardProps {
  goal: Goal;
  className?: string;
}

export default function GoalCard({ goal, className }: GoalCardProps) {
  const pct = Math.min((goal.current / goal.target) * 100, 100);
  const isComplete = goal.current >= goal.target;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5",
        isComplete ? "border-fitness-500/30" : "border-border/50",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            {goal.title}
            {isComplete && (
              <span className="rounded-full bg-fitness-500/10 px-2 py-0.5 text-[10px] font-medium text-fitness-500">
                Complete
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
        </div>
        <span className="rounded-lg bg-muted px-2 py-1 text-xs font-medium capitalize">
          {goal.type}
        </span>
      </div>
      <div className="flex items-center gap-4 mb-2">
        <div className="flex-1">
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isComplete ? "bg-fitness-500" : "bg-energy-500"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <span className="text-sm font-medium shrink-0">
          {goal.current} / {goal.target} {goal.unit}
        </span>
      </div>
      {goal.deadline && (
        <div className="text-xs text-muted-foreground">
          Deadline: {new Date(goal.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      )}
    </div>
  );
}
