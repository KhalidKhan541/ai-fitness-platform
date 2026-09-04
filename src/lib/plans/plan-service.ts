import { z } from "zod";
import {
  addDays,
  addWeeks,
  format,
  parseISO,
  differenceInDays,
  startOfWeek,
  eachDayOfInterval,
  isAfter,
  isBefore,
} from "date-fns";

// ─── Enums & Constants ──────────────────────────────────────────────

export enum PlanType {
  STRENGTH = "STRENGTH",
  HYPERTROPHY = "HYPERTROPHY",
  ENDURANCE = "ENDURANCE",
  WEIGHT_LOSS = "WEIGHT_LOSS",
  GENERAL_FITNESS = "GENERAL_FITNESS",
  SPORT_SPECIFIC = "SPORT_SPECIFIC",
  REHABILITATION = "REHABILITATION",
  CUSTOM = "CUSTOM",
}

export enum PlanDifficulty {
  BEGINNER = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  ADVANCED = "ADVANCED",
  ELITE = "ELITE",
}

export enum PlanStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
}

export enum WorkoutDayType {
  WORKOUT = "WORKOUT",
  REST = "REST",
  ACTIVE_RECOVERY = "ACTIVE_RECOVERY",
  DELoad = "DELOAD",
}

export enum ExerciseCategory {
  COMPOUND = "COMPOUND",
  ISOLATION = "ISOLATION",
  CARDIO = "CARDIO",
  FLEXIBILITY = "FLEXIBILITY",
  PLYOMETRIC = "PLYOMETRIC",
}

export const PLAN_TYPE_CONFIG: Record<
  PlanType,
  { label: string; icon: string; description: string; defaultDurationWeeks: number }
> = {
  [PlanType.STRENGTH]: {
    label: "Strength",
    icon: "🏋️",
    description: "Build raw strength with heavy compound lifts",
    defaultDurationWeeks: 12,
  },
  [PlanType.HYPERTROPHY]: {
    label: "Hypertrophy",
    icon: "💪",
    description: "Maximize muscle growth with volume training",
    defaultDurationWeeks: 8,
  },
  [PlanType.ENDURANCE]: {
    label: "Endurance",
    icon: "🏃",
    description: "Build cardiovascular endurance",
    defaultDurationWeeks: 16,
  },
  [PlanType.WEIGHT_LOSS]: {
    label: "Weight Loss",
    icon: "📉",
    description: "Burn fat and lose weight",
    defaultDurationWeeks: 12,
  },
  [PlanType.GENERAL_FITNESS]: {
    label: "General Fitness",
    icon: "⚡",
    description: "Well-rounded fitness program",
    defaultDurationWeeks: 8,
  },
  [PlanType.SPORT_SPECIFIC]: {
    label: "Sport Specific",
    icon: "🏅",
    description: "Training for specific sports",
    defaultDurationWeeks: 12,
  },
  [PlanType.REHABILITATION]: {
    label: "Rehabilitation",
    icon: "🩹",
    description: "Recovery and rehabilitation program",
    defaultDurationWeeks: 6,
  },
  [PlanType.CUSTOM]: {
    label: "Custom",
    icon: "⚙️",
    description: "Create your own training plan",
    defaultDurationWeeks: 4,
  },
};

export const DIFFICULTY_CONFIG: Record<
  PlanDifficulty,
  { label: string; color: string; experienceRequired: string }
> = {
  [PlanDifficulty.BEGINNER]: {
    label: "Beginner",
    color: "#22c55e",
    experienceRequired: "0-6 months",
  },
  [PlanDifficulty.INTERMEDIATE]: {
    label: "Intermediate",
    color: "#f59e0b",
    experienceRequired: "6-18 months",
  },
  [PlanDifficulty.ADVANCED]: {
    label: "Advanced",
    color: "#f97316",
    experienceRequired: "18-36 months",
  },
  [PlanDifficulty.ELITE]: {
    label: "Elite",
    color: "#ef4444",
    experienceRequired: "3+ years",
  },
};

// ─── Validation Schemas ─────────────────────────────────────────────

export const exerciseSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.nativeEnum(ExerciseCategory),
  sets: z.number().int().min(1).max(20),
  reps: z.string().min(1).max(20),
  weight: z.number().min(0).optional(),
  restSeconds: z.number().int().min(0).max(600).optional(),
  tempo: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
  supersetWith: z.number().int().optional(),
  targetMuscles: z.array(z.string()).optional(),
  equipment: z.string().max(50).optional(),
  duration: z.number().int().min(0).optional(),
  distance: z.number().min(0).optional(),
});

export const workoutDaySchema = z.object({
  dayNumber: z.number().int().min(1).max(7),
  dayType: z.nativeEnum(WorkoutDayType),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  exercises: z.array(exerciseSchema).optional(),
  targetMuscles: z.array(z.string()).optional(),
  estimatedDuration: z.number().int().min(0).optional(),
  estimatedCalories: z.number().int().min(0).optional(),
  warmup: z.array(z.string()).optional(),
  cooldown: z.array(z.string()).optional(),
});

export const weekSchema = z.object({
  weekNumber: z.number().int().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  days: z.array(workoutDaySchema).min(1).max(7),
  isDeload: z.boolean().default(false),
  focus: z.string().max(200).optional(),
});

export const createPlanSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(3).max(100),
  description: z.string().max(2000).optional(),
  type: z.nativeEnum(PlanType),
  difficulty: z.nativeEnum(PlanDifficulty),
  startDate: z.string().datetime(),
  durationWeeks: z.number().int().min(1).max(52),
  weeks: z.array(weekSchema).optional(),
  goals: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  isPublic: z.boolean().default(false),
  templateId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updatePlanSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(2000).optional(),
  status: z.nativeEnum(PlanStatus).optional(),
  startDate: z.string().datetime().optional(),
  weeks: z.array(weekSchema).optional(),
  goals: z.array(z.string()).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  isPublic: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ─── Types ──────────────────────────────────────────────────────────

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type ExerciseInput = z.infer<typeof exerciseSchema>;
export type WorkoutDayInput = z.infer<typeof workoutDaySchema>;
export type WeekInput = z.infer<typeof weekSchema>;

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  sets: number;
  reps: string;
  weight: number | null;
  restSeconds: number | null;
  tempo: string | null;
  notes: string | null;
  supersetWith: number | null;
  targetMuscles: string[];
  equipment: string | null;
  duration: number | null;
  distance: number | null;
}

export interface WorkoutDay {
  id: string;
  dayNumber: number;
  dayType: WorkoutDayType;
  name: string;
  description: string | null;
  exercises: Exercise[];
  targetMuscles: string[];
  estimatedDuration: number | null;
  estimatedCalories: number | null;
  warmup: string[];
  cooldown: string[];
}

export interface Week {
  id: string;
  weekNumber: number;
  name: string;
  description: string | null;
  days: WorkoutDay[];
  isDeload: boolean;
  focus: string | null;
}

export interface TrainingPlan {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: PlanType;
  difficulty: PlanDifficulty;
  status: PlanStatus;
  startDate: string;
  endDate: string;
  durationWeeks: number;
  currentWeek: number;
  currentDay: number;
  weeks: Week[];
  goals: string[];
  equipment: string[];
  tags: string[];
  isPublic: boolean;
  templateId: string | null;
  metadata: Record<string, unknown>;
  completionPercentage: number;
  totalWorkouts: number;
  completedWorkouts: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanProgress {
  planId: string;
  currentWeek: number;
  currentDay: number;
  totalWeeks: number;
  completionPercentage: number;
  daysRemaining: number;
  workoutsCompleted: number;
  totalWorkouts: number;
  streak: number;
  adherenceRate: number;
  weekProgress: Array<{
    weekNumber: number;
    completed: boolean;
    workoutsCompleted: number;
    totalWorkouts: number;
  }>;
}

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  type: PlanType;
  difficulty: PlanDifficulty;
  durationWeeks: number;
  weeks: Week[];
  goals: string[];
  equipment: string[];
  usageCount: number;
  rating: number;
  authorId: string;
  isOfficial: boolean;
  tags: string[];
  createdAt: string;
}

export interface PlanStats {
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  totalWorkoutsCompleted: number;
  totalTimeSpent: number;
  averageAdherence: number;
  plansByType: Record<PlanType, number>;
  plansByDifficulty: Record<PlanDifficulty, number>;
}

// ─── Service ────────────────────────────────────────────────────────

export class PlanService {
  private plans: Map<string, TrainingPlan> = new Map();
  private templates: Map<string, PlanTemplate> = new Map();
  private workoutLog: Map<string, Array<{
    planId: string;
    weekNumber: number;
    dayNumber: number;
    completedAt: string;
    duration: number;
    notes: string;
  }>> = new Map();

  async createPlan(input: CreatePlanInput): Promise<TrainingPlan> {
    const validated = createPlanSchema.parse(input);
    const now = new Date().toISOString();
    const startDate = parseISO(validated.startDate);
    const endDate = addWeeks(startDate, validated.durationWeeks);

    const weeks =
      validated.weeks ??
      this.generateDefaultWeeks(
        validated.durationWeeks,
        validated.type,
        validated.difficulty
      );

    const totalWorkouts = weeks.reduce(
      (sum, week) =>
        sum +
        week.days.filter((d) => d.dayType === WorkoutDayType.WORKOUT).length,
      0
    );

    const plan: TrainingPlan = {
      id: crypto.randomUUID(),
      userId: validated.userId,
      name: validated.name,
      description: validated.description ?? null,
      type: validated.type,
      difficulty: validated.difficulty,
      status: PlanStatus.ACTIVE,
      startDate: validated.startDate,
      endDate: endDate.toISOString(),
      durationWeeks: validated.durationWeeks,
      currentWeek: 1,
      currentDay: 1,
      weeks: weeks.map((w, wi) => ({
        ...w,
        id: crypto.randomUUID(),
        days: w.days.map((d) => ({
          ...d,
          id: crypto.randomUUID(),
          exercises: (d.exercises ?? []).map((e) => ({
            ...e,
            id: crypto.randomUUID(),
            targetMuscles: e.targetMuscles ?? [],
          })),
          targetMuscles: d.targetMuscles ?? [],
          warmup: d.warmup ?? [],
          cooldown: d.cooldown ?? [],
        })),
      })),
      goals: validated.goals ?? [],
      equipment: validated.equipment ?? [],
      tags: validated.tags ?? [],
      isPublic: validated.isPublic,
      templateId: validated.templateId ?? null,
      metadata: validated.metadata ?? {},
      completionPercentage: 0,
      totalWorkouts,
      completedWorkouts: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  async updatePlan(planId: string, input: UpdatePlanInput): Promise<TrainingPlan> {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);

    const validated = updatePlanSchema.parse(input);

    if (validated.name !== undefined) plan.name = validated.name;
    if (validated.description !== undefined) plan.description = validated.description;
    if (validated.startDate !== undefined) plan.startDate = validated.startDate;
    if (validated.goals !== undefined) plan.goals = validated.goals;
    if (validated.tags !== undefined) plan.tags = validated.tags;
    if (validated.isPublic !== undefined) plan.isPublic = validated.isPublic;
    if (validated.metadata !== undefined) plan.metadata = validated.metadata;

    if (validated.weeks !== undefined) {
      plan.weeks = validated.weeks.map((w) => ({
        ...w,
        id: crypto.randomUUID(),
        days: w.days.map((d) => ({
          ...d,
          id: crypto.randomUUID(),
          exercises: (d.exercises ?? []).map((e) => ({
            ...e,
            id: crypto.randomUUID(),
            targetMuscles: e.targetMuscles ?? [],
          })),
          targetMuscles: d.targetMuscles ?? [],
          warmup: d.warmup ?? [],
          cooldown: d.cooldown ?? [],
        })),
      }));
    }

    if (validated.status !== undefined) {
      plan.status = validated.status;
    }

    plan.updatedAt = new Date().toISOString();
    return plan;
  }

  async getPlan(planId: string): Promise<TrainingPlan | null> {
    return this.plans.get(planId) ?? null;
  }

  async getUserPlans(
    userId: string,
    options?: {
      status?: PlanStatus;
      type?: PlanType;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ plans: TrainingPlan[]; total: number }> {
    let userPlans = Array.from(this.plans.values()).filter(
      (p) => p.userId === userId
    );

    if (options?.status) {
      userPlans = userPlans.filter((p) => p.status === options.status);
    }
    if (options?.type) {
      userPlans = userPlans.filter((p) => p.type === options.type);
    }

    userPlans.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = userPlans.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 20;

    return { plans: userPlans.slice(offset, offset + limit), total };
  }

  async deletePlan(planId: string, userId: string): Promise<boolean> {
    const plan = this.plans.get(planId);
    if (!plan || plan.userId !== userId) return false;

    this.plans.delete(planId);
    this.workoutLog.delete(planId);
    return true;
  }

  async completeWorkoutDay(
    planId: string,
    weekNumber: number,
    dayNumber: number,
    duration: number,
    notes: string = ""
  ): Promise<PlanProgress> {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);

    const log = this.workoutLog.get(planId) ?? [];
    log.push({
      planId,
      weekNumber,
      dayNumber,
      completedAt: new Date().toISOString(),
      duration,
      notes,
    });
    this.workoutLog.set(planId, log);

    plan.completedWorkouts = log.length;
    plan.completionPercentage =
      plan.totalWorkouts > 0
        ? Math.round((plan.completedWorkouts / plan.totalWorkouts) * 100 * 100) / 100
        : 0;

    if (weekNumber > plan.currentWeek || (weekNumber === plan.currentWeek && dayNumber > plan.currentDay)) {
      plan.currentWeek = weekNumber;
      plan.currentDay = dayNumber;
    }

    plan.updatedAt = new Date().toISOString();

    return this.getProgress(planId);
  }

  async getProgress(planId: string): Promise<PlanProgress> {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error(`Plan ${planId} not found`);

    const log = this.workoutLog.get(planId) ?? [];
    const now = new Date();
    const endDate = parseISO(plan.endDate);
    const daysRemaining = Math.max(differenceInDays(endDate, now), 0);

    const weekProgress = plan.weeks.map((week) => {
      const weekLogs = log.filter(
        (l) => l.weekNumber === week.weekNumber
      );
      const totalWorkoutsInWeek = week.days.filter(
        (d) => d.dayType === WorkoutDayType.WORKOUT
      ).length;

      return {
        weekNumber: week.weekNumber,
        completed: weekLogs.length >= totalWorkoutsInWeek,
        workoutsCompleted: weekLogs.length,
        totalWorkouts: totalWorkoutsInWeek,
      };
    });

    const completedWeeks = weekProgress.filter((w) => w.completed).length;
    const adherenceRate =
      plan.totalWorkouts > 0
        ? Math.round((log.length / plan.totalWorkouts) * 100 * 100) / 100
        : 0;

    const streak = this.calculatePlanStreak(planId);

    return {
      planId,
      currentWeek: plan.currentWeek,
      currentDay: plan.currentDay,
      totalWeeks: plan.durationWeeks,
      completionPercentage: plan.completionPercentage,
      daysRemaining,
      workoutsCompleted: log.length,
      totalWorkouts: plan.totalWorkouts,
      streak,
      adherenceRate,
      weekProgress,
    };
  }

  async pausePlan(planId: string): Promise<TrainingPlan> {
    return this.updatePlan(planId, { status: PlanStatus.PAUSED });
  }

  async resumePlan(planId: string): Promise<TrainingPlan> {
    return this.updatePlan(planId, { status: PlanStatus.ACTIVE });
  }

  async completePlan(planId: string): Promise<TrainingPlan> {
    return this.updatePlan(planId, { status: PlanStatus.COMPLETED });
  }

  async getPlanStats(userId: string): Promise<PlanStats> {
    const userPlans = Array.from(this.plans.values()).filter(
      (p) => p.userId === userId
    );

    const activePlans = userPlans.filter(
      (p) => p.status === PlanStatus.ACTIVE
    ).length;
    const completedPlans = userPlans.filter(
      (p) => p.status === PlanStatus.COMPLETED
    ).length;

    let totalWorkoutsCompleted = 0;
    let totalTimeSpent = 0;

    for (const plan of userPlans) {
      const log = this.workoutLog.get(plan.id) ?? [];
      totalWorkoutsCompleted += log.length;
      totalTimeSpent += log.reduce((sum, l) => sum + l.duration, 0);
    }

    const plansByType = Object.values(PlanType).reduce((acc, type) => {
      acc[type] = userPlans.filter((p) => p.type === type).length;
      return acc;
    }, {} as Record<PlanType, number>);

    const plansByDifficulty = Object.values(PlanDifficulty).reduce((acc, d) => {
      acc[d] = userPlans.filter((p) => p.difficulty === d).length;
      return acc;
    }, {} as Record<PlanDifficulty, number>);

    const averageAdherence =
      userPlans.length > 0
        ? Math.round(
            (userPlans.reduce((sum, p) => sum + p.completionPercentage, 0) /
              userPlans.length) *
              100
          ) / 100
        : 0;

    return {
      totalPlans: userPlans.length,
      activePlans,
      completedPlans,
      totalWorkoutsCompleted,
      totalTimeSpent,
      averageAdherence,
      plansByType,
      plansByDifficulty,
    };
  }

  async getTemplates(
    options?: {
      type?: PlanType;
      difficulty?: PlanDifficulty;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ templates: PlanTemplate[]; total: number }> {
    let templates = Array.from(this.templates.values());

    if (options?.type) {
      templates = templates.filter((t) => t.type === options.type);
    }
    if (options?.difficulty) {
      templates = templates.filter((t) => t.difficulty === options.difficulty);
    }

    templates.sort((a, b) => b.usageCount - a.usageCount);

    const total = templates.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 20;

    return { templates: templates.slice(offset, offset + limit), total };
  }

  async createFromTemplate(
    templateId: string,
    userId: string,
    startDate: string,
    customizations?: {
      name?: string;
      goals?: string[];
      equipment?: string[];
    }
  ): Promise<TrainingPlan> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error(`Template ${templateId} not found`);

    template.usageCount++;

    return this.createPlan({
      userId,
      name: customizations?.name ?? template.name,
      description: template.description,
      type: template.type,
      difficulty: template.difficulty,
      startDate,
      durationWeeks: template.durationWeeks,
      weeks: template.weeks,
      goals: customizations?.goals ?? template.goals,
      equipment: customizations?.equipment ?? template.equipment,
      templateId,
    });
  }

  async sharePlan(
    planId: string,
    userId: string
  ): Promise<TrainingPlan> {
    const plan = this.plans.get(planId);
    if (!plan || plan.userId !== userId) {
      throw new Error("Plan not found or not owned by user");
    }

    plan.isPublic = true;
    plan.updatedAt = new Date().toISOString();
    return plan;
  }

  async getPublicPlans(
    options?: {
      type?: PlanType;
      difficulty?: PlanDifficulty;
      limit?: number;
      offset?: number;
      sortBy?: "newest" | "popular" | "highest_rated";
    }
  ): Promise<{ plans: TrainingPlan[]; total: number }> {
    let plans = Array.from(this.plans.values()).filter(
      (p) => p.isPublic
    );

    if (options?.type) {
      plans = plans.filter((p) => p.type === options.type);
    }
    if (options?.difficulty) {
      plans = plans.filter((p) => p.difficulty === options.difficulty);
    }

    plans.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = plans.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 20;

    return { plans: plans.slice(offset, offset + limit), total };
  }

  async getWorkoutHistory(
    planId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<
    Array<{
      weekNumber: number;
      dayNumber: number;
      completedAt: string;
      duration: number;
      notes: string;
    }>
  > {
    const log = this.workoutLog.get(planId) ?? [];

    const sorted = [...log].sort(
      (a, b) =>
        new Date(b.completedAt).getTime() -
        new Date(a.completedAt).getTime()
    );

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;

    return sorted.slice(offset, offset + limit);
  }

  private generateDefaultWeeks(
    durationWeeks: number,
    type: PlanType,
    difficulty: PlanDifficulty
  ): WeekInput[] {
    const weeks: WeekInput[] = [];
    const isStrength = type === PlanType.STRENGTH || type === PlanType.HYPERTROPHY;
    const isEndurance = type === PlanType.ENDURANCE;

    for (let w = 1; w <= durationWeeks; w++) {
      const isDeload = w % 4 === 0;
      const weekDays: WorkoutDayInput[] = [];

      if (isEndurance) {
        weekDays.push(
          { dayNumber: 1, dayType: WorkoutDayType.WORKOUT, name: "Easy Run", exercises: [], estimatedDuration: 30 },
          { dayNumber: 2, dayType: WorkoutDayType.WORKOUT, name: "Tempo Run", exercises: [], estimatedDuration: 40 },
          { dayNumber: 3, dayType: WorkoutDayType.REST, name: "Rest Day", exercises: [] },
          { dayNumber: 4, dayType: WorkoutDayType.WORKOUT, name: "Interval Training", exercises: [], estimatedDuration: 35 },
          { dayNumber: 5, dayType: WorkoutDayType.WORKOUT, name: "Long Run", exercises: [], estimatedDuration: 60 },
          { dayNumber: 6, dayType: WorkoutDayType.ACTIVE_RECOVERY, name: "Cross Training", exercises: [], estimatedDuration: 30 },
          { dayNumber: 7, dayType: WorkoutDayType.REST, name: "Rest Day", exercises: [] },
        );
      } else {
        weekDays.push(
          { dayNumber: 1, dayType: WorkoutDayType.WORKOUT, name: "Push Day", exercises: [], targetMuscles: ["chest", "shoulders", "triceps"], estimatedDuration: isDeload ? 30 : 60 },
          { dayNumber: 2, dayType: WorkoutDayType.WORKOUT, name: "Pull Day", exercises: [], targetMuscles: ["back", "biceps"], estimatedDuration: isDeload ? 30 : 60 },
          { dayNumber: 3, dayType: WorkoutDayType.REST, name: "Rest Day", exercises: [] },
          { dayNumber: 4, dayType: WorkoutDayType.WORKOUT, name: "Leg Day", exercises: [], targetMuscles: ["quads", "hamstrings", "glutes", "calves"], estimatedDuration: isDeload ? 30 : 60 },
          { dayNumber: 5, dayType: WorkoutDayType.WORKOUT, name: "Upper Body", exercises: [], targetMuscles: ["chest", "back", "shoulders"], estimatedDuration: isDeload ? 30 : 50 },
          { dayNumber: 6, dayType: WorkoutDayType.ACTIVE_RECOVERY, name: "Active Recovery", exercises: [], estimatedDuration: 20 },
          { dayNumber: 7, dayType: WorkoutDayType.REST, name: "Rest Day", exercises: [] },
        );
      }

      weeks.push({
        weekNumber: w,
        name: isDeload ? `Week ${w} (Deload)` : `Week ${w}`,
        description: isDeload
          ? "Deload week - reduce intensity to allow recovery"
          : undefined,
        days: weekDays,
        isDeload,
        focus: isStrength
          ? isDeload
            ? "Recovery"
            : w <= durationWeeks / 2
            ? "Volume"
            : "Intensity"
          : undefined,
      });
    }

    return weeks;
  }

  private calculatePlanStreak(planId: string): number {
    const log = this.workoutLog.get(planId) ?? [];
    if (log.length === 0) return 0;

    const dates = log
      .map((l) => format(parseISO(l.completedAt), "yyyy-MM-dd"))
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort()
      .reverse();

    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = parseISO(dates[i - 1]);
      const curr = parseISO(dates[i]);
      const diff = differenceInDays(prev, curr);

      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}

export const planService = new PlanService();
