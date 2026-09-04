import { v4 as uuidv4 } from 'uuid';
import { PrismaClient, WorkoutSession, CompletedSet, PersonalRecord, Prisma } from '@prisma/client';
import { differenceInSeconds, differenceInMinutes } from 'date-fns';

const prisma = new PrismaClient();

export interface StartWorkoutInput {
  workoutId: string;
  notes?: string;
}

export interface LogSetInput {
  workoutExerciseId: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  duration?: number;
  distance?: number;
  rpe?: number;
  notes?: string;
}

export interface RestTimer {
  id: string;
  sessionId: string;
  durationSeconds: number;
  startedAt: Date;
  endsAt: Date;
  exerciseId?: string;
}

export interface SupersetGroup {
  id: string;
  name: string;
  exerciseIds: string[];
  currentExerciseIndex: number;
}

export interface CircuitGroup {
  id: string;
  name: string;
  exerciseIds: string[];
  rounds: number;
  currentRound: number;
  currentExerciseIndex: number;
  restBetweenExercises: number;
  restBetweenRounds: number;
}

export interface WorkoutSessionWithDetails extends WorkoutSession {
  workout: any;
  completedSets: (CompletedSet & {
    workoutExercise: any;
  })[];
  restTimers: RestTimer[];
}

export interface ActiveWorkout {
  sessionId: string;
  workoutId: string;
  workoutName: string;
  startedAt: Date;
  exercises: ActiveExercise[];
  currentExerciseIndex: number;
  currentSetIndex: number;
  restTimer?: RestTimer;
  supersetGroup?: SupersetGroup;
  circuitGroup?: CircuitGroup;
  totalSetsCompleted: number;
  totalVolume: number;
}

export interface ActiveExercise {
  id: string;
  name: string;
  muscleGroups: string[];
  targetSets: number;
  targetReps?: number;
  targetWeight?: number;
  completedSets: CompletedSet[];
  notes?: string;
}

export interface PersonalRecordWithDetails extends PersonalRecord {
  exercise: any;
}

export class TrackingService {
  private activeWorkouts: Map<string, ActiveWorkout> = new Map();

  async startWorkout(userId: string, input: StartWorkoutInput): Promise<WorkoutSession> {
    const workout = await prisma.workout.findUnique({
      where: { id: input.workoutId },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!workout) {
      throw new Error('Workout not found');
    }

    const session = await prisma.workoutSession.create({
      data: {
        id: uuidv4(),
        workoutId: input.workoutId,
        userId,
        startedAt: new Date(),
        notes: input.notes,
        completedSets: {
          create: workout.exercises.flatMap(ex =>
            Array.from({ length: ex.sets }, (_, i) => ({
              id: uuidv4(),
              workoutExerciseId: ex.id,
              setNumber: i + 1,
              completed: false,
              completedAt: new Date(),
            }))
          ),
        },
      },
      include: {
        workout: true,
        completedSets: {
          include: { workoutExercise: { include: { exercise: true } } },
          orderBy: [{ workoutExercise: { order: 'asc' } }, { setNumber: 'asc' }],
        },
      },
    });

    const activeWorkout: ActiveWorkout = {
      sessionId: session.id,
      workoutId: workout.id,
      workoutName: workout.name,
      startedAt: session.startedAt,
      exercises: workout.exercises.map(ex => ({
        id: ex.id,
        name: ex.exercise.name,
        muscleGroups: JSON.parse(ex.exercise.muscleGroups),
        targetSets: ex.sets,
        targetReps: ex.reps,
        targetWeight: ex.weight,
        completedSets: [],
        notes: ex.notes,
      })),
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      totalSetsCompleted: 0,
      totalVolume: 0,
    };

    this.activeWorkouts.set(session.id, activeWorkout);

    return session;
  }

  async endWorkout(sessionId: string, rating?: number, notes?: string): Promise<WorkoutSession> {
    const session = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: {
        completedSets: true,
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const durationMinutes = differenceInMinutes(new Date(), session.startedAt);

    const totalVolume = session.completedSets.reduce((sum, set) => {
      return sum + (set.weight || 0) * (set.reps || 0);
    }, 0);

    const caloriesBurned = await this.calculateCaloriesBurned(session);

    const updatedSession = await prisma.workoutSession.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
        durationMinutes,
        caloriesBurned,
        rating,
        notes,
      },
      include: {
        workout: true,
        completedSets: {
          include: { workoutExercise: { include: { exercise: true } } },
        },
      },
    });

    await this.checkAndRecordPersonalRecords(sessionId);

    this.activeWorkouts.delete(sessionId);

    return updatedSession;
  }

  async logSet(userId: string, input: LogSetInput): Promise<CompletedSet> {
    const session = this.activeWorkouts.values().next().value;
    if (!session) {
      throw new Error('No active workout session');
    }

    const existingSet = await prisma.completedSet.findFirst({
      where: {
        workoutExerciseId: input.workoutExerciseId,
        setNumber: input.setNumber,
      },
    });

    if (!existingSet) {
      throw new Error('Set not found');
    }

    const updatedSet = await prisma.completedSet.update({
      where: { id: existingSet.id },
      data: {
        weight: input.weight,
        reps: input.reps,
        duration: input.duration,
        distance: input.distance,
        rpe: input.rpe,
        notes: input.notes,
        completed: true,
        completedAt: new Date(),
      },
    });

    this.updateActiveWorkoutProgress(session.sessionId, input);

    return updatedSet;
  }

  private updateActiveWorkoutProgress(sessionId: string, input: LogSetInput): void {
    const activeWorkout = this.activeWorkouts.get(sessionId);
    if (!activeWorkout) return;

    const exerciseIndex = activeWorkout.exercises.findIndex(
      ex => ex.id === input.workoutExerciseId
    );

    if (exerciseIndex !== -1) {
      const exercise = activeWorkout.exercises[exerciseIndex];
      const volume = (input.weight || 0) * (input.reps || 0);
      activeWorkout.totalVolume += volume;
      activeWorkout.totalSetsCompleted++;

      if (input.setNumber >= exercise.targetSets) {
        activeWorkout.currentExerciseIndex = exerciseIndex + 1;
        activeWorkout.currentSetIndex = 0;
      } else {
        activeWorkout.currentSetIndex = input.setNumber;
      }
    }
  }

  async getActiveWorkout(sessionId: string): Promise<ActiveWorkout | null> {
    return this.activeWorkouts.get(sessionId) || null;
  }

  async getAllActiveWorkouts(userId: string): Promise<ActiveWorkout[]> {
    return Array.from(this.activeWorkouts.values()).filter(
      w => w.sessionId.startsWith(userId)
    );
  }

  async startRestTimer(sessionId: string, durationSeconds: number, exerciseId?: string): Promise<RestTimer> {
    const timer: RestTimer = {
      id: uuidv4(),
      sessionId,
      durationSeconds,
      startedAt: new Date(),
      endsAt: new Date(Date.now() + durationSeconds * 1000),
      exerciseId,
    };

    await prisma.restTimer.create({
      data: {
        id: timer.id,
        sessionId,
        durationSeconds,
        startedAt: timer.startedAt,
        endsAt: timer.endsAt,
        exerciseId,
      },
    });

    const activeWorkout = this.activeWorkouts.get(sessionId);
    if (activeWorkout) {
      activeWorkout.restTimer = timer;
    }

    return timer;
  }

  async endRestTimer(sessionId: string): Promise<void> {
    const activeWorkout = this.activeWorkouts.get(sessionId);
    if (activeWorkout) {
      activeWorkout.restTimer = undefined;
    }
  }

  async getRestTimerStatus(sessionId: string): Promise<{ remaining: number; isComplete: boolean } | null> {
    const activeWorkout = this.activeWorkouts.get(sessionId);
    if (!activeWorkout?.restTimer) return null;

    const remaining = Math.max(
      0,
      differenceInSeconds(activeWorkout.restTimer.endsAt, new Date())
    );

    return {
      remaining,
      isComplete: remaining === 0,
    };
  }

  async startSuperset(sessionId: string, exerciseIds: string[], name?: string): Promise<SupersetGroup> {
    const group: SupersetGroup = {
      id: uuidv4(),
      name: name || `Superset ${exerciseIds.length} exercises`,
      exerciseIds,
      currentExerciseIndex: 0,
    };

    const activeWorkout = this.activeWorkouts.get(sessionId);
    if (activeWorkout) {
      activeWorkout.supersetGroup = group;
    }

    return group;
  }

  async advanceSuperset(sessionId: string): Promise<SupersetGroup | null> {
    const activeWorkout = this.activeWorkouts.get(sessionId);
    if (!activeWorkout?.supersetGroup) return null;

    const group = activeWorkout.supersetGroup;
    group.currentExerciseIndex =
      (group.currentExerciseIndex + 1) % group.exerciseIds.length;

    return group;
  }

  async startCircuit(
    sessionId: string,
    exerciseIds: string[],
    rounds: number,
    restBetweenExercises: number,
    restBetweenRounds: number,
    name?: string
  ): Promise<CircuitGroup> {
    const group: CircuitGroup = {
      id: uuidv4(),
      name: name || `Circuit ${rounds} rounds`,
      exerciseIds,
      rounds,
      currentRound: 1,
      currentExerciseIndex: 0,
      restBetweenExercises,
      restBetweenRounds,
    };

    const activeWorkout = this.activeWorkouts.get(sessionId);
    if (activeWorkout) {
      activeWorkout.circuitGroup = group;
    }

    return group;
  }

  async advanceCircuit(sessionId: string): Promise<CircuitGroup | null> {
    const activeWorkout = this.activeWorkouts.get(sessionId);
    if (!activeWorkout?.circuitGroup) return null;

    const group = activeWorkout.circuitGroup;
    group.currentExerciseIndex++;

    if (group.currentExerciseIndex >= group.exerciseIds.length) {
      group.currentRound++;
      group.currentExerciseIndex = 0;

      if (group.currentRound > group.rounds) {
        activeWorkout.circuitGroup = undefined;
        return null;
      }
    }

    return group;
  }

  async getSessionHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<WorkoutSessionWithDetails[]> {
    return prisma.workoutSession.findMany({
      where: { userId },
      include: {
        workout: true,
        completedSets: {
          include: { workoutExercise: { include: { exercise: true } } },
          orderBy: [{ workoutExercise: { order: 'asc' } }, { setNumber: 'asc' }],
        },
        restTimers: true,
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getSessionById(sessionId: string): Promise<WorkoutSessionWithDetails | null> {
    return prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: {
        workout: true,
        completedSets: {
          include: { workoutExercise: { include: { exercise: true } } },
          orderBy: [{ workoutExercise: { order: 'asc' } }, { setNumber: 'asc' }],
        },
        restTimers: true,
      },
    });
  }

  async getSessionStats(sessionId: string): Promise<{
    duration: number;
    totalVolume: number;
    totalSets: number;
    completedSets: number;
    averageWeight: number;
    averageReps: number;
    exerciseBreakdown: any[];
  }> {
    const session = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: {
        completedSets: {
          include: { workoutExercise: { include: { exercise: true } } },
        },
      },
    });

    if (!session) throw new Error('Session not found');

    const duration = session.endedAt
      ? differenceInSeconds(session.endedAt, session.startedAt)
      : differenceInSeconds(new Date(), session.startedAt);

    const completedSets = session.completedSets.filter(s => s.completed);
    const totalVolume = completedSets.reduce(
      (sum, set) => sum + (set.weight || 0) * (set.reps || 0),
      0
    );

    const weights = completedSets.filter(s => s.weight).map(s => s.weight!);
    const reps = completedSets.filter(s => s.reps).map(s => s.reps!);

    const exerciseBreakdown = this.calculateExerciseBreakdown(completedSets);

    return {
      duration,
      totalVolume,
      totalSets: session.completedSets.length,
      completedSets: completedSets.length,
      averageWeight: weights.length > 0
        ? weights.reduce((a, b) => a + b, 0) / weights.length
        : 0,
      averageReps: reps.length > 0
        ? reps.reduce((a, b) => a + b, 0) / reps.length
        : 0,
      exerciseBreakdown,
    };
  }

  private calculateExerciseBreakdown(sets: any[]): any[] {
    const breakdown: Record<string, any> = {};

    sets.forEach(set => {
      const exerciseName = set.workoutExercise.exercise.name;
      if (!breakdown[exerciseName]) {
        breakdown[exerciseName] = {
          name: exerciseName,
          sets: 0,
          totalVolume: 0,
          maxWeight: 0,
          totalReps: 0,
        };
      }

      breakdown[exerciseName].sets++;
      breakdown[exerciseName].totalVolume += (set.weight || 0) * (set.reps || 0);
      breakdown[exerciseName].maxWeight = Math.max(
        breakdown[exerciseName].maxWeight,
        set.weight || 0
      );
      breakdown[exerciseName].totalReps += set.reps || 0;
    });

    return Object.values(breakdown);
  }

  async checkAndRecordPersonalRecords(sessionId: string): Promise<PersonalRecord[]> {
    const session = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: {
        completedSets: {
          include: { workoutExercise: { include: { exercise: true } } },
        },
      },
    });

    if (!session) return [];

    const newRecords: PersonalRecord[] = [];
    const completedSets = session.completedSets.filter(s => s.completed);

    const exerciseStats: Record<string, { maxWeight: number; maxVolume: number; maxReps: number }> = {};

    completedSets.forEach(set => {
      const exerciseId = set.workoutExercise.exerciseId;
      if (!exerciseStats[exerciseId]) {
        exerciseStats[exerciseId] = { maxWeight: 0, maxVolume: 0, maxReps: 0 };
      }

      const volume = (set.weight || 0) * (set.reps || 0);
      exerciseStats[exerciseId].maxWeight = Math.max(
        exerciseStats[exerciseId].maxWeight,
        set.weight || 0
      );
      exerciseStats[exerciseId].maxVolume = Math.max(
        exerciseStats[exerciseId].maxVolume,
        volume
      );
      exerciseStats[exerciseId].maxReps = Math.max(
        exerciseStats[exerciseId].maxReps,
        set.reps || 0
      );
    });

    for (const [exerciseId, stats] of Object.entries(exerciseStats)) {
      if (stats.maxWeight > 0) {
        const existingPR = await prisma.personalRecord.findFirst({
          where: {
            userId: session.userId,
            exerciseId,
            type: 'WEIGHT',
          },
          orderBy: { value: 'desc' },
          take: 1,
        });

        if (!existingPR || stats.maxWeight > existingPR.value) {
          const pr = await prisma.personalRecord.create({
            data: {
              id: uuidv4(),
              userId: session.userId,
              exerciseId,
              type: 'WEIGHT',
              value: stats.maxWeight,
              unit: 'KG',
              achievedAt: new Date(),
              previousRecord: existingPR?.value,
            },
          });
          newRecords.push(pr);
        }
      }

      if (stats.maxVolume > 0) {
        const existingPR = await prisma.personalRecord.findFirst({
          where: {
            userId: session.userId,
            exerciseId,
            type: 'VOLUME',
          },
          orderBy: { value: 'desc' },
          take: 1,
        });

        if (!existingPR || stats.maxVolume > existingPR.value) {
          const pr = await prisma.personalRecord.create({
            data: {
              id: uuidv4(),
              userId: session.userId,
              exerciseId,
              type: 'VOLUME',
              value: stats.maxVolume,
              unit: 'KG',
              achievedAt: new Date(),
              previousRecord: existingPR?.value,
            },
          });
          newRecords.push(pr);
        }
      }
    }

    return newRecords;
  }

  async getPersonalRecords(
    userId: string,
    exerciseId?: string
  ): Promise<PersonalRecordWithDetails[]> {
    const where: Prisma.PersonalRecordWhereInput = { userId };
    if (exerciseId) where.exerciseId = exerciseId;

    return prisma.personalRecord.findMany({
      where,
      include: { exercise: true },
      orderBy: { achievedAt: 'desc' },
    });
  }

  async getPersonalRecordsByExercise(
    userId: string,
    exerciseId: string
  ): Promise<PersonalRecord[]> {
    return prisma.personalRecord.findMany({
      where: {
        userId,
        exerciseId,
      },
      orderBy: { achievedAt: 'desc' },
    });
  }

  async calculate1RM(weight: number, reps: number): number {
    if (reps === 1) return weight;
    if (reps > 30) return weight;

    const formulas = {
      epley: weight * (1 + reps / 30),
      brzycki: weight * (36 / (37 - reps)),
      lander: (100 * weight) / (101.3 - 2.67123 * reps),
      lombardi: weight * Math.pow(reps, 0.1),
      oconner: weight * (1 + reps * 0.025),
      wathen: (100 * weight) / (48.8 + 53.8 * Math.exp(-0.075 * reps)),
    };

    const estimates = Object.values(formulas);
    return Math.round(estimates.reduce((a, b) => a + b, 0) / estimates.length);
  }

  async estimateRepsFrom1RM(oneRM: number, percentage: number): number {
    const weight = oneRM * (percentage / 100);
    let maxReps = 0;

    for (let reps = 1; reps <= 30; reps++) {
      const estimated1RM = await this.calculate1RM(weight, reps);
      if (estimated1RM >= oneRM * 0.95 && estimated1RM <= oneRM * 1.05) {
        maxReps = reps;
      }
    }

    return maxReps;
  }

  async calculateWorkoutIntensity(sessionId: string): Promise<{
    rpeAverage: number;
    rirAverage: number;
    percentageOf1RM: number;
    volumeLoad: number;
    intensityScore: number;
  }> {
    const session = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: {
        completedSets: {
          include: { workoutExercise: { include: { exercise: true } } },
        },
      },
    });

    if (!session) throw new Error('Session not found');

    const completedSets = session.completedSets.filter(s => s.completed && s.rpe);

    const rpeAverage = completedSets.length > 0
      ? completedSets.reduce((sum, set) => sum + (set.rpe || 0), 0) / completedSets.length
      : 0;

    const rirAverage = rpeAverage > 0 ? 10 - rpeAverage : 0;

    const volumeLoad = completedSets.reduce(
      (sum, set) => sum + (set.weight || 0) * (set.reps || 0),
      0
    );

    let totalPercentage = 0;
    let count = 0;

    for (const set of completedSets) {
      if (set.weight && set.weight > 0) {
        const records = await this.getPersonalRecordsByExercise(
          session.userId,
          set.workoutExercise.exerciseId
        );
        const maxWeight = records.length > 0
          ? Math.max(...records.filter(r => r.type === 'WEIGHT').map(r => r.value))
          : set.weight;

        if (maxWeight > 0) {
          totalPercentage += (set.weight / maxWeight) * 100;
          count++;
        }
      }
    }

    const percentageOf1RM = count > 0 ? totalPercentage / count : 0;

    const intensityScore = this.calculateIntensityScore(
      rpeAverage,
      percentageOf1RM,
      volumeLoad
    );

    return {
      rpeAverage,
      rirAverage,
      percentageOf1RM,
      volumeLoad,
      intensityScore,
    };
  }

  private calculateIntensityScore(
    rpe: number,
    percentageOf1RM: number,
    volumeLoad: number
  ): number {
    const rpeScore = (rpe / 10) * 40;
    const percentageScore = (percentageOf1RM / 100) * 40;
    const volumeScore = Math.min(volumeLoad / 10000, 1) * 20;

    return Math.round(rpeScore + percentageScore + volumeScore);
  }

  async duplicateSession(sessionId: string, userId: string): Promise<WorkoutSession> {
    const originalSession = await prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: {
        completedSets: true,
      },
    });

    if (!originalSession) throw new Error('Session not found');

    const newSession = await prisma.workoutSession.create({
      data: {
        id: uuidv4(),
        workoutId: originalSession.workoutId,
        userId,
        startedAt: new Date(),
        notes: `Duplicated from session ${sessionId}`,
        completedSets: {
          create: originalSession.completedSets.map(set => ({
            id: uuidv4(),
            workoutExerciseId: set.workoutExerciseId,
            setNumber: set.setNumber,
            weight: set.weight,
            reps: set.reps,
            duration: set.duration,
            distance: set.distance,
            completed: false,
            completedAt: new Date(),
          })),
        },
      },
      include: {
        workout: true,
        completedSets: true,
      },
    });

    return newSession;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await prisma.$transaction([
      prisma.completedSet.deleteMany({ where: { sessionId } }),
      prisma.restTimer.deleteMany({ where: { sessionId } }),
      prisma.workoutSession.delete({ where: { id: sessionId } }),
    ]);
  }

  private async calculateCaloriesBurned(session: any): Promise<number> {
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return 0;

    const workout = await prisma.workout.findUnique({ where: { id: session.workoutId } });
    if (!workout) return 0;

    const MET = this.getMETForCategory(workout.category);
    const weightKg = user.weight || 70;
    const durationHours = session.durationMinutes / 60;

    return Math.round(MET * weightKg * durationHours);
  }

  private getMETForCategory(category: string): number {
    const metValues: Record<string, number> = {
      STRENGTH: 5.0,
      CARDIO: 8.0,
      HIIT: 10.0,
      FLEXIBILITY: 2.5,
      POWERLIFTING: 6.0,
      BODYBUILDING: 5.5,
      CROSSFIT: 9.0,
      CUSTOM: 4.0,
    };
    return metValues[category] || 4.0;
  }

  async getWorkoutStreak(userId: string): Promise<number> {
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessionDates = sessions.map(s => {
      const date = new Date(s.startedAt);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    });

    const uniqueDates = [...new Set(sessionDates)].sort((a, b) => b - a);

    for (const sessionDate of uniqueDates) {
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - streak);
      expectedDate.setHours(0, 0, 0, 0);

      if (sessionDate === expectedDate.getTime()) {
        streak++;
      } else if (sessionDate < expectedDate.getTime()) {
        break;
      }
    }

    return streak;
  }

  async getWeeklySummary(userId: string): Promise<{
    workouts: number;
    totalDuration: number;
    totalVolume: number;
    averageIntensity: number;
    musclesWorked: string[];
  }> {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        startedAt: { gte: startOfWeek },
        endedAt: { not: null },
      },
      include: {
        completedSets: {
          include: { workoutExercise: { include: { exercise: true } } },
        },
      },
    });

    const totalDuration = sessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0),
      0
    );

    const totalVolume = sessions.reduce((sum, session) => {
      return sum + session.completedSets.reduce((setSum, set) => {
        return setSum + (set.weight || 0) * (set.reps || 0);
      }, 0);
    }, 0);

    let totalIntensity = 0;
    let intensityCount = 0;

    sessions.forEach(session => {
      session.completedSets.forEach(set => {
        if (set.rpe) {
          totalIntensity += set.rpe;
          intensityCount++;
        }
      });
    });

    const musclesWorked = new Set<string>();
    sessions.forEach(session => {
      session.completedSets.forEach(set => {
        try {
          const muscleGroups = JSON.parse(set.workoutExercise.exercise.muscleGroups);
          muscleGroups.forEach((mg: string) => musclesWorked.add(mg));
        } catch {}
      });
    });

    return {
      workouts: sessions.length,
      totalDuration,
      totalVolume,
      averageIntensity: intensityCount > 0 ? totalIntensity / intensityCount : 0,
      musclesWorked: Array.from(musclesWorked),
    };
  }
}

export const trackingService = new TrackingService();