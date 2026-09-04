"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const exercises = [
  { name: "Barbell Back Squat", muscle: "Legs", sets: 4, reps: 10, weight: 135, restSeconds: 90 },
  { name: "Bench Press", muscle: "Chest", sets: 4, reps: 10, weight: 155, restSeconds: 90 },
  { name: "Barbell Row", muscle: "Back", sets: 4, reps: 10, weight: 115, restSeconds: 90 },
  { name: "Overhead Press", muscle: "Shoulders", sets: 3, reps: 12, weight: 65, restSeconds: 60 },
];

export default function ActiveWorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const workoutId = params.id as string;

  const [elapsed, setElapsed] = useState(0);
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [currentSet, setCurrentSet] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restRemaining, setRestRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [loggedSets, setLoggedSets] = useState<Record<string, { reps: number; weight: number }[]>>({});
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  const currentExercise = exercises[currentExerciseIdx];
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completedSets = Object.values(loggedSets).reduce((sum, sets) => sum + sets.length, 0);

  useEffect(() => {
    if (isPaused || isResting || isFinished) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [isPaused, isResting, isFinished]);

  useEffect(() => {
    if (!isResting || restRemaining <= 0) return;
    const interval = setInterval(() => {
      setRestRemaining((r) => {
        if (r <= 1) {
          setIsResting(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isResting, restRemaining]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const completeSet = useCallback(() => {
    const exKey = `${currentExerciseIdx}-${currentSet}`;
    const exercise = exercises[currentExerciseIdx];
    setLoggedSets((prev) => ({
      ...prev,
      [exKey]: [...(prev[exKey] || []), { reps: exercise.reps, weight: exercise.weight }],
    }));

    if (currentSet + 1 < exercise.sets) {
      setCurrentSet((s) => s + 1);
      setRestRemaining(exercise.restSeconds);
      setIsResting(true);
    } else if (currentExerciseIdx + 1 < exercises.length) {
      setCurrentExerciseIdx((i) => i + 1);
      setCurrentSet(0);
      setRestRemaining(exercises[currentExerciseIdx + 1].restSeconds);
      setIsResting(true);
    } else {
      setIsFinished(true);
    }
  }, [currentExerciseIdx, currentSet]);

  const skipRest = () => {
    setIsResting(false);
    setRestRemaining(0);
  };

  const restPct = currentExercise
    ? ((currentExercise.restSeconds - restRemaining) / currentExercise.restSeconds) * 100
    : 0;

  if (isFinished) {
    const totalCalories = exercises.reduce((sum, ex) => sum + ex.sets * ex.reps * 0.5, 0);
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-8">
        <div className="h-20 w-20 rounded-full bg-fitness-500/10 flex items-center justify-center mx-auto">
          <svg className="h-10 w-10 text-fitness-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-2">Workout Complete!</h1>
          <p className="text-muted-foreground">Great job crushing that workout.</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-card border border-border/50 p-4">
            <div className="text-2xl font-bold text-fitness-500">{formatTime(elapsed)}</div>
            <div className="text-xs text-muted-foreground mt-1">Duration</div>
          </div>
          <div className="rounded-xl bg-card border border-border/50 p-4">
            <div className="text-2xl font-bold text-orange-500">{Math.round(totalCalories)}</div>
            <div className="text-xs text-muted-foreground mt-1">Calories</div>
          </div>
          <div className="rounded-xl bg-card border border-border/50 p-4">
            <div className="text-2xl font-bold text-energy-500">{completedSets}</div>
            <div className="text-xs text-muted-foreground mt-1">Sets Done</div>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href="/workouts"
            className="flex-1 rounded-xl bg-fitness-600 px-6 py-3 text-sm font-medium text-white hover:bg-fitness-700 transition-colors"
          >
            Done
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/workouts"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Quit
        </Link>
        <div className="text-center">
          <div className="text-2xl font-mono font-bold">{formatTime(elapsed)}</div>
          <div className="text-xs text-muted-foreground">Elapsed</div>
        </div>
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="rounded-xl border border-border p-2 hover:bg-muted transition-colors"
        >
          {isPaused ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </button>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{completedSets}/{totalSets} sets</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-fitness-500 transition-all duration-500"
            style={{ width: `${(completedSets / totalSets) * 100}%` }}
          />
        </div>
      </div>

      {/* Rest Timer */}
      {isResting && (
        <div className="rounded-2xl border-2 border-fitness-500/30 bg-fitness-500/5 p-6 text-center">
          <div className="text-sm text-muted-foreground mb-2">Rest Period</div>
          <div className="text-5xl font-mono font-bold text-fitness-500 mb-4">
            {formatTime(restRemaining)}
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
            <div
              className="h-full rounded-full bg-fitness-500 transition-all duration-1000"
              style={{ width: `${restPct}%` }}
            />
          </div>
          <button
            onClick={skipRest}
            className="rounded-xl border border-border px-6 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Skip Rest
          </button>
        </div>
      )}

      {/* Current Exercise */}
      {currentExercise && !isResting && (
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                Exercise {currentExerciseIdx + 1} of {exercises.length}
              </div>
              <h2 className="text-xl font-bold">{currentExercise.name}</h2>
              <div className="text-sm text-muted-foreground mt-1">{currentExercise.muscle}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">Set {currentSet + 1}/{currentExercise.sets}</div>
              <div className="text-xs text-muted-foreground">of {currentExercise.sets} total</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl bg-muted/50 p-4 text-center">
              <div className="text-2xl font-bold">{currentExercise.reps}</div>
              <div className="text-xs text-muted-foreground">Reps</div>
            </div>
            <div className="rounded-xl bg-muted/50 p-4 text-center">
              <div className="text-2xl font-bold">{currentExercise.weight}</div>
              <div className="text-xs text-muted-foreground">lbs</div>
            </div>
          </div>

          <button
            onClick={completeSet}
            className="w-full rounded-xl bg-fitness-600 py-3 text-sm font-medium text-white hover:bg-fitness-700 transition-colors"
          >
            Complete Set
          </button>
        </div>
      )}

      {/* Exercise List */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h3 className="text-sm font-semibold mb-4">All Exercises</h3>
        <div className="space-y-2">
          {exercises.map((ex, i) => {
            const isActive = i === currentExerciseIdx;
            const isDone = i < currentExerciseIdx;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
                  isActive ? "bg-fitness-500/10 border border-fitness-500/20" : "bg-muted/30"
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                  isDone ? "bg-fitness-500 text-white" : isActive ? "bg-fitness-500/20 text-fitness-500" : "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${isDone ? "text-muted-foreground line-through" : ""}`}>
                    {ex.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {ex.sets} x {ex.reps} @ {ex.weight}lbs
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
