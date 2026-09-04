import { cn } from "@/lib/utils";
import type { Exercise } from "@/types";

interface ExerciseCardProps {
  exercise: Exercise;
  expanded?: boolean;
  onToggle?: () => void;
  className?: string;
}

const difficultyColors = {
  beginner: "bg-fitness-500/10 text-fitness-500",
  intermediate: "bg-yellow-500/10 text-yellow-500",
  advanced: "bg-red-500/10 text-red-500",
};

const muscleColors: Record<string, string> = {
  chest: "bg-muscle-chest",
  back: "bg-muscle-back",
  legs: "bg-muscle-legs",
  shoulders: "bg-muscle-shoulders",
  arms: "bg-muscle-arms",
  core: "bg-muscle-core",
};

export default function ExerciseCard({ exercise, expanded, onToggle, className }: ExerciseCardProps) {
  return (
    <div className={cn("rounded-2xl border border-border/50 bg-card overflow-hidden", className)}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className={`h-10 w-10 rounded-xl ${muscleColors[exercise.muscle.toLowerCase()] || "bg-muted"} flex items-center justify-center`}>
          <span className="text-white text-xs font-bold">{exercise.muscle[0]}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{exercise.name}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{exercise.muscle}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{exercise.equipment}</span>
          </div>
        </div>
        <span className={`rounded-lg px-2 py-1 text-xs font-medium ${difficultyColors[exercise.difficulty]}`}>
          {exercise.difficulty}
        </span>
        <svg
          className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-border/30 px-4 pb-4 pt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Instructions</h4>
          <ol className="space-y-1.5">
            {exercise.instructions.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          {exercise.tips.length > 0 && (
            <>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-4">Tips</h4>
              <ul className="space-y-1">
                {exercise.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-fitness-500 mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
