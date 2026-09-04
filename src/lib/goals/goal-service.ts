import { z } from "zod";
import {
  addDays,
  addWeeks,
  addMonths,
  differenceInDays,
  differenceInWeeks,
  isAfter,
  isBefore,
  startOfDay,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  parseISO,
  isValid,
} from "date-fns";

// ─── Enums & Constants ──────────────────────────────────────────────

export enum GoalType {
  WEIGHT_LOSS = "WEIGHT_LOSS",
  MUSCLE_GAIN = "MUSCLE_GAIN",
  STRENGTH = "STRENGTH",
  ENDURANCE = "ENDURANCE",
  BODY_COMPOSITION = "BODY_COMPOSITION",
  HABIT = "HABIT",
  PERFORMANCE = "PERFORMANCE",
  NUTRITION = "NUTRITION",
}

export enum GoalStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  ARCHIVED = "ARCHIVED",
}

export enum GoalPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export enum MilestoneStatus {
  PENDING = "PENDING",
  ACHIEVED = "ACHIEVED",
  SKIPPED = "SKIPPED",
}

export enum GoalCategory {
  FITNESS = "FITNESS",
  NUTRITION = "NUTRITION",
  RECOVERY = "RECOVERY",
  MENTAL = "MENTAL",
  LIFESTYLE = "LIFESTYLE",
}

export const GOAL_TYPE_CONFIG: Record<
  GoalType,
  { label: string; icon: string; unit: string; category: GoalCategory }
> = {
  [GoalType.WEIGHT_LOSS]: {
    label: "Weight Loss",
    icon: "📉",
    unit: "kg",
    category: GoalCategory.FITNESS,
  },
  [GoalType.MUSCLE_GAIN]: {
    label: "Muscle Gain",
    icon: "💪",
    unit: "kg",
    category: GoalCategory.FITNESS,
  },
  [GoalType.STRENGTH]: {
    label: "Strength",
    icon: "🏋️",
    unit: "kg",
    category: GoalCategory.FITNESS,
  },
  [GoalType.ENDURANCE]: {
    label: "Endurance",
    icon: "🏃",
    unit: "min",
    category: GoalCategory.FITNESS,
  },
  [GoalType.BODY_COMPOSITION]: {
    label: "Body Composition",
    icon: "📊",
    unit: "%",
    category: GoalCategory.FITNESS,
  },
  [GoalType.HABIT]: {
    label: "Habit",
    icon: "🔄",
    unit: "times",
    category: GoalCategory.LIFESTYLE,
  },
  [GoalType.PERFORMANCE]: {
    label: "Performance",
    icon: "⚡",
    unit: "score",
    category: GoalCategory.FITNESS,
  },
  [GoalType.NUTRITION]: {
    label: "Nutrition",
    icon: "🥗",
    unit: "g",
    category: GoalCategory.NUTRITION,
  },
};

// ─── Validation Schemas ─────────────────────────────────────────────

export const milestoneSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  targetValue: z.number().positive(),
  targetDate: z.string().datetime().optional(),
  status: z.nativeEnum(MilestoneStatus).default(MilestoneStatus.PENDING),
  achievedAt: z.string().datetime().optional(),
  order: z.number().int().min(0).default(0),
});

export const createGoalSchema = z
  .object({
    userId: z.string().uuid(),
    title: z.string().min(3).max(100),
    description: z.string().max(1000).optional(),
    type: z.nativeEnum(GoalType),
    priority: z.nativeEnum(GoalPriority).default(GoalPriority.MEDIUM),
    category: z.nativeEnum(GoalCategory).optional(),
    currentValue: z.number().default(0),
    targetValue: z.number().positive(),
    unit: z.string().max(20).optional(),
    startDate: z.string().datetime(),
    targetDate: z.string().datetime(),
    milestones: z.array(milestoneSchema).optional(),
    metadata: z.record(z.unknown()).optional(),
    isPublic: z.boolean().default(false),
    reminderEnabled: z.boolean().default(true),
    reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    reminderDays: z.array(z.number().int().min(0).max(6)).optional(),
    tags: z.array(z.string().max(30)).max(10).optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const target = new Date(data.targetDate);
      return isAfter(target, start);
    },
    { message: "Target date must be after start date", path: ["targetDate"] }
  );

export const updateGoalSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(1000).optional(),
  priority: z.nativeEnum(GoalPriority).optional(),
  currentValue: z.number().min(0).optional(),
  targetValue: z.number().positive().optional(),
  targetDate: z.string().datetime().optional(),
  status: z.nativeEnum(GoalStatus).optional(),
  metadata: z.record(z.unknown()).optional(),
  isPublic: z.boolean().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reminderDays: z.array(z.number().int().min(0).max(6)).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
});

// ─── Types ──────────────────────────────────────────────────────────

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type MilestoneInput = z.infer<typeof milestoneSchema>;

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  description: string | null;
  targetValue: number;
  targetDate: string | null;
  status: MilestoneStatus;
  achievedAt: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  type: GoalType;
  status: GoalStatus;
  priority: GoalPriority;
  category: GoalCategory;
  currentValue: number;
  targetValue: number;
  unit: string;
  startDate: string;
  targetDate: string;
  completedAt: string | null;
  isPublic: boolean;
  reminderEnabled: boolean;
  reminderTime: string | null;
  reminderDays: number[];
  tags: string[];
  metadata: Record<string, unknown>;
  milestones: Milestone[];
  createdAt: string;
  updatedAt: string;
}

export interface GoalProgress {
  goalId: string;
  currentValue: number;
  targetValue: number;
  percentage: number;
  daysElapsed: number;
  daysRemaining: number;
  totalDays: number;
  expectedProgress: number;
  onTrack: boolean;
  velocity: number;
  estimatedCompletion: string | null;
  milestonesAchieved: number;
  milestonesTotal: number;
}

export interface GoalReminder {
  id: string;
  goalId: string;
  userId: string;
  time: string;
  days: number[];
  enabled: boolean;
  lastSent: string | null;
  nextSend: string | null;
}

export interface GoalHistoryEntry {
  id: string;
  goalId: string;
  action: "created" | "updated" | "completed" | "failed" | "paused" | "resumed" | "milestone_achieved" | "progress_updated";
  previousValue: number | null;
  newValue: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface GoalStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  failedGoals: number;
  averageProgress: number;
  streakDays: number;
  longestStreak: number;
  goalsByType: Record<GoalType, number>;
  goalsByPriority: Record<GoalPriority, number>;
  completionRate: number;
  totalMilestonesAchieved: number;
}

// ─── Service ────────────────────────────────────────────────────────

export class GoalService {
  private goals: Map<string, Goal> = new Map();
  private history: Map<string, GoalHistoryEntry[]> = new Map();
  private reminders: Map<string, GoalReminder> = new Map();

  async createGoal(input: CreateGoalInput): Promise<Goal> {
    const validated = createGoalSchema.parse(input);

    const now = new Date().toISOString();
    const category =
      validated.category || GOAL_TYPE_CONFIG[validated.type].category;

    const goal: Goal = {
      id: crypto.randomUUID(),
      userId: validated.userId,
      title: validated.title,
      description: validated.description ?? null,
      type: validated.type,
      status: GoalStatus.ACTIVE,
      priority: validated.priority,
      category,
      currentValue: validated.currentValue,
      targetValue: validated.targetValue,
      unit: validated.unit || GOAL_TYPE_CONFIG[validated.type].unit,
      startDate: validated.startDate,
      targetDate: validated.targetDate,
      completedAt: null,
      isPublic: validated.isPublic,
      reminderEnabled: validated.reminderEnabled,
      reminderTime: validated.reminderTime ?? null,
      reminderDays: validated.reminderDays ?? [0, 1, 2, 3, 4, 5, 6],
      tags: validated.tags ?? [],
      metadata: validated.metadata ?? {},
      milestones: (validated.milestones ?? []).map((m, i) => ({
        id: m.id || crypto.randomUUID(),
        goalId: "",
        title: m.title,
        description: m.description ?? null,
        targetValue: m.targetValue,
        targetDate: m.targetDate ?? null,
        status: m.status,
        achievedAt: m.achievedAt ?? null,
        order: m.order || i,
        createdAt: now,
        updatedAt: now,
      })),
      createdAt: now,
      updatedAt: now,
    };

    goal.milestones = goal.milestones.map((m) => ({
      ...m,
      goalId: goal.id,
    }));

    goal.milestones.sort((a, b) => a.order - b.order);

    this.goals.set(goal.id, goal);

    if (validated.reminderEnabled && validated.reminderTime) {
      this.createReminder(goal);
    }

    this.recordHistory(goal.id, "created", null, goal.currentValue, {
      title: goal.title,
      type: goal.type,
      targetValue: goal.targetValue,
    });

    return goal;
  }

  async updateGoal(goalId: string, input: UpdateGoalInput): Promise<Goal> {
    const goal = this.goals.get(goalId);
    if (!goal) throw new Error(`Goal ${goalId} not found`);

    const validated = updateGoalSchema.parse(input);
    const previousValue = goal.currentValue;

    if (validated.title !== undefined) goal.title = validated.title;
    if (validated.description !== undefined) goal.description = validated.description;
    if (validated.priority !== undefined) goal.priority = validated.priority;
    if (validated.targetValue !== undefined) goal.targetValue = validated.targetValue;
    if (validated.targetDate !== undefined) goal.targetDate = validated.targetDate;
    if (validated.metadata !== undefined) goal.metadata = validated.metadata;
    if (validated.isPublic !== undefined) goal.isPublic = validated.isPublic;
    if (validated.tags !== undefined) goal.tags = validated.tags;

    if (validated.currentValue !== undefined) {
      goal.currentValue = validated.currentValue;
      this.recordHistory(goal.id, "progress_updated", previousValue, validated.currentValue);
    }

    if (validated.status !== undefined) {
      const oldStatus = goal.status;
      goal.status = validated.status;

      if (validated.status === GoalStatus.COMPLETED) {
        goal.completedAt = new Date().toISOString();
        this.recordHistory(goal.id, "completed", null, goal.currentValue, {
          previousStatus: oldStatus,
        });
      } else if (validated.status === GoalStatus.FAILED) {
        this.recordHistory(goal.id, "failed", null, goal.currentValue, {
          previousStatus: oldStatus,
        });
      } else if (validated.status === GoalStatus.PAUSED) {
        this.recordHistory(goal.id, "paused", null, goal.currentValue);
      } else if (validated.status === GoalStatus.ACTIVE && oldStatus === GoalStatus.PAUSED) {
        this.recordHistory(goal.id, "resumed", null, goal.currentValue);
      }
    }

    if (validated.reminderEnabled !== undefined) {
      goal.reminderEnabled = validated.reminderEnabled;
      if (validated.reminderEnabled) {
        this.createReminder(goal);
      } else {
        this.reminders.delete(goal.id);
      }
    }
    if (validated.reminderTime !== undefined) goal.reminderTime = validated.reminderTime;
    if (validated.reminderDays !== undefined) goal.reminderDays = validated.reminderDays;

    goal.updatedAt = new Date().toISOString();

    return goal;
  }

  async getGoal(goalId: string): Promise<Goal | null> {
    return this.goals.get(goalId) ?? null;
  }

  async getUserGoals(
    userId: string,
    options?: {
      status?: GoalStatus;
      type?: GoalType;
      category?: GoalCategory;
      priority?: GoalPriority;
      limit?: number;
      offset?: number;
      sortBy?: "createdAt" | "targetDate" | "progress" | "priority";
      sortOrder?: "asc" | "desc";
    }
  ): Promise<{ goals: Goal[]; total: number }> {
    let userGoals = Array.from(this.goals.values()).filter(
      (g) => g.userId === userId
    );

    if (options?.status) {
      userGoals = userGoals.filter((g) => g.status === options.status);
    }
    if (options?.type) {
      userGoals = userGoals.filter((g) => g.type === options.type);
    }
    if (options?.category) {
      userGoals = userGoals.filter((g) => g.category === options.category);
    }
    if (options?.priority) {
      userGoals = userGoals.filter((g) => g.priority === options.priority);
    }

    const total = userGoals.length;

    switch (options?.sortBy) {
      case "targetDate":
        userGoals.sort((a, b) =>
          options.sortOrder === "asc"
            ? new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
            : new Date(b.targetDate).getTime() - new Date(a.targetDate).getTime()
        );
        break;
      case "progress":
        userGoals.sort((a, b) => {
          const progressA = a.targetValue > 0 ? (a.currentValue / a.targetValue) * 100 : 0;
          const progressB = b.targetValue > 0 ? (b.currentValue / b.targetValue) * 100 : 0;
          return options.sortOrder === "asc" ? progressA - progressB : progressB - progressA;
        });
        break;
      case "priority":
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        userGoals.sort((a, b) =>
          options.sortOrder === "asc"
            ? priorityOrder[a.priority] - priorityOrder[b.priority]
            : priorityOrder[b.priority] - priorityOrder[a.priority]
        );
        break;
      default:
        userGoals.sort((a, b) =>
          options?.sortOrder === "asc"
            ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    userGoals = userGoals.slice(offset, offset + limit);

    return { goals: userGoals, total };
  }

  async deleteGoal(goalId: string): Promise<boolean> {
    const goal = this.goals.get(goalId);
    if (!goal) return false;

    this.recordHistory(goalId, "failed", goal.currentValue, null, {
      deleted: true,
    });

    this.goals.delete(goalId);
    this.reminders.delete(goalId);
    return true;
  }

  async calculateProgress(goalId: string): Promise<GoalProgress> {
    const goal = this.goals.get(goalId);
    if (!goal) throw new Error(`Goal ${goalId} not found`);

    const now = startOfDay(new Date());
    const start = startOfDay(parseISO(goal.startDate));
    const target = startOfDay(parseISO(goal.targetDate));

    const totalDays = Math.max(differenceInDays(target, start), 1);
    const daysElapsed = Math.max(differenceInDays(now, start), 0);
    const daysRemaining = Math.max(differenceInDays(target, now), 0);

    const percentage =
      goal.targetValue > 0
        ? Math.min((goal.currentValue / goal.targetValue) * 100, 100)
        : 0;

    const expectedProgress =
      totalDays > 0 ? Math.min((daysElapsed / totalDays) * 100, 100) : 0;

    const onTrack = percentage >= expectedProgress * 0.9;

    const velocity =
      daysElapsed > 0
        ? (goal.currentValue - (goal.metadata.initialValue as number || 0)) /
          daysElapsed
        : 0;

    const remainingValue = goal.targetValue - goal.currentValue;
    let estimatedCompletion: string | null = null;
    if (velocity > 0 && remainingValue > 0) {
      const daysNeeded = Math.ceil(remainingValue / velocity);
      estimatedCompletion = addDays(now, daysNeeded).toISOString();
    }

    const milestonesAchieved = goal.milestones.filter(
      (m) => m.status === MilestoneStatus.ACHIEVED
    ).length;

    return {
      goalId: goal.id,
      currentValue: goal.currentValue,
      targetValue: goal.targetValue,
      percentage: Math.round(percentage * 100) / 100,
      daysElapsed,
      daysRemaining,
      totalDays,
      expectedProgress: Math.round(expectedProgress * 100) / 100,
      onTrack,
      velocity: Math.round(velocity * 1000) / 1000,
      estimatedCompletion,
      milestonesAchieved,
      milestonesTotal: goal.milestones.length,
    };
  }

  async updateProgress(
    goalId: string,
    newValue: number
  ): Promise<GoalProgress> {
    const goal = this.goals.get(goalId);
    if (!goal) throw new Error(`Goal ${goalId} not found`);
    if (goal.status !== GoalStatus.ACTIVE) {
      throw new Error(`Goal ${goalId} is not active`);
    }

    const previousValue = goal.currentValue;
    goal.currentValue = newValue;
    goal.updatedAt = new Date().toISOString();

    this.recordHistory(
      goalId,
      "progress_updated",
      previousValue,
      newValue
    );

    for (const milestone of goal.milestones) {
      if (
        milestone.status === MilestoneStatus.PENDING &&
        newValue >= milestone.targetValue
      ) {
        milestone.status = MilestoneStatus.ACHIEVED;
        milestone.achievedAt = new Date().toISOString();
        milestone.updatedAt = new Date().toISOString();

        this.recordHistory(
          goalId,
          "milestone_achieved",
          previousValue,
          newValue,
          { milestoneId: milestone.id, milestoneTitle: milestone.title }
        );
      }
    }

    if (newValue >= goal.targetValue) {
      goal.status = GoalStatus.COMPLETED;
      goal.completedAt = new Date().toISOString();
      this.recordHistory(goalId, "completed", previousValue, newValue);
    }

    return this.calculateProgress(goalId);
  }

  async achieveMilestone(
    goalId: string,
    milestoneId: string
  ): Promise<Milestone | null> {
    const goal = this.goals.get(goalId);
    if (!goal) throw new Error(`Goal ${goalId} not found`);

    const milestone = goal.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return null;

    if (milestone.status === MilestoneStatus.ACHIEVED) return milestone;

    milestone.status = MilestoneStatus.ACHIEVED;
    milestone.achievedAt = new Date().toISOString();
    milestone.updatedAt = new Date().toISOString();

    this.recordHistory(
      goalId,
      "milestone_achieved",
      null,
      goal.currentValue,
      { milestoneId: milestone.id, milestoneTitle: milestone.title }
    );

    return milestone;
  }

  async getGoalHistory(goalId: string): Promise<GoalHistoryEntry[]> {
    return this.history.get(goalId) ?? [];
  }

  async getGoalStats(userId: string): Promise<GoalStats> {
    const userGoals = Array.from(this.goals.values()).filter(
      (g) => g.userId === userId
    );

    const activeGoals = userGoals.filter(
      (g) => g.status === GoalStatus.ACTIVE
    ).length;
    const completedGoals = userGoals.filter(
      (g) => g.status === GoalStatus.COMPLETED
    ).length;
    const failedGoals = userGoals.filter(
      (g) => g.status === GoalStatus.FAILED
    ).length;

    const totalMilestonesAchieved = userGoals.reduce(
      (sum, g) =>
        sum + g.milestones.filter((m) => m.status === MilestoneStatus.ACHIEVED).length,
      0
    );

    let averageProgress = 0;
    const activeGoalObjs = userGoals.filter((g) => g.status === GoalStatus.ACTIVE);
    if (activeGoalObjs.length > 0) {
      const totalProgress = activeGoalObjs.reduce((sum, g) => {
        return (
          sum +
          (g.targetValue > 0
            ? (g.currentValue / g.targetValue) * 100
            : 0)
        );
      }, 0);
      averageProgress = totalProgress / activeGoalObjs.length;
    }

    const goalsByType = Object.values(GoalType).reduce((acc, type) => {
      acc[type] = userGoals.filter((g) => g.type === type).length;
      return acc;
    }, {} as Record<GoalType, number>);

    const goalsByPriority = Object.values(GoalPriority).reduce((acc, p) => {
      acc[p] = userGoals.filter((g) => g.priority === p).length;
      return acc;
    }, {} as Record<GoalPriority, number>);

    const { streak, longestStreak } = this.calculateStreaks(userGoals);

    const totalFinished = completedGoals + failedGoals;
    const completionRate =
      totalFinished > 0 ? (completedGoals / totalFinished) * 100 : 0;

    return {
      totalGoals: userGoals.length,
      activeGoals,
      completedGoals,
      failedGoals,
      averageProgress: Math.round(averageProgress * 100) / 100,
      streakDays: streak,
      longestStreak,
      goalsByType,
      goalsByPriority,
      completionRate: Math.round(completionRate * 100) / 100,
      totalMilestonesAchieved,
    };
  }

  async getDueReminders(): Promise<
    Array<{ reminder: GoalReminder; goal: Goal }>
  > {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = format(now, "HH:mm");
    const results: Array<{ reminder: GoalReminder; goal: Goal }> = [];

    for (const reminder of this.reminders.values()) {
      if (!reminder.enabled) continue;
      if (!reminder.days.includes(currentDay)) continue;

      if (reminder.time <= currentTime) {
        const goal = this.goals.get(reminder.goalId);
        if (goal && goal.status === GoalStatus.ACTIVE) {
          results.push({ reminder, goal });
        }
      }
    }

    return results;
  }

  async getGoalCalendarData(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<
    Array<{
      date: string;
      activeGoals: number;
      completedGoals: number;
      milestones: Array<{ goalId: string; title: string }>;
    }>
  > {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const userGoals = Array.from(this.goals.values()).filter(
      (g) => g.userId === userId
    );

    const days = eachDayOfInterval({ start, end });

    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayDate = startOfDay(day);

      const activeGoals = userGoals.filter((g) => {
        const gStart = startOfDay(parseISO(g.startDate));
        const gEnd = startOfDay(parseISO(g.targetDate));
        return (
          (isBefore(gStart, dayDate) || gStart.getTime() === dayDate.getTime()) &&
          (isAfter(gEnd, dayDate) || gEnd.getTime() === dayDate.getTime()) &&
          g.status === GoalStatus.ACTIVE
        );
      }).length;

      const completedGoals = userGoals.filter((g) => {
        if (!g.completedAt) return false;
        return format(parseISO(g.completedAt), "yyyy-MM-dd") === dayStr;
      }).length;

      const milestones = userGoals.flatMap((g) =>
        g.milestones
          .filter(
            (m) =>
              m.status === MilestoneStatus.ACHIEVED &&
              m.achievedAt &&
              format(parseISO(m.achievedAt), "yyyy-MM-dd") === dayStr
          )
          .map((m) => ({ goalId: g.id, title: m.title }))
      );

      return { date: dayStr, activeGoals, completedGoals, milestones };
    });
  }

  async pauseGoal(goalId: string): Promise<Goal> {
    return this.updateGoal(goalId, { status: GoalStatus.PAUSED });
  }

  async resumeGoal(goalId: string): Promise<Goal> {
    return this.updateGoal(goalId, { status: GoalStatus.ACTIVE });
  }

  async completeGoal(goalId: string): Promise<Goal> {
    const goal = this.goals.get(goalId);
    if (!goal) throw new Error(`Goal ${goalId} not found`);
    return this.updateGoal(goalId, {
      status: GoalStatus.COMPLETED,
      currentValue: goal.targetValue,
    });
  }

  async getPublicGoals(
    options?: {
      type?: GoalType;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ goals: Goal[]; total: number }> {
    let publicGoals = Array.from(this.goals.values()).filter(
      (g) => g.isPublic && g.status === GoalStatus.ACTIVE
    );

    if (options?.type) {
      publicGoals = publicGoals.filter((g) => g.type === options.type);
    }

    publicGoals.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = publicGoals.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;

    return { goals: publicGoals.slice(offset, offset + limit), total };
  }

  async getUpcomingMilestones(
    userId: string,
    daysAhead: number = 7
  ): Promise<Array<{ goal: Goal; milestone: Milestone; daysUntil: number }>> {
    const userGoals = Array.from(this.goals.values()).filter(
      (g) => g.userId === userId && g.status === GoalStatus.ACTIVE
    );

    const now = startOfDay(new Date());
    const cutoff = addDays(now, daysAhead);

    const upcoming: Array<{ goal: Goal; milestone: Milestone; daysUntil: number }> = [];

    for (const goal of userGoals) {
      for (const milestone of goal.milestones) {
        if (
          milestone.status === MilestoneStatus.PENDING &&
          milestone.targetDate
        ) {
          const milestoneDate = parseISO(milestone.targetDate);
          if (
            isAfter(milestoneDate, now) &&
            isBefore(milestoneDate, cutoff)
          ) {
            upcoming.push({
              goal,
              milestone,
              daysUntil: differenceInDays(milestoneDate, now),
            });
          }
        }
      }
    }

    upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
    return upcoming;
  }

  private createReminder(goal: Goal): void {
    if (!goal.reminderTime) return;

    const reminder: GoalReminder = {
      id: crypto.randomUUID(),
      goalId: goal.id,
      userId: goal.userId,
      time: goal.reminderTime,
      days: goal.reminderDays,
      enabled: true,
      lastSent: null,
      nextSend: null,
    };

    this.reminders.set(goal.id, reminder);
  }

  private recordHistory(
    goalId: string,
    action: GoalHistoryEntry["action"],
    previousValue: number | null,
    newValue: number | null,
    metadata: Record<string, unknown> = {}
  ): void {
    const entry: GoalHistoryEntry = {
      id: crypto.randomUUID(),
      goalId,
      action,
      previousValue,
      newValue,
      metadata,
      createdAt: new Date().toISOString(),
    };

    const history = this.history.get(goalId) ?? [];
    history.push(entry);
    this.history.set(goalId, history);
  }

  private calculateStreaks(goals: Goal[]): {
    streak: number;
    longestStreak: number;
  } {
    const progressDates = new Set<string>();

    for (const goal of goals) {
      const historyEntries = this.history.get(goal.id) ?? [];
      for (const entry of historyEntries) {
        if (entry.action === "progress_updated" || entry.action === "milestone_achieved") {
          progressDates.add(format(parseISO(entry.createdAt), "yyyy-MM-dd"));
        }
      }
    }

    if (progressDates.size === 0) return { streak: 0, longestStreak: 0 };

    const sortedDates = Array.from(progressDates).sort().reverse();
    const today = format(new Date(), "yyyy-MM-dd");

    let streak = 0;
    let checkDate = startOfDay(new Date());

    while (progressDates.has(format(checkDate, "yyyy-MM-dd"))) {
      streak++;
      checkDate = addDays(checkDate, -1);
    }

    let longestStreak = 0;
    let currentStreak = 0;
    const allDates = Array.from(progressDates).sort();

    for (let i = 0; i < allDates.length; i++) {
      if (i === 0) {
        currentStreak = 1;
      } else {
        const prev = parseISO(allDates[i - 1]);
        const curr = parseISO(allDates[i]);
        const diff = differenceInDays(curr, prev);

        if (diff === 1) {
          currentStreak++;
        } else {
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak);

    return { streak, longestStreak };
  }
}

export const goalService = new GoalService();
