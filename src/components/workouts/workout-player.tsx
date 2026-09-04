"use client";

import { useEffect } from "react";
import { useWorkoutStore } from "@/stores/workout-store";
import { formatDuration } from "@/lib/utils";
import SetRow from "./set-row";
import RestTimer from "./rest-timer";

export default function WorkoutPlayer() {
  const {
    activeWorkout,
    tick,
    completeSet,
    nextExercise,
    startRest,
    pauseWorkout,
    resumeWorkout,
    endWorkout,
  } = useWorkoutStore();

  useEffect(() => {
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  if (!activeWorkout) return null;

  const currentExercise = activeWorkout.exercises[activeWorkout.currentExerciseIndex];
  const totalSets = activeWorkout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const completedSets = activeWorkout.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={endWorkout} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          End Workout
        </button>
        <div className="text-center">
          <div className="text-2xl font-mono font-bold">{formatDuration(activeWorkout.elapsed)}</div>
          <div className="text-xs text-muted-foreground">Elapsed</div>
        </div>
        <button
          onClick={activeWorkout.isPaused ? resumeWorkout : pauseWorkout}
          className="rounded-xl border border-border p-2 hover:bg-muted transition-colors"
        >
          {activeWorkout.isPaused ? (
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
      {activeWorkout.isResting && (
        <RestTimer
          remaining={activeWorkout.restRemaining}
          total={currentExercise?.restSeconds || 60}
          onSkip={() => useWorkoutStore.getState().skipRest()}
        />
      )}

      {/* Current Exercise */}
      {currentExercise && !activeWorkout.isResting && (
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                Exercise {activeWorkout.currentExerciseIndex + 1} of {activeWorkout.exercises.length}
              </div>
              <h2 className="text-xl font-bold">{currentExercise.exerciseName}</h2>
            </div>
          </div>

          <div className="space-y-2">
            {currentExercise.sets.map((set, idx) => (
              <SetRow
                key={idx}
                set={set}
                exerciseIndex={activeWorkout.currentExerciseIndex}
                setIndex={idx}
                onComplete={(data) => {
                  completeSet(activeWorkout.currentExerciseIndex, idx, data);
                  if (currentExercise.restSeconds > 0) {
                    startRest(currentExercise.restSeconds);
                  }
                }}
              />
            ))}
          </div>

          {currentExercise.completed && activeWorkout.currentExerciseIndex < activeWorkout.exercises.length - 1 && (
            <button
              onClick={nextExercise}
              className="mt-4 w-full rounded-xl bg-fitness-600 py-3 text-sm font-medium text-white hover:bg-fitness-700 transition-colors"
            >
              Next Exercise
            </button>
          )}
        </div>
      )}

      {/* Exercise List */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h3 className="text-sm font-semibold mb-4">All Exercises</h3>
        <div className="space-y-2">
          {activeWorkout.exercises.map((ex, i) => {
            const isActive = i === activeWorkout.currentExerciseIndex;
            const isDone = ex.completed;
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
                  {isDone ? "✓" : i + 1}
                </div>
                <div className="text-sm font-medium">{ex.exerciseName}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
