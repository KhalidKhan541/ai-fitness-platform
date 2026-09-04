import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  Workout,
  WorkoutExercise,
  ExerciseSet,
  Exercise,
  WorkoutStatus,
  WorkoutType,
} from "@/types";

interface WorkoutState {
  activeWorkout: Workout | null;
  currentExerciseIndex: number;
  currentSetIndex: number;
  restTimer: RestTimer | null;
  workoutHistory: Workout[];
  isWorkoutActive: boolean;
  isPaused: boolean;
  elapsedSeconds: number;

  startWorkout: (workout: Partial<Workout>) => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  endWorkout: (rating?: number) => void;
  cancelWorkout: () => void;

  addExercise: (exercise: Exercise) => void;
  removeExercise: (exerciseIndex: number) => void;
  reorderExercises: (fromIndex: number, toIndex: number) => void;
  setCurrentExercise: (index: number) => void;

  addSet: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  updateSet: (
    exerciseIndex: number,
    setIndex: number,
    updates: Partial<ExerciseSet>
  ) => void;
  completeSet: (exerciseIndex: number, setIndex: number) => void;
  skipSet: (exerciseIndex: number, setIndex: number) => void;
  setCurrentSet: (index: number) => void;

  updateExercise: (exerciseIndex: number, updates: Partial<WorkoutExercise>) => void;
  completeExercise: (exerciseIndex: number) => void;

  startRestTimer: (duration: number) => void;
  stopRestTimer: () => void;
  tickRestTimer: () => void;

  incrementTimer: () => void;
  setElapsed: (seconds: number) => void;

  setWorkoutType: (type: WorkoutType) => void;
  setWorkoutName: (name: string) => void;
  setWorkoutNotes: (notes: string) => void;

  getCompletedSets: () => number;
  getTotalSets: () => number;
  getWorkoutDuration: () => number;
  getEstimatedCalories: () => number;
}

interface RestTimer {
  duration: number;
  remaining: number;
  isRunning: boolean;
}

const createEmptyWorkout = (partial: Partial<Workout>): Workout => ({
  id: `workout_${Date.now()}`,
  userId: "",
  name: partial.name || "Workout",
  type: partial.type || "strength",
  status: "in_progress",
  startedAt: new Date().toISOString(),
  exercises: [],
  duration: 0,
  isTemplate: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    immer((set, get) => ({
      activeWorkout: null,
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      restTimer: null,
      workoutHistory: [],
      isWorkoutActive: false,
      isPaused: false,
      elapsedSeconds: 0,

      startWorkout: (workout) =>
        set((state) => {
          const newWorkout = createEmptyWorkout(workout);
          state.activeWorkout = newWorkout;
          state.isWorkoutActive = true;
          state.isPaused = false;
          state.currentExerciseIndex = 0;
          state.currentSetIndex = 0;
          state.elapsedSeconds = 0;
        }),

      pauseWorkout: () =>
        set((state) => {
          state.isPaused = true;
          if (state.activeWorkout) {
            state.activeWorkout.status = "paused";
          }
        }),

      resumeWorkout: () =>
        set((state) => {
          state.isPaused = false;
          if (state.activeWorkout) {
            state.activeWorkout.status = "in_progress";
          }
        }),

      endWorkout: (rating) =>
        set((state) => {
          if (state.activeWorkout) {
            state.activeWorkout.status = "completed";
            state.activeWorkout.completedAt = new Date().toISOString();
            state.activeWorkout.duration = state.elapsedSeconds;
            if (rating !== undefined) {
              state.activeWorkout.rating = rating;
            }
            state.workoutHistory.unshift(state.activeWorkout);
            if (state.workoutHistory.length > 100) {
              state.workoutHistory = state.workoutHistory.slice(0, 100);
            }
          }
          state.activeWorkout = null;
          state.isWorkoutActive = false;
          state.isPaused = false;
          state.elapsedSeconds = 0;
          state.restTimer = null;
        }),

      cancelWorkout: () =>
        set((state) => {
          state.activeWorkout = null;
          state.isWorkoutActive = false;
          state.isPaused = false;
          state.elapsedSeconds = 0;
          state.restTimer = null;
        }),

      addExercise: (exercise) =>
        set((state) => {
          if (!state.activeWorkout) return;
          const newExercise: WorkoutExercise = {
            id: `ex_${Date.now()}`,
            workoutId: state.activeWorkout.id,
            exerciseId: exercise.id,
            exercise,
            order: state.activeWorkout.exercises.length + 1,
            sets: [
              {
                id: `set_${Date.now()}`,
                workoutExerciseId: `ex_${Date.now()}`,
                setNumber: 1,
                type: "normal",
                completed: false,
                skipped: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          state.activeWorkout.exercises.push(newExercise);
        }),

      removeExercise: (exerciseIndex) =>
        set((state) => {
          if (!state.activeWorkout) return;
          state.activeWorkout.exercises.splice(exerciseIndex, 1);
          if (state.currentExerciseIndex >= state.activeWorkout.exercises.length) {
            state.currentExerciseIndex = Math.max(
              0,
              state.activeWorkout.exercises.length - 1
            );
          }
        }),

      reorderExercises: (fromIndex, toIndex) =>
        set((state) => {
          if (!state.activeWorkout) return;
          const exercises = state.activeWorkout.exercises;
          const [moved] = exercises.splice(fromIndex, 1);
          exercises.splice(toIndex, 0, moved);
          exercises.forEach((ex, i) => {
            ex.order = i + 1;
          });
        }),

      setCurrentExercise: (index) =>
        set((state) => {
          state.currentExerciseIndex = index;
          state.currentSetIndex = 0;
        }),

      addSet: (exerciseIndex) =>
        set((state) => {
          if (!state.activeWorkout) return;
          const exercise = state.activeWorkout.exercises[exerciseIndex];
          if (!exercise) return;
          const lastSet = exercise.sets[exercise.sets.length - 1];
          const newSet: ExerciseSet = {
            id: `set_${Date.now()}`,
            workoutExerciseId: exercise.id,
            setNumber: exercise.sets.length + 1,
            type: "normal",
            weight: lastSet?.weight,
            reps: lastSet?.reps,
            completed: false,
            skipped: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          exercise.sets.push(newSet);
        }),

      removeSet: (exerciseIndex, setIndex) =>
        set((state) => {
          if (!state.activeWorkout) return;
          const exercise = state.activeWorkout.exercises[exerciseIndex];
          if (!exercise) return;
          exercise.sets.splice(setIndex, 1);
          exercise.sets.forEach((s, i) => {
            s.setNumber = i + 1;
          });
        }),

      updateSet: (exerciseIndex, setIndex, updates) =>
        set((state) => {
          if (!state.activeWorkout) return;
          const exercise = state.activeWorkout.exercises[exerciseIndex];
          if (!exercise) return;
          const set = exercise.sets[setIndex];
          if (!set) return;
          Object.assign(set, updates, { updatedAt: new Date().toISOString() });
        }),

      completeSet: (exerciseIndex, setIndex) =>
        set((state) => {
          if (!state.activeWorkout) return;
          const exercise = state.activeWorkout.exercises[exerciseIndex];
          if (!exercise) return;
          const set = exercise.sets[setIndex];
          if (!set) return;
          set.completed = true;
          set.updatedAt = new Date().toISOString();
        }),

      skipSet: (exerciseIndex, setIndex) =>
        set((state) => {
          if (!state.activeWorkout) return;
          const exercise = state.activeWorkout.exercises[exerciseIndex];
          if (!exercise) return;
          const set = exercise.sets[setIndex];
          if (!set) return;
          set.skipped = true;
          set.updatedAt = new Date().toISOString();
        }),

      setCurrentSet: (index) =>
        set((state) => {
          state.currentSetIndex = index;
        }),

      updateExercise: (exerciseIndex, updates) =>
        set((state) => {
          if (!state.activeWorkout) return;
          const exercise = state.activeWorkout.exercises[exerciseIndex];
          if (!exercise) return;
          Object.assign(exercise, updates, { updatedAt: new Date().toISOString() });
        }),

      completeExercise: (exerciseIndex) =>
        set((state) => {
          if (!state.activeWorkout) return;
          const exercise = state.activeWorkout.exercises[exerciseIndex];
          if (!exercise) return;
          exercise.completed = true;
          exercise.updatedAt = new Date().toISOString();
        }),

      startRestTimer: (duration) =>
        set((state) => {
          state.restTimer = {
            duration,
            remaining: duration,
            isRunning: true,
          };
        }),

      stopRestTimer: () =>
        set((state) => {
          state.restTimer = null;
        }),

      tickRestTimer: () =>
        set((state) => {
          if (!state.restTimer || !state.restTimer.isRunning) return;
          if (state.restTimer.remaining <= 0) {
            state.restTimer = null;
            return;
          }
          state.restTimer.remaining -= 1;
        }),

      incrementTimer: () =>
        set((state) => {
          if (!state.isPaused) {
            state.elapsedSeconds += 1;
          }
        }),

      setElapsed: (seconds) =>
        set((state) => {
          state.elapsedSeconds = seconds;
        }),

      setWorkoutType: (type) =>
        set((state) => {
          if (state.activeWorkout) {
            state.activeWorkout.type = type;
          }
        }),

      setWorkoutName: (name) =>
        set((state) => {
          if (state.activeWorkout) {
            state.activeWorkout.name = name;
          }
        }),

      setWorkoutNotes: (notes) =>
        set((state) => {
          if (state.activeWorkout) {
            state.activeWorkout.notes = notes;
          }
        }),

      getCompletedSets: () => {
        const { activeWorkout } = get();
        if (!activeWorkout) return 0;
        return activeWorkout.exercises.reduce(
          (total, ex) => total + ex.sets.filter((s) => s.completed).length,
          0
        );
      },

      getTotalSets: () => {
        const { activeWorkout } = get();
        if (!activeWorkout) return 0;
        return activeWorkout.exercises.reduce(
          (total, ex) => total + ex.sets.length,
          0
        );
      },

      getWorkoutDuration: () => {
        return get().elapsedSeconds;
      },

      getEstimatedCalories: () => {
        const { activeWorkout, elapsedSeconds } = get();
        if (!activeWorkout) return 0;
        const minutes = elapsedSeconds / 60;
        const caloriesPerMinute =
          activeWorkout.type === "hiit"
            ? 12
            : activeWorkout.type === "cardio"
              ? 10
              : 6;
        return Math.round(minutes * caloriesPerMinute);
      },
    })),
    {
      name: "aifitness-workout",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({
        activeWorkout: state.activeWorkout,
        isWorkoutActive: state.isWorkoutActive,
        isPaused: state.isPaused,
        elapsedSeconds: state.elapsedSeconds,
        workoutHistory: state.workoutHistory.slice(0, 50),
      }),
    }
  )
);
