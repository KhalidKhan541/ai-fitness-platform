import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  WeightEntry,
  MeasurementEntry,
  ProgressPhoto,
  ProgressStats,
  WeightGoal,
  ProgressType,
} from "@/types";

interface ProgressState {
  weightEntries: WeightEntry[];
  measurementEntries: MeasurementEntry[];
  progressPhotos: ProgressPhoto[];
  selectedDate: string;
  weightUnit: "kg" | "lbs";
  measurementUnit: "cm" | "in";

  setSelectedDate: (date: string) => void;
  setWeightUnit: (unit: "kg" | "lbs") => void;
  setMeasurementUnit: (unit: "cm" | "in") => void;

  addWeightEntry: (entry: Partial<WeightEntry>) => void;
  updateWeightEntry: (id: string, updates: Partial<WeightEntry>) => void;
  removeWeightEntry: (id: string) => void;

  addMeasurementEntry: (entry: Partial<MeasurementEntry>) => void;
  updateMeasurementEntry: (id: string, updates: Partial<MeasurementEntry>) => void;
  removeMeasurementEntry: (id: string) => void;

  addProgressPhoto: (photo: Partial<ProgressPhoto>) => void;
  updateProgressPhoto: (id: string, updates: Partial<ProgressPhoto>) => void;
  removeProgressPhoto: (id: string) => void;

  getLatestWeight: () => WeightEntry | null;
  getWeightStats: () => ProgressStats;
  getWeightGoal: () => WeightGoal | null;
  getWeightHistory: (days?: number) => WeightEntry[];
  getMeasurementHistory: (type: ProgressType, days?: number) => Array<{ date: string; value: number }>;
  getPhotosByType: (type: string) => ProgressPhoto[];
  getProgressSummary: () => {
    weight: WeightEntry | null;
    measurements: MeasurementEntry | null;
    photosCount: number;
    daysTracked: number;
  };
}

export const useProgressStore = create<ProgressState>()(
  persist(
    immer((set, get) => ({
      weightEntries: [],
      measurementEntries: [],
      progressPhotos: [],
      selectedDate: new Date().toISOString().split("T")[0],
      weightUnit: "kg",
      measurementUnit: "cm",

      setSelectedDate: (date) =>
        set((state) => {
          state.selectedDate = date;
        }),

      setWeightUnit: (unit) =>
        set((state) => {
          state.weightUnit = unit;
        }),

      setMeasurementUnit: (unit) =>
        set((state) => {
          state.measurementUnit = unit;
        }),

      addWeightEntry: (entry) =>
        set((state) => {
          const newEntry: WeightEntry = {
            id: `weight_${Date.now()}`,
            userId: "",
            weight: entry.weight || 0,
            unit: entry.unit || state.weightUnit,
            date: entry.date || state.selectedDate,
            time: entry.time || new Date().toTimeString().slice(0, 5),
            bodyFat: entry.bodyFat,
            notes: entry.notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          state.weightEntries.push(newEntry);
          state.weightEntries.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        }),

      updateWeightEntry: (id, updates) =>
        set((state) => {
          const entry = state.weightEntries.find((e) => e.id === id);
          if (entry) {
            Object.assign(entry, updates, {
              updatedAt: new Date().toISOString(),
            });
          }
        }),

      removeWeightEntry: (id) =>
        set((state) => {
          state.weightEntries = state.weightEntries.filter((e) => e.id !== id);
        }),

      addMeasurementEntry: (entry) =>
        set((state) => {
          const newEntry: MeasurementEntry = {
            id: `measure_${Date.now()}`,
            userId: "",
            date: entry.date || state.selectedDate,
            time: entry.time || new Date().toTimeString().slice(0, 5),
            chest: entry.chest,
            waist: entry.waist,
            hips: entry.hips,
            leftArm: entry.leftArm,
            rightArm: entry.rightArm,
            leftThigh: entry.leftThigh,
            rightThigh: entry.rightThigh,
            leftCalf: entry.leftCalf,
            rightCalf: entry.rightCalf,
            shoulders: entry.shoulders,
            unit: entry.unit || state.measurementUnit,
            notes: entry.notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          state.measurementEntries.push(newEntry);
          state.measurementEntries.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        }),

      updateMeasurementEntry: (id, updates) =>
        set((state) => {
          const entry = state.measurementEntries.find((e) => e.id === id);
          if (entry) {
            Object.assign(entry, updates, {
              updatedAt: new Date().toISOString(),
            });
          }
        }),

      removeMeasurementEntry: (id) =>
        set((state) => {
          state.measurementEntries = state.measurementEntries.filter(
            (e) => e.id !== id
          );
        }),

      addProgressPhoto: (photo) =>
        set((state) => {
          const newPhoto: ProgressPhoto = {
            id: `photo_${Date.now()}`,
            userId: "",
            url: photo.url || "",
            thumbnailUrl: photo.thumbnailUrl || photo.url || "",
            type: photo.type || "front",
            angle: photo.angle || "front",
            date: photo.date || state.selectedDate,
            weight: photo.weight,
            bodyFat: photo.bodyFat,
            notes: photo.notes,
            tags: photo.tags || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          state.progressPhotos.push(newPhoto);
          state.progressPhotos.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        }),

      updateProgressPhoto: (id, updates) =>
        set((state) => {
          const photo = state.progressPhotos.find((p) => p.id === id);
          if (photo) {
            Object.assign(photo, updates, {
              updatedAt: new Date().toISOString(),
            });
          }
        }),

      removeProgressPhoto: (id) =>
        set((state) => {
          state.progressPhotos = state.progressPhotos.filter(
            (p) => p.id !== id
          );
        }),

      getLatestWeight: () => {
        const { weightEntries } = get();
        return weightEntries.length > 0 ? weightEntries[0] : null;
      },

      getWeightStats: (): ProgressStats => {
        const { weightEntries } = get();
        if (weightEntries.length === 0) {
          return {
            currentWeight: 0,
            startingWeight: 0,
            weightChange: 0,
            weightChangePercentage: 0,
            averageWeeklyChange: 0,
            lowestWeight: 0,
            highestWeight: 0,
            totalEntries: 0,
            streakDays: 0,
          };
        }

        const sorted = [...weightEntries].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        const current = weightEntries[0].weight;
        const starting = sorted[0].weight;
        const weights = weightEntries.map((e) => e.weight);

        const daysDiff =
          (new Date(sorted[sorted.length - 1].date).getTime() -
            new Date(sorted[0].date).getTime()) /
          (1000 * 60 * 60 * 24);
        const weeks = Math.max(1, daysDiff / 7);

        return {
          currentWeight: current,
          startingWeight: starting,
          weightChange: Math.round((current - starting) * 10) / 10,
          weightChangePercentage:
            starting > 0
              ? Math.round(((current - starting) / starting) * 1000) / 10
              : 0,
          averageWeeklyChange:
            Math.round(((current - starting) / weeks) * 10) / 10,
          lowestWeight: Math.min(...weights),
          highestWeight: Math.max(...weights),
          totalEntries: weightEntries.length,
          streakDays: calculateStreak(weightEntries.map((e) => e.date)),
        };
      },

      getWeightGoal: (): WeightGoal | null => {
        const { weightEntries } = get();
        if (weightEntries.length < 2) return null;

        const sorted = [...weightEntries].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        const current = sorted[sorted.length - 1].weight;
        const start = sorted[0].weight;

        const daysDiff =
          (new Date(sorted[sorted.length - 1].date).getTime() -
            new Date(sorted[0].date).getTime()) /
          (1000 * 60 * 60 * 24);
        const weeklyRate =
          daysDiff > 0
            ? ((current - start) / daysDiff) * 7
            : 0;

        const targetWeight = current - 5;
        const remainingWeight = current - targetWeight;
        const weeksToTarget =
          weeklyRate !== 0 ? Math.abs(remainingWeight / weeklyRate) : 0;

        return {
          current,
          target: targetWeight,
          startWeight: start,
          unit: get().weightUnit,
          startDate: sorted[0].date,
          targetDate: new Date(
            Date.now() + weeksToTarget * 7 * 24 * 60 * 60 * 1000
          ).toISOString().split("T")[0],
          progress: Math.min(
            100,
            Math.round(
              (Math.abs(start - current) / Math.abs(start - targetWeight)) * 100
            )
          ),
          weeklyRate: Math.round(weeklyRate * 10) / 10,
          estimatedDate: new Date(
            Date.now() + weeksToTarget * 7 * 24 * 60 * 60 * 1000
          ).toISOString().split("T")[0],
        };
      },

      getWeightHistory: (days = 30) => {
        const { weightEntries } = get();
        const cutoff = new Date(
          Date.now() - days * 24 * 60 * 60 * 1000
        ).toISOString();
        return weightEntries.filter((e) => e.date >= cutoff);
      },

      getMeasurementHistory: (type, days = 90) => {
        const { measurementEntries } = get();
        const cutoff = new Date(
          Date.now() - days * 24 * 60 * 60 * 1000
        ).toISOString();

        return measurementEntries
          .filter((e) => e.date >= cutoff)
          .map((e) => ({
            date: e.date,
            value: (e as Record<string, unknown>)[type] as number || 0,
          }))
          .filter((e) => e.value > 0);
      },

      getPhotosByType: (type) => {
        const { progressPhotos } = get();
        return progressPhotos.filter((p) => p.type === type);
      },

      getProgressSummary: () => {
        const { weightEntries, measurementEntries, progressPhotos } = get();
        return {
          weight: weightEntries.length > 0 ? weightEntries[0] : null,
          measurements:
            measurementEntries.length > 0 ? measurementEntries[0] : null,
          photosCount: progressPhotos.length,
          daysTracked: new Set([
            ...weightEntries.map((e) => e.date),
            ...measurementEntries.map((e) => e.date),
          ]).size,
        };
      },
    })),
    {
      name: "aifitness-progress",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({
        weightEntries: state.weightEntries.slice(0, 500),
        measurementEntries: state.measurementEntries.slice(0, 200),
        progressPhotos: state.progressPhotos.slice(0, 100),
        weightUnit: state.weightUnit,
        measurementUnit: state.measurementUnit,
      }),
    }
  )
);

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort().reverse();
  const today = new Date().toISOString().split("T")[0];
  let streak = 0;
  let currentDate = new Date(today);

  for (const date of sorted) {
    const entryDate = new Date(date);
    const diffDays =
      (currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays <= 1) {
      streak++;
      currentDate = entryDate;
    } else {
      break;
    }
  }

  return streak;
}
