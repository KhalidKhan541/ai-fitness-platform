import { v4 as uuidv4 } from 'uuid';
import { format, startOfWeek, endOfWeek, addDays, isWithinInterval, parseISO, differenceInMinutes } from 'date-fns';
import { PrismaClient, Workout, WorkoutExercise, Set, WorkoutTemplate, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateWorkoutInput {
  name: string;
  description?: string;
  category: WorkoutCategory;
  difficulty: DifficultyLevel;
  durationMinutes?: number;
  isTemplate?: boolean;
  templateId?: string;
  exercises?: CreateExerciseInput[];
  tags?: string[];
  notes?: string;
}

export interface UpdateWorkoutInput {
  name?: string;
  description?: string;
  category?: WorkoutCategory;
  difficulty?: DifficultyLevel;
  durationMinutes?: number;
  isTemplate?: boolean;
  tags?: string[];
  notes?: string;
}

export interface CreateExerciseInput {
  exerciseId: string;
  order: number;
  sets: number;
  reps?: number;
  weight?: number;
  weightUnit?: WeightUnit;
  duration?: number;
  distance?: number;
  distanceUnit?: DistanceUnit;
  restSeconds?: number;
  notes?: string;
  supersetGroupId?: string;
  circuitGroupId?: string;
}

export interface WorkoutSession {
  id: string;
  workoutId: string;
  userId: string;
  startedAt: Date;
  endedAt?: Date;
  durationMinutes: number;
  caloriesBurned?: number;
  notes?: string;
  rating?: number;
  completedSets: CompletedSet[];
  personalRecords: PersonalRecord[];
}

export interface CompletedSet {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  duration?: number;
  distance?: number;
  completed: boolean;
  completedAt: Date;
  rpe?: number;
  notes?: string;
}

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  type: PRType;
  value: number;
  unit: string;
  achievedAt: Date;
  previousRecord?: number;
}

export type WorkoutCategory = 
  | 'STRENGTH'
  | 'CARDIO'
  | 'HIIT'
  | 'FLEXIBILITY'
  | 'POWERlifting'
  | 'BODYBUILDING'
  | 'CROSSFIT'
  | 'CUSTOM';

export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type WeightUnit = 'KG' | 'LBS' | 'BW';

export type DistanceUnit = 'KM' | 'MILES' | 'METERS';

export type PRType = 'WEIGHT' | 'VOLUME' | 'ENDURANCE' | 'TIME';

export interface WorkoutSearchFilters {
  query?: string;
  category?: WorkoutCategory;
  difficulty?: DifficultyLevel;
  muscleGroup?: string;
  equipment?: string;
  duration?: { min?: number; max?: number };
  tags?: string[];
  createdBy?: string;
  isTemplate?: boolean;
}

export interface WorkoutStats {
  totalWorkouts: number;
  totalDurationMinutes: number;
  totalVolume: number;
  averageDuration: number;
  averageRating: number;
  workoutFrequency: { week: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  personalRecords: PersonalRecord[];
  streak: number;
}

export class WorkoutService {
  async createWorkout(userId: string, input: CreateWorkoutInput): Promise<Workout> {
    const workout = await prisma.workout.create({
      data: {
        id: uuidv4(),
        userId,
        name: input.name,
        description: input.description,
        category: input.category,
        difficulty: input.difficulty,
        durationMinutes: input.durationMinutes,
        isTemplate: input.isTemplate ?? false,
        notes: input.notes,
        tags: input.tags ? JSON.stringify(input.tags) : undefined,
        exercises: input.exercises ? {
          create: input.exercises.map(ex => ({
            id: uuidv4(),
            exerciseId: ex.exerciseId,
            order: ex.order,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            weightUnit: ex.weightUnit,
            duration: ex.duration,
            distance: ex.distance,
            distanceUnit: ex.distanceUnit,
            restSeconds: ex.restSeconds,
            notes: ex.notes,
            supersetGroupId: ex.supersetGroupId,
            circuitGroupId: ex.circuitGroupId,
          }))
        } : undefined,
      },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return workout;
  }

  async createWorkoutFromTemplate(userId: string, templateId: string): Promise<Workout> {
    const template = await prisma.workout.findUnique({
      where: { id: templateId, isTemplate: true },
      include: {
        exercises: true,
      },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    return this.createWorkout(userId, {
      name: `${template.name} - ${format(new Date(), 'MMM d, yyyy')}`,
      description: template.description,
      category: template.category as WorkoutCategory,
      difficulty: template.difficulty as DifficultyLevel,
      templateId: template.id,
      exercises: template.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        order: ex.order,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        weightUnit: ex.weightUnit as WeightUnit,
        duration: ex.duration,
        distance: ex.distance,
        distanceUnit: ex.distanceUnit as DistanceUnit,
        restSeconds: ex.restSeconds,
        notes: ex.notes,
        supersetGroupId: ex.supersetGroupId,
        circuitGroupId: ex.circuitGroupId,
      })),
    });
  }

  async getWorkout(userId: string, workoutId: string): Promise<Workout | null> {
    return prisma.workout.findFirst({
      where: { id: workoutId, userId },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
          orderBy: { order: 'asc' },
        },
        sessions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async updateWorkout(userId: string, workoutId: string, input: UpdateWorkoutInput): Promise<Workout> {
    const existing = await prisma.workout.findFirst({
      where: { id: workoutId, userId },
    });

    if (!existing) {
      throw new Error('Workout not found');
    }

    return prisma.workout.update({
      where: { id: workoutId },
      data: {
        ...input,
        tags: input.tags ? JSON.stringify(input.tags) : undefined,
      },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async deleteWorkout(userId: string, workoutId: string): Promise<void> {
    const existing = await prisma.workout.findFirst({
      where: { id: workoutId, userId },
    });

    if (!existing) {
      throw new Error('Workout not found');
    }

    await prisma.$transaction([
      prisma.completedSet.deleteMany({ where: { session: { workoutId } } }),
      prisma.workoutSession.deleteMany({ where: { workoutId } }),
      prisma.workoutExercise.deleteMany({ where: { workoutId } }),
      prisma.workout.delete({ where: { id: workoutId } }),
    ]);
  }

  async cloneWorkout(userId: string, workoutId: string, newName?: string): Promise<Workout> {
    const original = await prisma.workout.findUnique({
      where: { id: workoutId },
      include: { exercises: true },
    });

    if (!original) {
      throw new Error('Workout not found');
    }

    return this.createWorkout(userId, {
      name: newName ?? `${original.name} (Copy)`,
      description: original.description,
      category: original.category as WorkoutCategory,
      difficulty: original.difficulty as DifficultyLevel,
      isTemplate: original.isTemplate,
      notes: original.notes,
      exercises: original.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        order: ex.order,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        weightUnit: ex.weightUnit as WeightUnit,
        duration: ex.duration,
        distance: ex.distance,
        distanceUnit: ex.distanceUnit as DistanceUnit,
        restSeconds: ex.restSeconds,
        notes: ex.notes,
        supersetGroupId: ex.supersetGroupId,
        circuitGroupId: ex.circuitGroupId,
      })),
    });
  }

  async searchWorkouts(userId: string, filters: WorkoutSearchFilters): Promise<Workout[]> {
    const where: Prisma.WorkoutWhereInput = {
      userId,
      isTemplate: filters.isTemplate,
    };

    if (filters.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
        { notes: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { contains: JSON.stringify(filters.tags[0]) };
    }

    if (filters.createdBy) {
      where.createdBy = filters.createdBy;
    }

    return prisma.workout.findMany({
      where,
      include: {
        exercises: {
          include: {
            exercise: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getWorkoutHistory(userId: string, startDate?: Date, endDate?: Date): Promise<Workout[]> {
    const where: Prisma.WorkoutWhereInput = {
      userId,
      isTemplate: false,
    };

    if (startDate && endDate) {
      where.sessions = {
        some: {
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      };
    }

    return prisma.workout.findMany({
      where,
      include: {
        exercises: {
          include: {
            exercise: true,
          },
        },
        sessions: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getWorkoutStats(userId: string, startDate?: Date, endDate?: Date): Promise<WorkoutStats> {
    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        endedAt: { not: null },
        ...(startDate && endDate && {
          startedAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
      },
      include: {
        workout: true,
        completedSets: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    const totalWorkouts = sessions.length;
    const totalDurationMinutes = sessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0),
      0
    );

    const totalVolume = sessions.reduce((sum, session) => {
      return sum + session.completedSets.reduce((setSum, set) => {
        return setSum + (set.weight || 0) * (set.reps || 0);
      }, 0);
    }, 0);

    const averageDuration = totalWorkouts > 0 ? totalDurationMinutes / totalWorkouts : 0;

    const ratings = sessions.filter(s => s.rating).map(s => s.rating!);
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;

    const workoutFrequency = this.calculateWorkoutFrequency(sessions);
    const categoryBreakdown = this.calculateCategoryBreakdown(sessions);
    const personalRecords = await this.getPersonalRecords(userId);
    const streak = await this.calculateStreak(userId);

    return {
      totalWorkouts,
      totalDurationMinutes,
      totalVolume,
      averageDuration,
      averageRating,
      workoutFrequency,
      categoryBreakdown,
      personalRecords,
      streak,
    };
  }

  private calculateWorkoutFrequency(sessions: any[]): { week: string; count: number }[] {
    const weeklyCount: Record<string, number> = {};

    sessions.forEach(session => {
      const weekStart = startOfWeek(session.startedAt, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      weeklyCount[weekKey] = (weeklyCount[weekKey] || 0) + 1;
    });

    return Object.entries(weeklyCount)
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  private calculateCategoryBreakdown(sessions: any[]): { category: string; count: number }[] {
    const categoryCount: Record<string, number> = {};

    sessions.forEach(session => {
      const category = session.workout.category;
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    return Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  private async getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
    return prisma.personalRecord.findMany({
      where: { userId },
      orderBy: { achievedAt: 'desc' },
      take: 20,
    });
  }

  private async calculateStreak(userId: string): Promise<number> {
    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        endedAt: { not: null },
      },
      select: { startedAt: true },
      orderBy: { startedAt: 'desc' },
    });

    if (sessions.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const sessionDates = sessions.map(s => {
      const date = new Date(s.startedAt);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    });

    const uniqueDates = [...new Set(sessionDates)].sort((a, b) => b - a);

    for (const sessionDate of uniqueDates) {
      const expectedDate = addDays(currentDate, -streak);
      expectedDate.setHours(0, 0, 0, 0);

      if (sessionDate === expectedDate.getTime()) {
        streak++;
      } else if (sessionDate < expectedDate.getTime()) {
        break;
      }
    }

    return streak;
  }

  async getRecentWorkouts(userId: string, limit: number = 10): Promise<Workout[]> {
    return prisma.workout.findMany({
      where: {
        userId,
        isTemplate: false,
      },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
        },
        sessions: {
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  async getTemplates(userId: string, category?: WorkoutCategory): Promise<Workout[]> {
    const where: Prisma.WorkoutWhereInput = {
      userId,
      isTemplate: true,
    };

    if (category) {
      where.category = category;
    }

    return prisma.workout.findMany({
      where,
      include: {
        exercises: {
          include: {
            exercise: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getWorkoutsByMuscleGroup(userId: string, muscleGroup: string): Promise<Workout[]> {
    return prisma.workout.findMany({
      where: {
        userId,
        exercises: {
          some: {
            exercise: {
              muscleGroups: { contains: muscleGroup },
            },
          },
        },
      },
      include: {
        exercises: {
          include: {
            exercise: true,
          },
        },
      },
    });
  }

  async calculateWorkoutVolume(workoutId: string): Promise<number> {
    const exercises = await prisma.workoutExercise.findMany({
      where: { workoutId },
    });

    return exercises.reduce((total, exercise) => {
      const setVolume = exercise.sets * (exercise.reps || 0) * (exercise.weight || 0);
      return total + setVolume;
    }, 0);
  }

  async estimateCaloriesBurned(
    userId: string,
    workoutId: string,
    durationMinutes: number
  ): Promise<number> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return 0;

    const workout = await prisma.workout.findUnique({ where: { id: workoutId } });
    if (!workout) return 0;

    const MET = this.getMETForCategory(workout.category);
    const weightKg = user.weight || 70;

    return Math.round(MET * weightKg * (durationMinutes / 60));
  }

  private getMETForCategory(category: string): number {
    const metValues: Record<string, number> = {
      STRENGTH: 5.0,
      CARDIO: 8.0,
      HIIT: 10.0,
      FLEXIBILITY: 2.5,
      POWERlifting: 6.0,
      BODYBUILDING: 5.5,
      CROSSFIT: 9.0,
      CUSTOM: 4.0,
    };
    return metValues[category] || 4.0;
  }
}

export const workoutService = new WorkoutService();