import { v4 as uuidv4 } from 'uuid';
import { PrismaClient, WorkoutTemplate, Workout, Prisma } from '@prisma/client';
import { addDays, format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

const prisma = new PrismaClient();

export interface CreateTemplateInput {
  name: string;
  description: string;
  category: TemplateCategory;
  difficulty: DifficultyLevel;
  durationMinutes?: number;
  exercises: TemplateExerciseInput[];
  tags?: string[];
  isPublic?: boolean;
  schedule?: TemplateSchedule;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  difficulty?: DifficultyLevel;
  durationMinutes?: number;
  exercises?: TemplateExerciseInput[];
  tags?: string[];
  isPublic?: boolean;
  schedule?: TemplateSchedule;
}

export interface TemplateExerciseInput {
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
  weekProgression?: WeekProgression;
}

export interface WeekProgression {
  week1?: { sets: number; reps?: number; weight?: number };
  week2?: { sets: number; reps?: number; weight?: number };
  week3?: { sets: number; reps?: number; weight?: number };
  week4?: { sets: number; reps?: number; weight?: number };
}

export interface TemplateSchedule {
  daysPerWeek: number;
  restDays: number[];
  startDate?: Date;
  endDate?: Date;
  progressionType?: 'LINEAR' | 'UNDULATING' | 'BLOCK';
}

export interface TemplateWithExercises extends WorkoutTemplate {
  exercises: (any & {
    exercise: any;
  })[];
  schedule?: TemplateSchedule;
}

export type TemplateCategory =
  | 'PUSH_PULL_LEGS'
  | 'UPPER_LOWER'
  | 'FULL_BODY'
  | 'BODY_PART_SPLIT'
  | 'STRENGTH'
  | 'HYPERTROPHY'
  | 'ENDURANCE'
  | 'POWER'
  | 'ATHLETIC'
  | 'REHABILITATION'
  | 'CUSTOM';

export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export type WeightUnit = 'KG' | 'LBS' | 'BW';

export type DistanceUnit = 'KM' | 'MILES' | 'METERS';

export interface TemplateSearchFilters {
  query?: string;
  category?: TemplateCategory;
  difficulty?: DifficultyLevel;
  createdBy?: string;
  isPublic?: boolean;
  tags?: string[];
  minDuration?: number;
  maxDuration?: number;
  muscleGroups?: string[];
}

export interface PrebuiltTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  difficulty: DifficultyLevel;
  durationMinutes: number;
  exercises: PrebuiltExercise[];
  tags: string[];
}

export interface PrebuiltExercise {
  exerciseName: string;
  sets: number;
  reps?: number;
  restSeconds?: number;
  notes?: string;
}

export interface SharedTemplate {
  templateId: string;
  sharedBy: string;
  sharedAt: Date;
  usesCount: number;
}

export class TemplateService {
  private readonly PREBUILT_TEMPLATES: PrebuiltTemplate[] = [
    {
      id: 'ppl-push',
      name: 'Push Day (PPL)',
      description: 'Chest, shoulders, and triceps workout for the push day of Push/Pull/Legs split.',
      category: 'PUSH_PULL_LEGS',
      difficulty: 'INTERMEDIATE',
      durationMinutes: 60,
      exercises: [
        { exerciseName: 'Barbell Bench Press', sets: 4, reps: 8, restSeconds: 120 },
        { exerciseName: 'Incline Dumbbell Press', sets: 3, reps: 10, restSeconds: 90 },
        { exerciseName: 'Cable Crossover', sets: 3, reps: 12, restSeconds: 60 },
        { exerciseName: 'Overhead Press', sets: 4, reps: 8, restSeconds: 120 },
        { exerciseName: 'Lateral Raises', sets: 3, reps: 15, restSeconds: 60 },
        { exerciseName: 'Tricep Pushdown', sets: 3, reps: 12, restSeconds: 60 },
        { exerciseName: 'Overhead Tricep Extension', sets: 3, reps: 12, restSeconds: 60 },
      ],
      tags: ['PUSH', 'CHEST', 'SHOULDERS', 'TRICEPS'],
    },
    {
      id: 'ppl-pull',
      name: 'Pull Day (PPL)',
      description: 'Back and biceps workout for the pull day of Push/Pull/Legs split.',
      category: 'PUSH_PULL_LEGS',
      difficulty: 'INTERMEDIATE',
      durationMinutes: 60,
      exercises: [
        { exerciseName: 'Deadlift', sets: 4, reps: 6, restSeconds: 180 },
        { exerciseName: 'Pull Ups', sets: 4, reps: 8, restSeconds: 120 },
        { exerciseName: 'Barbell Row', sets: 4, reps: 8, restSeconds: 120 },
        { exerciseName: 'Seated Cable Row', sets: 3, reps: 12, restSeconds: 90 },
        { exerciseName: 'Face Pulls', sets: 3, reps: 15, restSeconds: 60 },
        { exerciseName: 'Barbell Curl', sets: 3, reps: 10, restSeconds: 60 },
        { exerciseName: 'Hammer Curl', sets: 3, reps: 12, restSeconds: 60 },
      ],
      tags: ['PULL', 'BACK', 'BICEPS'],
    },
    {
      id: 'ppl-legs',
      name: 'Leg Day (PPL)',
      description: 'Quadriceps, hamstrings, and calves workout for the legs day of Push/Pull/Legs split.',
      category: 'PUSH_PULL_LEGS',
      difficulty: 'INTERMEDIATE',
      durationMinutes: 65,
      exercises: [
        { exerciseName: 'Barbell Squat', sets: 4, reps: 8, restSeconds: 180 },
        { exerciseName: 'Romanian Deadlift', sets: 4, reps: 10, restSeconds: 120 },
        { exerciseName: 'Leg Press', sets: 3, reps: 12, restSeconds: 90 },
        { exerciseName: 'Bulgarian Split Squat', sets: 3, reps: 10, restSeconds: 90 },
        { exerciseName: 'Leg Curl', sets: 3, reps: 12, restSeconds: 60 },
        { exerciseName: 'Leg Extension', sets: 3, reps: 12, restSeconds: 60 },
        { exerciseName: 'Calf Raises', sets: 4, reps: 15, restSeconds: 60 },
      ],
      tags: ['LEGS', 'QUADS', 'HAMSTRINGS', 'GLUTES'],
    },
    {
      id: 'upper-lower-upper',
      name: 'Upper Body A (Upper/Lower)',
      description: 'Upper body workout focusing on strength for Upper/Lower split.',
      category: 'UPPER_LOWER',
      difficulty: 'INTERMEDIATE',
      durationMinutes: 55,
      exercises: [
        { exerciseName: 'Barbell Bench Press', sets: 4, reps: 6, restSeconds: 180 },
        { exerciseName: 'Barbell Row', sets: 4, reps: 6, restSeconds: 180 },
        { exerciseName: 'Overhead Press', sets: 3, reps: 8, restSeconds: 120 },
        { exerciseName: 'Pull Ups', sets: 3, reps: 8, restSeconds: 120 },
        { exerciseName: 'Dumbbell Curl', sets: 3, reps: 10, restSeconds: 60 },
        { exerciseName: 'Tricep Pushdown', sets: 3, reps: 10, restSeconds: 60 },
      ],
      tags: ['UPPER', 'STRENGTH', 'COMPOUND'],
    },
    {
      id: 'upper-lower-lower',
      name: 'Lower Body A (Upper/Lower)',
      description: 'Lower body workout focusing on strength for Upper/Lower split.',
      category: 'UPPER_LOWER',
      difficulty: 'INTERMEDIATE',
      durationMinutes: 55,
      exercises: [
        { exerciseName: 'Barbell Squat', sets: 4, reps: 6, restSeconds: 180 },
        { exerciseName: 'Deadlift', sets: 4, reps: 6, restSeconds: 180 },
        { exerciseName: 'Leg Press', sets: 3, reps: 10, restSeconds: 90 },
        { exerciseName: 'Leg Curl', sets: 3, reps: 10, restSeconds: 60 },
        { exerciseName: 'Calf Raises', sets: 4, reps: 12, restSeconds: 60 },
        { exerciseName: 'Plank', sets: 3, reps: 1, restSeconds: 60 },
      ],
      tags: ['LOWER', 'STRENGTH', 'COMPOUND'],
    },
    {
      id: 'full-body-3day',
      name: 'Full Body (3-Day)',
      description: 'Full body workout for 3 days per week, ideal for beginners.',
      category: 'FULL_BODY',
      difficulty: 'BEGINNER',
      durationMinutes: 50,
      exercises: [
        { exerciseName: 'Barbell Squat', sets: 3, reps: 10, restSeconds: 120 },
        { exerciseName: 'Barbell Bench Press', sets: 3, reps: 10, restSeconds: 120 },
        { exerciseName: 'Barbell Row', sets: 3, reps: 10, restSeconds: 120 },
        { exerciseName: 'Overhead Press', sets: 3, reps: 10, restSeconds: 90 },
        { exerciseName: 'Dumbbell Curl', sets: 2, reps: 12, restSeconds: 60 },
        { exerciseName: 'Tricep Pushdown', sets: 2, reps: 12, restSeconds: 60 },
        { exerciseName: 'Plank', sets: 3, reps: 1, restSeconds: 60 },
      ],
      tags: ['FULL_BODY', 'BEGINNER', '3_DAY'],
    },
    {
      id: 'bro-split',
      name: 'Body Part Split',
      description: 'Traditional bodybuilding split targeting one muscle group per day.',
      category: 'BODY_PART_SPLIT',
      difficulty: 'ADVANCED',
      durationMinutes: 75,
      exercises: [
        { exerciseName: 'Barbell Bench Press', sets: 4, reps: 8, restSeconds: 120 },
        { exerciseName: 'Incline Dumbbell Press', sets: 4, reps: 10, restSeconds: 90 },
        { exerciseName: 'Cable Crossover', sets: 3, reps: 12, restSeconds: 60 },
        { exerciseName: 'Chest Flyes', sets: 3, reps: 15, restSeconds: 60 },
        { exerciseName: 'Push Ups', sets: 3, reps: 15, restSeconds: 60 },
      ],
      tags: ['CHEST', 'HYPERTROPHY', 'BODYBUILDING'],
    },
    {
      id: 'strength-5x5',
      name: 'Starting Strength 5x5',
      description: 'Classic 5x5 strength program for beginners.',
      category: 'STRENGTH',
      difficulty: 'BEGINNER',
      durationMinutes: 45,
      exercises: [
        { exerciseName: 'Barbell Squat', sets: 5, reps: 5, restSeconds: 180 },
        { exerciseName: 'Barbell Bench Press', sets: 5, reps: 5, restSeconds: 180 },
        { exerciseName: 'Barbell Row', sets: 5, reps: 5, restSeconds: 180 },
        { exerciseName: 'Overhead Press', sets: 5, reps: 5, restSeconds: 180 },
        { exerciseName: 'Deadlift', sets: 1, reps: 5, restSeconds: 180 },
      ],
      tags: ['STRENGTH', '5x5', 'BEGINNER', 'COMPOUND'],
    },
    {
      id: 'hiit-cardio',
      name: 'HIIT Cardio Blast',
      description: 'High-intensity interval training for fat loss and conditioning.',
      category: 'ENDURANCE',
      difficulty: 'INTERMEDIATE',
      durationMinutes: 30,
      exercises: [
        { exerciseName: 'Burpees', sets: 4, reps: 15, restSeconds: 30 },
        { exerciseName: 'Mountain Climbers', sets: 4, reps: 20, restSeconds: 30 },
        { exerciseName: 'Box Jumps', sets: 4, reps: 12, restSeconds: 30 },
        { exerciseName: 'Battle Ropes', sets: 4, reps: 1, restSeconds: 30 },
        { exerciseName: 'Jumping Jacks', sets: 4, reps: 30, restSeconds: 30 },
      ],
      tags: ['HIIT', 'CARDIO', 'FAT_LOSS', 'CONDITIONING'],
    },
    {
      id: 'powerlifting-peek',
      name: 'Powerlifting Peaking',
      description: 'Intense powerlifting program for competition peaking.',
      category: 'POWER',
      difficulty: 'EXPERT',
      durationMinutes: 90,
      exercises: [
        { exerciseName: 'Barbell Squat', sets: 5, reps: 3, restSeconds: 300 },
        { exerciseName: 'Barbell Bench Press', sets: 5, reps: 3, restSeconds: 300 },
        { exerciseName: 'Deadlift', sets: 5, reps: 2, restSeconds: 300 },
        { exerciseName: 'Overhead Press', sets: 3, reps: 5, restSeconds: 180 },
      ],
      tags: ['POWERLIFTING', 'STRENGTH', 'PEAKING', 'COMPETITION'],
    },
    {
      id: 'athletic-performance',
      name: 'Athletic Performance',
      description: 'Training program for athletic performance and conditioning.',
      category: 'ATHLETIC',
      difficulty: 'ADVANCED',
      durationMinutes: 70,
      exercises: [
        { exerciseName: 'Power Clean', sets: 5, reps: 3, restSeconds: 180 },
        { exerciseName: 'Box Jumps', sets: 4, reps: 8, restSeconds: 120 },
        { exerciseName: 'Barbell Squat', sets: 4, reps: 6, restSeconds: 180 },
        { exerciseName: 'Romanian Deadlift', sets: 3, reps: 8, restSeconds: 120 },
        { exerciseName: 'Battle Ropes', sets: 3, reps: 1, restSeconds: 60 },
        { exerciseName: 'Plank', sets: 3, reps: 1, restSeconds: 60 },
      ],
      tags: ['ATHLETIC', 'POWER', 'CONDITIONING', 'PERFORMANCE'],
    },
    {
      id: 'beginner-full-body',
      name: 'Beginner Full Body',
      description: 'Simple full body workout for complete beginners.',
      category: 'FULL_BODY',
      difficulty: 'BEGINNER',
      durationMinutes: 40,
      exercises: [
        { exerciseName: 'Goblet Squat', sets: 3, reps: 12, restSeconds: 90 },
        { exerciseName: 'Push Ups', sets: 3, reps: 10, restSeconds: 60 },
        { exerciseName: 'Dumbbell Row', sets: 3, reps: 10, restSeconds: 60 },
        { exerciseName: 'Leg Press', sets: 3, reps: 12, restSeconds: 60 },
        { exerciseName: 'Dumbbell Curl', sets: 2, reps: 12, restSeconds: 60 },
        { exerciseName: 'Plank', sets: 3, reps: 1, restSeconds: 60 },
      ],
      tags: ['BEGINNER', 'FULL_BODY', 'EASY'],
    },
  ];

  async createTemplate(userId: string, input: CreateTemplateInput): Promise<WorkoutTemplate> {
    const template = await prisma.workoutTemplate.create({
      data: {
        id: uuidv4(),
        userId,
        name: input.name,
        description: input.description,
        category: input.category,
        difficulty: input.difficulty,
        durationMinutes: input.durationMinutes,
        tags: input.tags ? JSON.stringify(input.tags) : undefined,
        isPublic: input.isPublic ?? false,
        schedule: input.schedule ? JSON.stringify(input.schedule) : undefined,
        exercises: {
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
            weekProgression: ex.weekProgression
              ? JSON.stringify(ex.weekProgression)
              : undefined,
          })),
        },
      },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    return template;
  }

  async updateTemplate(
    userId: string,
    templateId: string,
    input: UpdateTemplateInput
  ): Promise<WorkoutTemplate> {
    const existing = await prisma.workoutTemplate.findFirst({
      where: { id: templateId, userId },
    });

    if (!existing) {
      throw new Error('Template not found');
    }

    if (input.exercises) {
      await prisma.templateExercise.deleteMany({
        where: { templateId },
      });
    }

    return prisma.workoutTemplate.update({
      where: { id: templateId },
      data: {
        ...input,
        tags: input.tags ? JSON.stringify(input.tags) : undefined,
        schedule: input.schedule ? JSON.stringify(input.schedule) : undefined,
        exercises: input.exercises
          ? {
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
                weekProgression: ex.weekProgression
                  ? JSON.stringify(ex.weekProgression)
                  : undefined,
              })),
            }
          : undefined,
      },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async deleteTemplate(userId: string, templateId: string): Promise<void> {
    const existing = await prisma.workoutTemplate.findFirst({
      where: { id: templateId, userId },
    });

    if (!existing) {
      throw new Error('Template not found');
    }

    await prisma.$transaction([
      prisma.templateExercise.deleteMany({ where: { templateId } }),
      prisma.workoutTemplate.delete({ where: { id: templateId } }),
    ]);
  }

  async getTemplate(templateId: string): Promise<TemplateWithExercises | null> {
    return prisma.workoutTemplate.findUnique({
      where: { id: templateId },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: 'asc' },
        },
      },
    }) as Promise<TemplateWithExercises | null>;
  }

  async getUserTemplates(userId: string): Promise<TemplateWithExercises[]> {
    return prisma.workoutTemplate.findMany({
      where: { userId },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    }) as Promise<TemplateWithExercises[]>;
  }

  async searchTemplates(filters: TemplateSearchFilters): Promise<TemplateWithExercises[]> {
    const where: Prisma.WorkoutTemplateWhereInput = {};

    if (filters.query) {
      where.OR = [
        { name: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters.createdBy) {
      where.userId = filters.createdBy;
    }

    if (filters.isPublic !== undefined) {
      where.isPublic = filters.isPublic;
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { contains: filters.tags[0] };
    }

    return prisma.workoutTemplate.findMany({
      where,
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    }) as Promise<TemplateWithExercises[]>;
  }

  async getPrebuiltTemplates(): Promise<PrebuiltTemplate[]> {
    return this.PREBUILT_TEMPLATES;
  }

  async createFromPrebuilt(
    userId: string,
    prebuiltId: string
  ): Promise<WorkoutTemplate> {
    const prebuilt = this.PREBUILT_TEMPLATES.find(t => t.id === prebuiltId);
    if (!prebuilt) {
      throw new Error('Prebuilt template not found');
    }

    const exercises: TemplateExerciseInput[] = [];

    for (let i = 0; i < prebuilt.exercises.length; i++) {
      const ex = prebuilt.exercises[i];
      const exercise = await prisma.exercise.findFirst({
        where: { name: ex.exerciseName },
      });

      if (exercise) {
        exercises.push({
          exerciseId: exercise.id,
          order: i + 1,
          sets: ex.sets,
          reps: ex.reps,
          restSeconds: ex.restSeconds,
          notes: ex.notes,
        });
      }
    }

    return this.createTemplate(userId, {
      name: prebuilt.name,
      description: prebuilt.description,
      category: prebuilt.category,
      difficulty: prebuilt.difficulty,
      durationMinutes: prebuilt.durationMinutes,
      exercises,
      tags: prebuilt.tags,
    });
  }

  async cloneTemplate(
    userId: string,
    templateId: string,
    newName?: string
  ): Promise<WorkoutTemplate> {
    const original = await prisma.workoutTemplate.findUnique({
      where: { id: templateId },
      include: { exercises: true },
    });

    if (!original) {
      throw new Error('Template not found');
    }

    return this.createTemplate(userId, {
      name: newName ?? `${original.name} (Copy)`,
      description: original.description,
      category: original.category as TemplateCategory,
      difficulty: original.difficulty as DifficultyLevel,
      durationMinutes: original.durationMinutes,
      tags: original.tags ? JSON.parse(original.tags) : undefined,
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

  async shareTemplate(
    userId: string,
    templateId: string
  ): Promise<void> {
    const template = await prisma.workoutTemplate.findFirst({
      where: { id: templateId, userId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    await prisma.workoutTemplate.update({
      where: { id: templateId },
      data: { isPublic: true },
    });
  }

  async getSharedTemplates(limit: number = 20): Promise<TemplateWithExercises[]> {
    return prisma.workoutTemplate.findMany({
      where: { isPublic: true },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: 'asc' },
        },
        user: {
          select: { name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as Promise<TemplateWithExercises[]>;
  }

  async useTemplate(
    userId: string,
    templateId: string
  ): Promise<Workout> {
    const template = await prisma.workoutTemplate.findUnique({
      where: { id: templateId },
      include: { exercises: true },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    const workout = await prisma.workout.create({
      data: {
        id: uuidv4(),
        userId,
        name: template.name,
        description: template.description,
        category: template.category,
        difficulty: template.difficulty,
        durationMinutes: template.durationMinutes,
        tags: template.tags,
        isTemplate: false,
        exercises: {
          create: template.exercises.map(ex => ({
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
          })),
        },
      },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    return workout;
  }

  async getSchedule(templateId: string): Promise<TemplateSchedule | null> {
    const template = await prisma.workoutTemplate.findUnique({
      where: { id: templateId },
      select: { schedule: true },
    });

    if (!template?.schedule) return null;

    return JSON.parse(template.schedule);
  }

  async updateSchedule(
    userId: string,
    templateId: string,
    schedule: TemplateSchedule
  ): Promise<void> {
    const existing = await prisma.workoutTemplate.findFirst({
      where: { id: templateId, userId },
    });

    if (!existing) {
      throw new Error('Template not found');
    }

    await prisma.workoutTemplate.update({
      where: { id: templateId },
      data: { schedule: JSON.stringify(schedule) },
    });
  }

  async generateWeeklySchedule(
    templateId: string,
    startDate: Date
  ): Promise<{
    date: Date;
    dayName: string;
    workout: PrebuiltTemplate | null;
    isRestDay: boolean;
  }[]> {
    const schedule = await this.getSchedule(templateId);
    if (!schedule) return [];

    const template = await this.getTemplate(templateId);
    if (!template) return [];

    const weekStart = startOfWeek(startDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(startDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return days.map((day, index) => {
      const dayOfWeek = day.getDay();
      const isRestDay = schedule.restDays.includes(dayOfWeek);

      return {
        date: day,
        dayName: format(day, 'EEEE'),
        workout: isRestDay ? null : {
          id: template.id,
          name: template.name,
          description: template.description || '',
          category: template.category as TemplateCategory,
          difficulty: template.difficulty as DifficultyLevel,
          durationMinutes: template.durationMinutes || 60,
          exercises: template.exercises.map(ex => ({
            exerciseName: ex.exercise?.name || '',
            sets: ex.sets,
            reps: ex.reps,
            restSeconds: ex.restSeconds,
            notes: ex.notes || undefined,
          })),
          tags: template.tags ? JSON.parse(template.tags) : [],
        },
        isRestDay,
      };
    });
  }

  async getTemplateStats(userId: string): Promise<{
    totalTemplates: number;
    byCategory: { category: string; count: number }[];
    byDifficulty: { difficulty: string; count: number }[];
    mostUsedExercises: { exercise: string; count: number }[];
    averageDuration: number;
  }> {
    const templates = await prisma.workoutTemplate.findMany({
      where: { userId },
      include: { exercises: { include: { exercise: true } } },
    });

    const totalTemplates = templates.length;

    const categoryCount: Record<string, number> = {};
    const difficultyCount: Record<string, number> = {};
    const exerciseCount: Record<string, number> = {};
    let totalDuration = 0;

    templates.forEach(template => {
      categoryCount[template.category] = (categoryCount[template.category] || 0) + 1;
      difficultyCount[template.difficulty] = (difficultyCount[template.difficulty] || 0) + 1;
      totalDuration += template.durationMinutes || 0;

      template.exercises.forEach(ex => {
        const name = ex.exercise?.name || 'Unknown';
        exerciseCount[name] = (exerciseCount[name] || 0) + 1;
      });
    });

    return {
      totalTemplates,
      byCategory: Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
      byDifficulty: Object.entries(difficultyCount)
        .map(([difficulty, count]) => ({ difficulty, count }))
        .sort((a, b) => b.count - a.count),
      mostUsedExercises: Object.entries(exerciseCount)
        .map(([exercise, count]) => ({ exercise, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      averageDuration: totalTemplates > 0 ? totalDuration / totalTemplates : 0,
    };
  }

  async getTemplatesByMuscleGroup(
    muscleGroup: string
  ): Promise<TemplateWithExercises[]> {
    return prisma.workoutTemplate.findMany({
      where: {
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
          include: { exercise: true },
          orderBy: { order: 'asc' },
        },
      },
    }) as Promise<TemplateWithExercises[]>;
  }

  async getTemplatesByDuration(
    minMinutes: number,
    maxMinutes: number
  ): Promise<TemplateWithExercises[]> {
    return prisma.workoutTemplate.findMany({
      where: {
        durationMinutes: {
          gte: minMinutes,
          lte: maxMinutes,
        },
      },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: 'asc' },
        },
      },
    }) as Promise<TemplateWithExercises[]>;
  }

  async exportTemplate(templateId: string): Promise<string> {
    const template = await this.getTemplate(templateId);
    if (!template) throw new Error('Template not found');

    return JSON.stringify(template, null, 2);
  }

  async importTemplate(userId: string, jsonData: string): Promise<WorkoutTemplate> {
    try {
      const data = JSON.parse(jsonData);

      if (!data.name || !data.exercises) {
        throw new Error('Invalid template format');
      }

      return this.createTemplate(userId, {
        name: data.name,
        description: data.description || '',
        category: data.category || 'CUSTOM',
        difficulty: data.difficulty || 'INTERMEDIATE',
        durationMinutes: data.durationMinutes,
        exercises: data.exercises.map((ex: any) => ({
          exerciseId: ex.exerciseId,
          order: ex.order,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          restSeconds: ex.restSeconds,
          notes: ex.notes,
        })),
        tags: data.tags,
      });
    } catch (error) {
      throw new Error('Failed to import template: Invalid JSON');
    }
  }
}

export const templateService = new TemplateService();