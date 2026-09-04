import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Workout } from "@/types";

interface WorkoutCardProps {
  workout: Workout;
  className?: string;
}

const difficultyColors = {
  beginner: "bg-fitness-500/10 text-fitness-500",
  intermediate: "bg-yellow-500/10 text-yellow-500",
  advanced: "bg-red-500/10 text-red-500",
};

const categoryGradients: Record<string, string> = {
  Strength: "from-fitness-500 to-fitness-700",
  Cardio: "from-orange-500 to-red-500",
  HIIT: "from-red-500 to-pink-500",
  Yoga: "from-purple-500 to-indigo-500",
  Bodyweight: "from-energy-500 to-energy-700",
};

export default function WorkoutCard({ workout, className }: WorkoutCardProps) {
  const gradient = categoryGradients[workout.category] || "from-fitness-500 to-energy-500";

  return (
    <Link
      href={`/dashboard/workouts/${workout.id}`}
      className={cn(
        "group rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-fitness-500/30 hover:shadow-lg transition-all duration-300",
        className
      )}
    >
      <div className={`h-32 bg-gradient-to-br ${gradient} relative`}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-3 right-3 flex gap-2">
          <span className={`rounded-lg px-2 py-1 text-xs font-medium ${difficultyColors[workout.difficulty]}`}>
            {workout.difficulty}
          </span>
          {workout.createdBy === "ai" && (
            <span className="rounded-lg bg-purple-500/20 px-2 py-1 text-xs font-medium text-purple-400">
              AI
            </span>
          )}
        </div>
        <div className="absolute bottom-3 left-3 text-white">
          <div className="text-lg font-bold">{workout.name}</div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {workout.duration} min
          </span>
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
            {workout.calories} cal
          </span>
          <span>{workout.exercises.length} exercises</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-medium">{workout.rating}</span>
          </div>
          <div className="flex gap-1">
            {workout.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
