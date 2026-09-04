import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  Goal,
  GoalMilestone,
  Achievement,
  UserAchievement,
  GoalType,
  GoalStatus,
  GoalPriority,
  UserStats,
} from "@/types";

interface GoalState {
  goals: Goal[];
  userAchievements: UserAchievement[];
  userStats: UserStats;
  selectedGoalId: string | null;

  addGoal: (goal: Partial<Goal>) => void;
  updateGoal: (goalId: string, updates: Partial<Goal>) => void;
  removeGoal: (goalId: string) => void;
  completeGoal: (goalId: string) => void;
  pauseGoal: (goalId: string) => void;
  resumeGoal: (goalId: string) => void;
  cancelGoal: (goalId: string) => void;

  updateGoalProgress: (goalId: string, value: number) => void;
  addMilestone: (goalId: string, milestone: Partial<GoalMilestone>) => void;
  completeMilestone: (goalId: string, milestoneId: string) => void;
  removeMilestone: (goalId: string, milestoneId: string) => void;

  setSelectedGoal: (goalId: string | null) => void;

  unlockAchievement: (achievementId: string) => void;
  markAchievementSeen: (achievementId: string) => void;
  getUnseenAchievements: () => UserAchievement[];

  getGoalsByType: (type: GoalType) => Goal[];
  getGoalsByStatus: (status: GoalStatus) => Goal[];
  getGoalsByPriority: (priority: GoalPriority) => Goal[];
  getActiveGoals: () => Goal[];
  getCompletedGoals: () => Goal[];
  getGoalProgress: (goalId: string) => number;
  getOverallProgress: () => number;

  updateUserStats: (updates: Partial<UserStats>) => void;
  addXp: (amount: number) => void;
  updateStreak: (days: number) => void;
}

const defaultUserStats: UserStats = {
  totalXp: 0,
  level: 1,
  xpToNextLevel: 1000,
  xpProgress: 0,
  achievementsUnlocked: 0,
  totalAchievements: 0,
  workoutStreak: 0,
  longestWorkoutStreak: 0,
  totalWorkouts: 0,
  totalDuration: 0,
  totalCaloriesBurned: 0,
};

export const useGoalStore = create<GoalState>()(
  persist(
    immer((set, get) => ({
      goals: [],
      userAchievements: [],
      userStats: { ...defaultUserStats },
      selectedGoalId: null,

      addGoal: (goalData) =>
        set((state) => {
          const newGoal: Goal = {
            id: `goal_${Date.now()}`,
            userId: "",
            type: goalData.type || "custom",
            title: goalData.title || "New Goal",
            description: goalData.description || "",
            targetValue: goalData.targetValue || 0,
            currentValue: goalData.currentValue || 0,
            unit: goalData.unit || "",
            startDate: goalData.startDate || new Date().toISOString(),
            targetDate: goalData.targetDate || "",
            status: "active",
            priority: goalData.priority || "medium",
            milestones: goalData.milestones || [],
            progress: 0,
            isPublic: goalData.isPublic ?? true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          state.goals.push(newGoal);
        }),

      updateGoal: (goalId, updates) =>
        set((state) => {
          const goal = state.goals.find((g) => g.id === goalId);
          if (goal) {
            Object.assign(goal, updates, {
              updatedAt: new Date().toISOString(),
            });
          }
        }),

      removeGoal: (goalId) =>
        set((state) => {
          state.goals = state.goals.filter((g) => g.id !== goalId);
        }),

      completeGoal: (goalId) =>
        set((state) => {
          const goal = state.goals.find((g) => g.id === goalId);
          if (goal) {
            goal.status = "completed";
            goal.progress = 100;
            goal.updatedAt = new Date().toISOString();
          }
        }),

      pauseGoal: (goalId) =>
        set((state) => {
          const goal = state.goals.find((g) => g.id === goalId);
          if (goal) {
            goal.status = "paused";
            goal.updatedAt = new Date().toISOString();
          }
        }),

      resumeGoal: (goalId) =>
        set((state) => {
          const goal = state.goals.find((g) => g.id === goalId);
          if (goal) {
            goal.status = "active";
            goal.updatedAt = new Date().toISOString();
          }
        }),

      cancelGoal: (goalId) =>
        set((state) => {
          const goal = state.goals.find((g) => g.id === goalId);
          if (goal) {
            goal.status = "cancelled";
            goal.updatedAt = new Date().toISOString();
          }
        }),

      updateGoalProgress: (goalId, value) =>
        set((state) => {
          const goal = state.goals.find((g) => g.id === goalId);
          if (goal) {
            goal.currentValue = value;
            goal.progress =
              goal.targetValue > 0
                ? Math.min(100, Math.round((value / goal.targetValue) * 100))
                : 0;
            goal.updatedAt = new Date().toISOString();

            if (goal.progress >= 100 && goal.status === "active") {
              goal.status = "completed";
            }
          }
        }),

      addMilestone: (goalId, milestoneData) =>
        set((state) => {
          const goal = state.goals.find((g) => g.id === goalId);
          if (goal) {
            const newMilestone: GoalMilestone = {
              id: `milestone_${Date.now()}`,
              goalId,
              title: milestoneData.title || "Milestone",
              targetValue: milestoneData.targetValue || 0,
              completed: false,
              order: goal.milestones.length + 1,
            };
            goal.milestones.push(newMilestone);
            goal.updatedAt = new Date().toISOString();
          }
        }),

      completeMilestone: (goalId, milestoneId) =>
        set((state) => {
          const goal = state.goals.find((g) => g.id === goalId);
          if (goal) {
            const milestone = goal.milestones.find(
              (m) => m.id === milestoneId
            );
            if (milestone) {
              milestone.completed = true;
              milestone.completedAt = new Date().toISOString();
              goal.updatedAt = new Date().toISOString();
            }
          }
        }),

      removeMilestone: (goalId, milestoneId) =>
        set((state) => {
          const goal = state.goals.find((g) => g.id === goalId);
          if (goal) {
            goal.milestones = goal.milestones.filter(
              (m) => m.id !== milestoneId
            );
            goal.updatedAt = new Date().toISOString();
          }
        }),

      setSelectedGoal: (goalId) =>
        set((state) => {
          state.selectedGoalId = goalId;
        }),

      unlockAchievement: (achievementId) =>
        set((state) => {
          const existing = state.userAchievements.find(
            (ua) => ua.achievementId === achievementId
          );
          if (!existing) {
            const userAchievement: UserAchievement = {
              id: `ua_${Date.now()}`,
              userId: "",
              achievementId,
              achievement: {} as Achievement,
              unlockedAt: new Date().toISOString(),
            };
            state.userAchievements.push(userAchievement);
            state.userStats.achievementsUnlocked =
              state.userAchievements.length;
          }
        }),

      markAchievementSeen: (achievementId) =>
        set((state) => {
          const ua = state.userAchievements.find(
            (a) => a.achievementId === achievementId
          );
          if (ua) {
            ua.seenAt = new Date().toISOString();
          }
        }),

      getUnseenAchievements: () => {
        const { userAchievements } = get();
        return userAchievements.filter((ua) => !ua.seenAt);
      },

      getGoalsByType: (type) => {
        return get().goals.filter((g) => g.type === type);
      },

      getGoalsByStatus: (status) => {
        return get().goals.filter((g) => g.status === status);
      },

      getGoalsByPriority: (priority) => {
        return get().goals.filter((g) => g.priority === priority);
      },

      getActiveGoals: () => {
        return get().goals.filter((g) => g.status === "active");
      },

      getCompletedGoals: () => {
        return get().goals.filter((g) => g.status === "completed");
      },

      getGoalProgress: (goalId) => {
        const goal = get().goals.find((g) => g.id === goalId);
        return goal?.progress || 0;
      },

      getOverallProgress: () => {
        const goals = get().goals.filter((g) => g.status !== "cancelled");
        if (goals.length === 0) return 0;
        const totalProgress = goals.reduce((sum, g) => sum + g.progress, 0);
        return Math.round(totalProgress / goals.length);
      },

      updateUserStats: (updates) =>
        set((state) => {
          Object.assign(state.userStats, updates);
        }),

      addXp: (amount) =>
        set((state) => {
          state.userStats.totalXp += amount;
          const xpPerLevel = 1000;
          const newLevel =
            Math.floor(state.userStats.totalXp / xpPerLevel) + 1;
          state.userStats.level = newLevel;
          state.userStats.xpToNextLevel =
            newLevel * xpPerLevel - state.userStats.totalXp;
          state.userStats.xpProgress =
            ((state.userStats.totalXp % xpPerLevel) / xpPerLevel) * 100;
        }),

      updateStreak: (days) =>
        set((state) => {
          state.userStats.workoutStreak = days;
          if (days > state.userStats.longestWorkoutStreak) {
            state.userStats.longestWorkoutStreak = days;
          }
        }),
    })),
    {
      name: "aifitness-goals",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({
        goals: state.goals.slice(0, 100),
        userAchievements: state.userAchievements,
        userStats: state.userStats,
      }),
    }
  )
);
