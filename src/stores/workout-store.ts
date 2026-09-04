import { create } from "zustand";
import type { ActiveWorkout, ActiveSet, ActiveExercise } from "@/types";

interface WorkoutState {
  activeWorkout: ActiveWorkout | null;
  workoutHistory: ActiveWorkout[];
  startWorkout: (workout: ActiveWorkout) => void;
  endWorkout: () => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  tick: () => void;
  completeSet: (exerciseIdx: number, setIdx: number, data: Partial<ActiveSet>) => void;
  nextExercise: () => void;
  startRest: (seconds: number) => void;
  tickRest: () => void;
  skipRest: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeWorkout: null,
  workoutHistory: [],

  startWorkout: (workout) =>
    set({ activeWorkout: { ...workout, startedAt: new Date().toISOString(), elapsed: 0, isPaused: false } }),

  endWorkout: () => {
    const { activeWorkout, workoutHistory } = get();
    if (activeWorkout) {
      set({ activeWorkout: null, workoutHistory: [...workoutHistory, activeWorkout] });
    }
  },

  pauseWorkout: () =>
    set((s) => s.activeWorkout ? { activeWorkout: { ...s.activeWorkout, isPaused: true } } : {}),

  resumeWorkout: () =>
    set((s) => s.activeWorkout ? { activeWorkout: { ...s.activeWorkout, isPaused: false } } : {}),

  tick: () =>
    set((s) =>
      s.activeWorkout && !s.activeWorkout.isPaused && !s.activeWorkout.isResting
        ? { activeWorkout: { ...s.activeWorkout, elapsed: s.activeWorkout.elapsed + 1 } }
        : {}
    ),

  completeSet: (exerciseIdx, setIdx, data) =>
    set((s) => {
      if (!s.activeWorkout) return {};
      const exercises = [...s.activeWorkout.exercises];
      const ex = { ...exercises[exerciseIdx] };
      const sets = [...ex.sets];
      sets[setIdx] = { ...sets[setIdx], ...data, completed: true, isCurrent: false };
      const nextSetIdx = setIdx + 1;
      if (nextSetIdx < sets.length) {
        sets[nextSetIdx] = { ...sets[nextSetIdx], isCurrent: true };
      } else {
        ex.completed = true;
      }
      ex.sets = sets;
      exercises[exerciseIdx] = ex;
      return { activeWorkout: { ...s.activeWorkout, exercises } };
    }),

  nextExercise: () =>
    set((s) => {
      if (!s.activeWorkout) return {};
      const idx = s.activeWorkout.currentExerciseIndex + 1;
      if (idx >= s.activeWorkout.exercises.length) return {};
      const exercises = [...s.activeWorkout.exercises];
      const nextEx = { ...exercises[idx] };
      if (nextEx.sets.length > 0) {
        nextEx.sets = nextEx.sets.map((set, i) => ({ ...set, isCurrent: i === 0 }));
      }
      exercises[idx] = nextEx;
      return { activeWorkout: { ...s.activeWorkout, currentExerciseIndex: idx, currentSet: 0 } };
    }),

  startRest: (seconds) =>
    set((s) =>
      s.activeWorkout
        ? { activeWorkout: { ...s.activeWorkout, isResting: true, restRemaining: seconds } }
        : {}
    ),

  tickRest: () =>
    set((s) => {
      if (!s.activeWorkout || !s.activeWorkout.isResting) return {};
      const remaining = s.activeWorkout.restRemaining - 1;
      if (remaining <= 0) {
        return { activeWorkout: { ...s.activeWorkout, isResting: false, restRemaining: 0 } };
      }
      return { activeWorkout: { ...s.activeWorkout, restRemaining: remaining } };
    }),

  skipRest: () =>
    set((s) =>
      s.activeWorkout
        ? { activeWorkout: { ...s.activeWorkout, isResting: false, restRemaining: 0 } }
        : {}
    ),
}));
