"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

const workoutData: Record<string, {
  name: string;
  description: string;
  category: string;
  difficulty: string;
  duration: number;
  calories: number;
  rating: number;
  completions: number;
  exercises: { name: string; muscle: string; sets: number; reps: string; rest: string; notes: string }[];
}> = {
  "1": {
    name: "Full Body Strength",
    description: "A comprehensive full-body strength workout targeting all major muscle groups. Perfect for building lean muscle and increasing overall strength.",
    category: "Strength",
    difficulty: "Intermediate",
    duration: 45,
    calories: 400,
    rating: 4.8,
    completions: 12400,
    exercises: [
      { name: "Barbell Back Squat", muscle: "Legs", sets: 4, reps: "8-10", rest: "90s", notes: "Keep chest up, knees tracking toes" },
      { name: "Bench Press", muscle: "Chest", sets: 4, reps: "8-10", rest: "90s", notes: "Retract shoulder blades, controlled descent" },
      { name: "Barbell Row", muscle: "Back", sets: 4, reps: "8-10", rest: "90s", notes: "Squeeze shoulder blades at top" },
      { name: "Overhead Press", muscle: "Shoulders", sets: 3, reps: "10-12", rest: "60s", notes: "Brace core, full range of motion" },
      { name: "Romanian Deadlift", muscle: "Legs", sets: 3, reps: "10-12", rest: "60s", notes: "Hinge at hips, slight knee bend" },
      { name: "Lat Pulldown", muscle: "Back", sets: 3, reps: "12-15", rest: "60s", notes: "Pull to upper chest" },
      { name: "Dumbbell Curl", muscle: "Arms", sets: 3, reps: "12-15", rest: "45s", notes: "Controlled movement, no swinging" },
      { name: "Tricep Pushdown", muscle: "Arms", sets: 3, reps: "12-15", rest: "45s", notes: "Keep elbows pinned to sides" },
    ],
  },
};

const defaultWorkout = {
  name: "Workout",
  description: "Follow this workout to build strength and endurance.",
  category: "Strength",
  difficulty: "Intermediate",
  duration: 45,
  calories: 400,
  rating: 4.8,
  completions: 12400,
  exercises: [
    { name: "Exercise 1", muscle: "Full Body", sets: 3, reps: "10-12", rest: "60s", notes: "Focus on form" },
    { name: "Exercise 2", muscle: "Upper Body", sets: 3, reps: "10-12", rest: "60s", notes: "Controlled movement" },
    { name: "Exercise 3", muscle: "Lower Body", sets: 3, reps: "10-12", rest: "60s", notes: "Full range of motion" },
  ],
};

const muscleColors: Record<string, string> = {
  Legs: "bg-muscle-legs",
  Chest: "bg-muscle-chest",
  Back: "bg-muscle-back",
  Shoulders: "bg-muscle-shoulders",
  Arms: "bg-muscle-arms",
  "Full Body": "bg-fitness-500",
  "Upper Body": "bg-energy-500",
  "Lower Body": "bg-muscle-legs",
};

export default function WorkoutDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const workout = workoutData[id] || { ...defaultWorkout, name: `Workout #${id}` };

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/workouts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Workouts
      </Link>

      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="w-full sm:w-48 h-32 rounded-xl bg-gradient-to-br from-fitness-500 to-energy-500 flex items-center justify-center shrink-0">
            <svg className="h-12 w-12 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6h.01M6 18h.01M18 6h.01M18 18h.01M6 12h12" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-lg bg-fitness-500/10 px-2 py-1 text-xs font-medium text-fitness-500">
                {workout.category}
              </span>
              <span className="rounded-lg bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-500">
                {workout.difficulty}
              </span>
            </div>
            <h1 className="text-2xl font-bold mb-2">{workout.name}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{workout.description}</p>
            <div className="flex items-center gap-6 mt-4 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {workout.duration} min
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
                {workout.calories} cal
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {workout.rating}
              </span>
              <span className="text-muted-foreground">
                {(workout.completions / 1000).toFixed(1)}K completions
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Exercises ({workout.exercises.length})</h2>
        <div className="space-y-2">
          {workout.exercises.map((ex, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-border/30 p-4 hover:border-fitness-500/30 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-sm font-bold text-muted-foreground shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{ex.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`h-2 w-2 rounded-full ${muscleColors[ex.muscle] || "bg-muted"}`} />
                  <span className="text-xs text-muted-foreground">{ex.muscle}</span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground">
                <span>{ex.sets} sets</span>
                <span>{ex.reps} reps</span>
                <span>Rest {ex.rest}</span>
              </div>
              {ex.notes && (
                <div className="hidden md:block max-w-[200px] text-xs text-muted-foreground truncate">
                  {ex.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href={`/workouts/start/${id}`}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-fitness-600 px-6 py-3 text-sm font-medium text-white hover:bg-fitness-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Start Workout
        </Link>
        <button className="rounded-xl border border-border px-6 py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
