import { v4 as uuidv4 } from 'uuid';
import { PrismaClient, Prisma } from '@prisma/client';
import { format, subDays, subWeeks, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

const prisma = new PrismaClient();

export interface VolumeProgression {
  exerciseId: string;
  exerciseName: string;
  date: string;
  totalVolume: number;
  sets: number;
  avgWeight: number;
  avgReps: number;
  maxWeight: number;
}

export interface StrengthProgression {
  exerciseId: string;
  exerciseName: string;
  date: string;
  estimated1RM: number;
  maxWeight: number;
  maxReps: number;
  weightProgression: number[];
}

export interface EnduranceProgression {
  activity: string;
  date: string;
  distance: number;
  duration: number;
  pace: number;
  calories: number;
}

export interface BodyComposition {
  date: string;
  weight: number;
  bodyFatPercentage?: number;
  leanMass?: number;
  bmi?: number;
}

export interface ProgressChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

export interface MuscleGroupVolume {
  muscleGroup: string;
  totalVolume: number;
  weeklyVolume: number;
  sessionsCount: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
}

export interface ProgressSummary {
  period: string;
  totalWorkouts: number;
  totalVolume: number;
  volumeChange: number;
  avgIntensity: number;
  intensityChange: number;
  strengthGains: StrengthGain[];
  bodyChanges: BodyCompositionChange[];
  consistency: number;
}

export interface StrengthGain {
  exerciseId: string;
  exerciseName: string;
  previousMax: number;
  currentMax: number;
  gainPercent: number;
  estimated1RMChange: number;
}

export interface BodyCompositionChange {
  metric: string;
  previous: number;
  current: number;
  change: number;
  changePercent: number;
}

export class ProgressService {
  async getVolumeProgression(
    userId: string,
    exerciseId: string,
    startDate: Date,
    endDate: Date
  ): Promise<VolumeProgression[]> {
    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
        endedAt: { not: null },
      },
      include: {
        completedSets: {
          where: {
            workoutExercise: { exerciseId },
            completed: true,
          },
        },
      },
    });

    const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
    const exerciseName = exercise?.name || 'Unknown';

    const dailyData: Record<string, any> = {};

    sessions.forEach(session => {
      const dateKey = format(session.startedAt, 'yyyy-MM-dd');
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          totalVolume: 0,
          sets: 0,
          totalWeight: 0,
          totalReps: 0,
          maxWeight: 0,
        };
      }

      session.completedSets.forEach(set => {
        const volume = (set.weight || 0) * (set.reps || 0);
        dailyData[dateKey].totalVolume += volume;
        dailyData[dateKey].sets++;
        dailyData[dateKey].totalWeight += set.weight || 0;
        dailyData[dateKey].totalReps += set.reps || 0;
        dailyData[dateKey].maxWeight = Math.max(
          dailyData[dateKey].maxWeight,
          set.weight || 0
        );
      });
    });

    return Object.values(dailyData).map(data => ({
      exerciseId,
      exerciseName,
      date: data.date,
      totalVolume: data.totalVolume,
      sets: data.sets,
      avgWeight: data.sets > 0 ? data.totalWeight / data.sets : 0,
      avgReps: data.sets > 0 ? data.totalReps / data.sets : 0,
      maxWeight: data.maxWeight,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getStrengthProgression(
    userId: string,
    exerciseId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StrengthProgression[]> {
    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
        endedAt: { not: null },
      },
      include: {
        completedSets: {
          where: {
            workoutExercise: { exerciseId },
            completed: true,
            weight: { gt: 0 },
          },
        },
      },
    });

    const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
    const exerciseName = exercise?.name || 'Unknown';

    const dailyData: Record<string, any> = {};

    sessions.forEach(session => {
      const dateKey = format(session.startedAt, 'yyyy-MM-dd');
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          weights: [],
          reps: [],
          maxWeight: 0,
          maxReps: 0,
        };
      }

      session.completedSets.forEach(set => {
        dailyData[dateKey].weights.push(set.weight || 0);
        dailyData[dateKey].reps.push(set.reps || 0);
        dailyData[dateKey].maxWeight = Math.max(
          dailyData[dateKey].maxWeight,
          set.weight || 0
        );
        dailyData[dateKey].maxReps = Math.max(
          dailyData[dateKey].maxReps,
          set.reps || 0
        );
      });
    });

    return Object.values(dailyData).map(data => {
      const estimated1RM = this.calculateBest1RM(data.weights, data.reps);
      return {
        exerciseId,
        exerciseName,
        date: data.date,
        estimated1RM,
        maxWeight: data.maxWeight,
        maxReps: data.maxReps,
        weightProgression: data.weights,
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateBest1RM(weights: number[], reps: number[]): number {
    let best1RM = 0;

    for (let i = 0; i < weights.length; i++) {
      const weight = weights[i];
      const rep = reps[i];

      if (weight > 0 && rep > 0) {
        const estimated1RM = this.estimate1RM(weight, rep);
        best1RM = Math.max(best1RM, estimated1RM);
      }
    }

    return Math.round(best1RM);
  }

  private estimate1RM(weight: number, reps: number): number {
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
    return estimates.reduce((a, b) => a + b, 0) / estimates.length;
  }

  async getEnduranceProgression(
    userId: string,
    activity: string,
    startDate: Date,
    endDate: Date
  ): Promise<EnduranceProgression[]> {
    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
        endedAt: { not: null },
        workout: { category: 'CARDIO' },
      },
      include: {
        completedSets: true,
        workout: true,
      },
    });

    return sessions
      .filter(session =>
        session.completedSets.some(set => set.distance && set.distance > 0)
      )
      .map(session => {
        const totalDistance = session.completedSets.reduce(
          (sum, set) => sum + (set.distance || 0),
          0
        );
        const totalDuration = session.durationMinutes || 0;
        const pace = totalDuration > 0 ? totalDistance / totalDuration : 0;

        return {
          activity,
          date: format(session.startedAt, 'yyyy-MM-dd'),
          distance: totalDistance,
          duration: totalDuration,
          pace,
          calories: session.caloriesBurned || 0,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getBodyCompositionHistory(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<BodyComposition[]> {
    const where: Prisma.BodyMeasurementWhereInput = {
      userId,
      ...(startDate && endDate && {
        measuredAt: {
          gte: startDate,
          lte: endDate,
        },
      }),
    };

    const measurements = await prisma.bodyMeasurement.findMany({
      where,
      orderBy: { measuredAt: 'asc' },
    });

    return measurements.map(m => ({
      date: format(m.measuredAt, 'yyyy-MM-dd'),
      weight: m.weight || 0,
      bodyFatPercentage: m.bodyFatPercentage || undefined,
      leanMass: m.weight && m.bodyFatPercentage
        ? m.weight * (1 - m.bodyFatPercentage / 100)
        : undefined,
      bmi: m.height && m.weight
        ? m.weight / Math.pow(m.height / 100, 2)
        : undefined,
    }));
  }

  async getVolumeChartData(
    userId: string,
    exerciseId: string,
    period: 'week' | 'month' | 'quarter' | 'year'
  ): Promise<ProgressChartData> {
    const { startDate, endDate } = this.getDateRange(period);

    const progression = await this.getVolumeProgression(
      userId,
      exerciseId,
      startDate,
      endDate
    );

    return {
      labels: progression.map(p => format(new Date(p.date), 'MMM d')),
      datasets: [
        {
          label: 'Total Volume',
          data: progression.map(p => p.totalVolume),
          color: '#3B82F6',
        },
        {
          label: 'Max Weight',
          data: progression.map(p => p.maxWeight),
          color: '#10B981',
        },
      ],
    };
  }

  async getStrengthChartData(
    userId: string,
    exerciseId: string,
    period: 'week' | 'month' | 'quarter' | 'year'
  ): Promise<ProgressChartData> {
    const { startDate, endDate } = this.getDateRange(period);

    const progression = await this.getStrengthProgression(
      userId,
      exerciseId,
      startDate,
      endDate
    );

    return {
      labels: progression.map(p => format(new Date(p.date), 'MMM d')),
      datasets: [
        {
          label: 'Estimated 1RM',
          data: progression.map(p => p.estimated1RM),
          color: '#8B5CF6',
        },
        {
          label: 'Max Weight',
          data: progression.map(p => p.maxWeight),
          color: '#EC4899',
        },
      ],
    };
  }

  async getMuscleGroupVolume(
    userId: string,
    weeks: number = 4
  ): Promise<MuscleGroupVolume[]> {
    const startDate = subWeeks(new Date(), weeks);
    const endDate = new Date();

    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
        endedAt: { not: null },
      },
      include: {
        completedSets: {
          include: { workoutExercise: { include: { exercise: true } } },
        },
      },
    });

    const muscleGroupData: Record<string, {
      totalVolume: number;
      weeklyVolume: number;
      sessionsCount: number;
      volumes: number[];
    }> = {};

    sessions.forEach(session => {
      const weekNumber = Math.floor(
        (endDate.getTime() - session.startedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
      );

      session.completedSets.forEach(set => {
        try {
          const muscleGroups = JSON.parse(
            set.workoutExercise.exercise.muscleGroups
          );

          muscleGroups.forEach((mg: string) => {
            if (!muscleGroupData[mg]) {
              muscleGroupData[mg] = {
                totalVolume: 0,
                weeklyVolume: 0,
                sessionsCount: 0,
                volumes: [],
              };
            }

            const volume = (set.weight || 0) * (set.reps || 0);
            muscleGroupData[mg].totalVolume += volume;
            muscleGroupData[mg].volumes.push(volume);

            if (weekNumber === 0) {
              muscleGroupData[mg].weeklyVolume += volume;
            }
          });
        } catch {}
      });

      const muscleGroupsInSession = new Set<string>();
      session.completedSets.forEach(set => {
        try {
          const mgs = JSON.parse(set.workoutExercise.exercise.muscleGroups);
          mgs.forEach((mg: string) => muscleGroupsInSession.add(mg));
        } catch {}
      });

      muscleGroupsInSession.forEach(mg => {
        if (muscleGroupData[mg]) {
          muscleGroupData[mg].sessionsCount++;
        }
      });
    });

    return Object.entries(muscleGroupData)
      .map(([muscleGroup, data]) => {
        const trend = this.calculateTrend(data.volumes);
        return {
          muscleGroup,
          totalVolume: data.totalVolume,
          weeklyVolume: data.weeklyVolume,
          sessionsCount: data.sessionsCount,
          trend,
        };
      })
      .sort((a, b) => b.totalVolume - a.totalVolume);
  }

  private calculateTrend(values: number[]): 'INCREASING' | 'DECREASING' | 'STABLE' {
    if (values.length < 2) return 'STABLE';

    const midpoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, midpoint);
    const secondHalf = values.slice(midpoint);

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (changePercent > 10) return 'INCREASING';
    if (changePercent < -10) return 'DECREASING';
    return 'STABLE';
  }

  async getProgressSummary(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ProgressSummary> {
    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
        endedAt: { not: null },
      },
      include: {
        completedSets: {
          include: { workoutExercise: { include: { exercise: true } } },
        },
      },
    });

    const previousStartDate = subWeeks(
      startDate,
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
      )
    );

    const previousSessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        startedAt: {
          gte: previousStartDate,
          lt: startDate,
        },
        endedAt: { not: null },
      },
      include: {
        completedSets: true,
      },
    });

    const totalWorkouts = sessions.length;
    const totalVolume = sessions.reduce((sum, session) => {
      return sum + session.completedSets.reduce((setSum, set) => {
        return setSum + (set.weight || 0) * (set.reps || 0);
      }, 0);
    }, 0);

    const previousVolume = previousSessions.reduce((sum, session) => {
      return sum + session.completedSets.reduce((setSum, set) => {
        return setSum + (set.weight || 0) * (set.reps || 0);
      }, 0);
    }, 0);

    const volumeChange = previousVolume > 0
      ? ((totalVolume - previousVolume) / previousVolume) * 100
      : 0;

    const allIntensities = sessions.flatMap(s =>
      s.completedSets.filter(set => set.rpe).map(set => set.rpe!)
    );
    const avgIntensity = allIntensities.length > 0
      ? allIntensities.reduce((a, b) => a + b, 0) / allIntensities.length
      : 0;

    const previousIntensities = previousSessions.flatMap(s =>
      s.completedSets.filter(set => set.rpe).map(set => set.rpe!)
    );
    const previousAvgIntensity = previousIntensities.length > 0
      ? previousIntensities.reduce((a, b) => a + b, 0) / previousIntensities.length
      : 0;

    const intensityChange = previousAvgIntensity > 0
      ? ((avgIntensity - previousAvgIntensity) / previousAvgIntensity) * 100
      : 0;

    const strengthGains = await this.calculateStrengthGains(
      userId,
      startDate,
      endDate,
      previousStartDate,
      startDate
    );

    const bodyChanges = await this.calculateBodyChanges(
      userId,
      startDate,
      endDate
    );

    const consistency = this.calculateConsistency(sessions, startDate, endDate);

    return {
      period: `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`,
      totalWorkouts,
      totalVolume,
      volumeChange,
      avgIntensity,
      intensityChange,
      strengthGains,
      bodyChanges,
      consistency,
    };
  }

  private async calculateStrengthGains(
    userId: string,
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date
  ): Promise<StrengthGain[]> {
    const exerciseIds = await this.getMostFrequentExercises(userId, 10);
    const gains: StrengthGain[] = [];

    for (const exerciseId of exerciseIds) {
      const currentProgression = await this.getStrengthProgression(
        userId,
        exerciseId,
        currentStart,
        currentEnd
      );

      const previousProgression = await this.getStrengthProgression(
        userId,
        exerciseId,
        previousStart,
        previousEnd
      );

      if (currentProgression.length > 0 && previousProgression.length > 0) {
        const currentMax = Math.max(
          ...currentProgression.map(p => p.estimated1RM)
        );
        const previousMax = Math.max(
          ...previousProgression.map(p => p.estimated1RM)
        );

        if (previousMax > 0) {
          const exercise = await prisma.exercise.findUnique({
            where: { id: exerciseId },
          });

          gains.push({
            exerciseId,
            exerciseName: exercise?.name || 'Unknown',
            previousMax: Math.round(previousMax),
            currentMax: Math.round(currentMax),
            gainPercent: ((currentMax - previousMax) / previousMax) * 100,
            estimated1RMChange: Math.round(currentMax - previousMax),
          });
        }
      }
    }

    return gains.sort((a, b) => b.gainPercent - a.gainPercent);
  }

  private async getMostFrequentExercises(
    userId: string,
    limit: number
  ): Promise<string[]> {
    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        endedAt: { not: null },
      },
      include: {
        completedSets: {
          select: { workoutExercise: { select: { exerciseId: true } } },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    const exerciseCount: Record<string, number> = {};
    sessions.forEach(session => {
      session.completedSets.forEach(set => {
        const exerciseId = set.workoutExercise.exerciseId;
        exerciseCount[exerciseId] = (exerciseCount[exerciseId] || 0) + 1;
      });
    });

    return Object.entries(exerciseCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([exerciseId]) => exerciseId);
  }

  private async calculateBodyChanges(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BodyCompositionChange[]> {
    const currentMeasurements = await prisma.bodyMeasurement.findMany({
      where: {
        userId,
        measuredAt: { gte: startDate, lte: endDate },
      },
      orderBy: { measuredAt: 'desc' },
      take: 1,
    });

    const previousMeasurements = await prisma.bodyMeasurement.findMany({
      where: {
        userId,
        measuredAt: { lt: startDate },
      },
      orderBy: { measuredAt: 'desc' },
      take: 1,
    });

    if (currentMeasurements.length === 0 || previousMeasurements.length === 0) {
      return [];
    }

    const current = currentMeasurements[0];
    const previous = previousMeasurements[0];
    const changes: BodyCompositionChange[] = [];

    if (current.weight && previous.weight) {
      const change = current.weight - previous.weight;
      changes.push({
        metric: 'Weight',
        previous: previous.weight,
        current: current.weight,
        change,
        changePercent: (change / previous.weight) * 100,
      });
    }

    if (current.bodyFatPercentage && previous.bodyFatPercentage) {
      const change = current.bodyFatPercentage - previous.bodyFatPercentage;
      changes.push({
        metric: 'Body Fat %',
        previous: previous.bodyFatPercentage,
        current: current.bodyFatPercentage,
        change,
        changePercent: (change / previous.bodyFatPercentage) * 100,
      });
    }

    if (current.weight && current.bodyFatPercentage && previous.weight && previous.bodyFatPercentage) {
      const currentLeanMass = current.weight * (1 - current.bodyFatPercentage / 100);
      const previousLeanMass = previous.weight * (1 - previous.bodyFatPercentage / 100);
      const change = currentLeanMass - previousLeanMass;
      changes.push({
        metric: 'Lean Mass',
        previous: Math.round(previousLeanMass * 10) / 10,
        current: Math.round(currentLeanMass * 10) / 10,
        change: Math.round(change * 10) / 10,
        changePercent: (change / previousLeanMass) * 100,
      });
    }

    if (current.height && current.weight && previous.height && previous.weight) {
      const currentBMI = current.weight / Math.pow(current.height / 100, 2);
      const previousBMI = previous.weight / Math.pow(previous.height / 100, 2);
      const change = currentBMI - previousBMI;
      changes.push({
        metric: 'BMI',
        previous: Math.round(previousBMI * 10) / 10,
        current: Math.round(currentBMI * 10) / 10,
        change: Math.round(change * 10) / 10,
        changePercent: (change / previousBMI) * 100,
      });
    }

    return changes;
  }

  private calculateConsistency(
    sessions: any[],
    startDate: Date,
    endDate: Date
  ): number {
    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    const uniqueWorkoutDays = new Set(
      sessions.map(s => format(s.startedAt, 'yyyy-MM-dd'))
    ).size;

    const idealWorkouts = Math.min(totalDays, 7);
    const actualWorkouts = uniqueWorkoutDays;

    return Math.round((actualWorkouts / idealWorkouts) * 100);
  }

  private getDateRange(period: 'week' | 'month' | 'quarter' | 'year'): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = subWeeks(endDate, 1);
        break;
      case 'month':
        startDate = subMonths(endDate, 1);
        break;
      case 'quarter':
        startDate = subMonths(endDate, 3);
        break;
      case 'year':
        startDate = subMonths(endDate, 12);
        break;
    }

    return { startDate, endDate };
  }

  async getWeightProgressChart(
    userId: string,
    period: 'month' | 'quarter' | 'year'
  ): Promise<ProgressChartData> {
    const { startDate, endDate } = this.getDateRange(period);

    const history = await this.getBodyCompositionHistory(userId, startDate, endDate);

    return {
      labels: history.map(h => format(new Date(h.date), 'MMM d')),
      datasets: [
        {
          label: 'Weight (kg)',
          data: history.map(h => h.weight),
          color: '#3B82F6',
        },
      ],
    };
  }

  async getBodyFatChart(
    userId: string,
    period: 'month' | 'quarter' | 'year'
  ): Promise<ProgressChartData> {
    const { startDate, endDate } = this.getDateRange(period);

    const history = await this.getBodyCompositionHistory(userId, startDate, endDate);

    return {
      labels: history.map(h => format(new Date(h.date), 'MMM d')),
      datasets: [
        {
          label: 'Body Fat %',
          data: history.map(h => h.bodyFatPercentage || 0),
          color: '#F59E0B',
        },
      ],
    };
  }

  async getWorkoutFrequencyChart(
    userId: string,
    period: 'month' | 'quarter' | 'year'
  ): Promise<ProgressChartData> {
    const { startDate, endDate } = this.getDateRange(period);

    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId,
        startedAt: {
          gte: startDate,
          lte: endDate,
        },
        endedAt: { not: null },
      },
      select: { startedAt: true },
    });

    const weeklyCount: Record<string, number> = {};
    sessions.forEach(session => {
      const weekStart = format(
        new Date(session.startedAt.getTime() - (session.startedAt.getDay() * 24 * 60 * 60 * 1000)),
        'MMM d'
      );
      weeklyCount[weekStart] = (weeklyCount[weekStart] || 0) + 1;
    });

    const sortedWeeks = Object.entries(weeklyCount).sort(([, a], [, b]) => b - a);

    return {
      labels: sortedWeeks.map(([week]) => week),
      datasets: [
        {
          label: 'Workouts per Week',
          data: sortedWeeks.map(([, count]) => count),
          color: '#10B981',
        },
      ],
    };
  }

  async getPersonalRecordsTimeline(
    userId: string,
    exerciseId?: string
  ): Promise<ProgressChartData> {
    const where: Prisma.PersonalRecordWhereInput = { userId };
    if (exerciseId) where.exerciseId = exerciseId;

    const records = await prisma.personalRecord.findMany({
      where,
      orderBy: { achievedAt: 'asc' },
    });

    const exerciseRecords: Record<string, any[]> = {};
    records.forEach(record => {
      if (!exerciseRecords[record.exerciseId]) {
        exerciseRecords[record.exerciseId] = [];
      }
      exerciseRecords[record.exerciseId].push(record);
    });

    const datasets = Object.entries(exerciseRecords).map(([exId, exRecords]) => ({
      label: exRecords[0].exercise?.name || exId,
      data: exRecords.map(r => r.value),
      color: this.getColorForIndex(Object.keys(exerciseRecords).indexOf(exId)),
    }));

    const allDates = [...new Set(records.map(r => format(r.achievedAt, 'MMM d')))].sort();

    return {
      labels: allDates,
      datasets,
    };
  }

  private getColorForIndex(index: number): string {
    const colors = [
      '#3B82F6',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#8B5CF6',
      '#EC4899',
      '#06B6D4',
      '#84CC16',
    ];
    return colors[index % colors.length];
  }

  async getPredictedProgress(
    userId: string,
    exerciseId: string,
    weeksAhead: number
  ): Promise<{
    predicted1RM: number;
    confidence: number;
    trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  }> {
    const threeMonthsAgo = subMonths(new Date(), 3);
    const progression = await this.getStrengthProgression(
      userId,
      exerciseId,
      threeMonthsAgo,
      new Date()
    );

    if (progression.length < 3) {
      return {
        predicted1RM: 0,
        confidence: 0,
        trend: 'STABLE',
      };
    }

    const values = progression.map(p => p.estimated1RM);
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    const predicted1RM = Math.round(slope * (n + weeksAhead) + intercept);

    const ssRes = values.reduce((sum, y, i) => {
      const predicted = slope * i + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);

    const ssTot = values.reduce((sum, y) => {
      return sum + Math.pow(y - yMean, 2);
    }, 0);

    const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
    const confidence = Math.round(rSquared * 100);

    let trend: 'IMPROVING' | 'DECLINING' | 'STABLE' = 'STABLE';
    if (slope > 0.5) trend = 'IMPROVING';
    else if (slope < -0.5) trend = 'DECLINING';

    return {
      predicted1RM,
      confidence,
      trend,
    };
  }
}

export const progressService = new ProgressService();