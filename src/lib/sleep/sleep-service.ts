import { v4 as uuidv4 } from 'uuid';
import { PrismaClient, SleepEntry, Prisma } from '@prisma/client';
import { format, startOfDay, endOfDay, subDays, differenceInMinutes, differenceInHours } from 'date-fns';

const prisma = new PrismaClient();

export interface LogSleepInput {
  bedtime: Date;
  wakeTime: Date;
  quality: SleepQuality;
  interruptions?: number;
  notes?: string;
  environment?: SleepEnvironment;
  preSleepActivities?: string[];
  dreamRecall?: boolean;
  sleepStageData?: SleepStageData;
}

export interface SleepEnvironment {
  temperature?: number;
  noiseLevel: 'SILENT' | 'QUIET' | 'MODERATE' | 'NOISY';
  lightLevel: 'DARK' | 'DIM' | 'MODERATE' | 'BRIGHT';
  mattress?: string;
  pillow?: string;
}

export interface SleepStageData {
  lightSleep?: number;
  deepSleep?: number;
  remSleep?: number;
  awake?: number;
}

export type SleepQuality = 'TERRIBLE' | 'POOR' | 'FAIR' | 'GOOD' | 'EXCELLENT';

export interface SleepAnalysis {
  averageDuration: number;
  averageQuality: SleepQuality;
  sleepDebt: number;
  consistency: number;
  optimalBedtime: string;
  optimalWakeTime: string;
  sleepEfficiency: number;
  deepSleepPercentage: number;
  remSleepPercentage: number;
  factors: SleepFactor[];
}

export interface SleepFactor {
  factor: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  description: string;
  recommendation?: string;
}

export interface SleepRecommendation {
  category: string;
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  actionable: boolean;
}

export interface SleepTrend {
  period: string;
  averageDuration: number;
  averageQuality: number;
  consistency: number;
  improvement: number;
  data: { date: string; duration: number; quality: number }[];
}

export interface SleepSummary {
  totalSleep: number;
  averageBedtime: string;
  averageWakeTime: string;
  bestNight: { date: string; duration: number; quality: SleepQuality };
  worstNight: { date: string; duration: number; quality: SleepQuality };
  sleepScore: number;
}

export class SleepService {
  private readonly QUALITY_SCORES: Record<SleepQuality, number> = {
    TERRIBLE: 1,
    POOR: 2,
    FAIR: 3,
    GOOD: 4,
    EXCELLENT: 5,
  };

  private readonly RECOMMENDATIONS: SleepRecommendation[] = [
    {
      category: 'SCHEDULE',
      title: 'Maintain Consistent Sleep Schedule',
      description: 'Try to go to bed and wake up at the same time every day, even on weekends.',
      priority: 'HIGH',
      actionable: true,
    },
    {
      category: 'ENVIRONMENT',
      title: 'Optimize Sleep Environment',
      description: 'Keep your bedroom cool (65-68°F/18-20°C), dark, and quiet.',
      priority: 'HIGH',
      actionable: true,
    },
    {
      category: 'HABITS',
      title: 'Limit Screen Time Before Bed',
      description: 'Avoid screens for at least 1 hour before bedtime. Blue light can disrupt melatonin production.',
      priority: 'HIGH',
      actionable: true,
    },
    {
      category: 'NUTRITION',
      title: 'Avoid Caffeine Late in the Day',
      description: 'Stop consuming caffeine at least 6 hours before bedtime.',
      priority: 'MEDIUM',
      actionable: true,
    },
    {
      category: 'EXERCISE',
      title: 'Time Exercise Appropriately',
      description: 'Regular exercise improves sleep, but avoid intense workouts within 2-3 hours of bedtime.',
      priority: 'MEDIUM',
      actionable: true,
    },
    {
      category: 'RELAXATION',
      title: 'Develop a Wind-Down Routine',
      description: 'Create a relaxing pre-sleep routine to signal your body it\'s time to rest.',
      priority: 'MEDIUM',
      actionable: true,
    },
    {
      category: 'NUTRITION',
      title: 'Avoid Heavy Meals Before Bed',
      description: 'Eat your last meal 2-3 hours before bedtime to prevent digestive issues.',
      priority: 'LOW',
      actionable: true,
    },
    {
      category: 'HABITS',
      title: 'Limit Naps',
      description: 'If you need to nap, keep it to 20-30 minutes and before 3 PM.',
      priority: 'LOW',
      actionable: true,
    },
  ];

  async logSleep(userId: string, input: LogSleepInput): Promise<SleepEntry> {
    const durationMinutes = differenceInMinutes(input.wakeTime, input.bedtime);
    const durationHours = durationMinutes / 60;

    return prisma.sleepEntry.create({
      data: {
        id: uuidv4(),
        userId,
        bedtime: input.bedtime,
        wakeTime: input.wakeTime,
        durationMinutes,
        durationHours: Math.round(durationHours * 10) / 10,
        quality: input.quality,
        interruptions: input.interruptions || 0,
        notes: input.notes,
        environment: input.environment ? JSON.stringify(input.environment) : undefined,
        preSleepActivities: input.preSleepActivities
          ? JSON.stringify(input.preSleepActivities)
          : undefined,
        dreamRecall: input.dreamRecall,
        sleepStageData: input.sleepStageData
          ? JSON.stringify(input.sleepStageData)
          : undefined,
        loggedAt: new Date(),
      },
    });
  }

  async getSleepEntry(entryId: string): Promise<SleepEntry | null> {
    return prisma.sleepEntry.findUnique({ where: { id: entryId } });
  }

  async updateSleepEntry(entryId: string, input: Partial<LogSleepInput>): Promise<SleepEntry> {
    const existing = await prisma.sleepEntry.findUnique({ where: { id: entryId } });
    if (!existing) throw new Error('Sleep entry not found');

    let durationMinutes = existing.durationMinutes;
    let durationHours = existing.durationHours;

    if (input.bedtime || input.wakeTime) {
      const bedtime = input.bedtime || existing.bedtime;
      const wakeTime = input.wakeTime || existing.wakeTime;
      durationMinutes = differenceInMinutes(wakeTime, bedtime);
      durationHours = Math.round((durationMinutes / 60) * 10) / 10;
    }

    return prisma.sleepEntry.update({
      where: { id: entryId },
      data: {
        bedtime: input.bedtime,
        wakeTime: input.wakeTime,
        durationMinutes,
        durationHours,
        quality: input.quality,
        interruptions: input.interruptions,
        notes: input.notes,
        environment: input.environment ? JSON.stringify(input.environment) : undefined,
        preSleepActivities: input.preSleepActivities
          ? JSON.stringify(input.preSleepActivities)
          : undefined,
        dreamRecall: input.dreamRecall,
        sleepStageData: input.sleepStageData
          ? JSON.stringify(input.sleepStageData)
          : undefined,
      },
    });
  }

  async deleteSleepEntry(entryId: string): Promise<void> {
    await prisma.sleepEntry.delete({ where: { id: entryId } });
  }

  async getDailySleep(userId: string, date?: Date): Promise<SleepEntry | null> {
    const targetDate = date || new Date();
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    return prisma.sleepEntry.findFirst({
      where: {
        userId,
        bedtime: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      orderBy: { bedtime: 'desc' },
    });
  }

  async getSleepHistory(
    userId: string,
    days: number = 30
  ): Promise<SleepEntry[]> {
    const startDate = subDays(new Date(), days);

    return prisma.sleepEntry.findMany({
      where: {
        userId,
        loggedAt: { gte: startDate },
      },
      orderBy: { bedtime: 'desc' },
    });
  }

  async getSleepAnalysis(userId: string, days: number = 30): Promise<SleepAnalysis> {
    const entries = await this.getSleepHistory(userId, days);

    if (entries.length === 0) {
      return {
        averageDuration: 0,
        averageQuality: 'FAIR',
        sleepDebt: 0,
        consistency: 0,
        optimalBedtime: '22:00',
        optimalWakeTime: '06:00',
        sleepEfficiency: 0,
        deepSleepPercentage: 0,
        remSleepPercentage: 0,
        factors: [],
      };
    }

    const averageDuration = entries.reduce((sum, e) => sum + e.durationHours, 0) / entries.length;
    const averageQualityScore = entries.reduce(
      (sum, e) => sum + this.QUALITY_SCORES[e.quality],
      0
    ) / entries.length;
    const averageQuality = this.getQualityFromScore(averageQualityScore);

    const sleepDebt = this.calculateSleepDebt(entries);
    const consistency = this.calculateConsistency(entries);
    const optimalTimes = this.calculateOptimalTimes(entries);
    const sleepEfficiency = this.calculateSleepEfficiency(entries);
    const stageData = this.calculateAverageStages(entries);
    const factors = this.analyzeFactors(entries);

    return {
      averageDuration: Math.round(averageDuration * 10) / 10,
      averageQuality,
      sleepDebt: Math.round(sleepDebt * 10) / 10,
      consistency: Math.round(consistency),
      optimalBedtime: optimalTimes.bedtime,
      optimalWakeTime: optimalTimes.wakeTime,
      sleepEfficiency: Math.round(sleepEfficiency),
      deepSleepPercentage: stageData.deepSleep,
      remSleepPercentage: stageData.remSleep,
      factors,
    };
  }

  private calculateSleepDebt(entries: SleepEntry[]): number {
    const recommendedHours = 8;
    let totalDebt = 0;

    entries.forEach(entry => {
      if (entry.durationHours < recommendedHours) {
        totalDebt += recommendedHours - entry.durationHours;
      }
    });

    return totalDebt;
  }

  private calculateConsistency(entries: SleepEntry[]): number {
    if (entries.length < 2) return 100;

    const bedtimes = entries.map(e => {
      const bedtime = new Date(e.bedtime);
      return bedtime.getHours() * 60 + bedtime.getMinutes();
    });

    const avgBedtime = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
    const variance = bedtimes.reduce(
      (sum, time) => sum + Math.pow(time - avgBedtime, 2),
      0
    ) / bedtimes.length;

    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, 100 - stdDev);

    return consistency;
  }

  private calculateOptimalTimes(entries: SleepEntry[]): {
    bedtime: string;
    wakeTime: string;
  } {
    const bedtimes = entries.map(e => new Date(e.bedtime));
    const wakeTimes = entries.map(e => new Date(e.wakeTime));

    const avgBedtimeMinutes =
      bedtimes.reduce((sum, t) => sum + t.getHours() * 60 + t.getMinutes(), 0) /
      bedtimes.length;
    const avgWakeTimeMinutes =
      wakeTimes.reduce((sum, t) => sum + t.getHours() * 60 + t.getMinutes(), 0) /
      wakeTimes.length;

    const bedtimeHours = Math.floor(avgBedtimeMinutes / 60);
    const bedtimeMinutes = Math.round(avgBedtimeMinutes % 60);
    const wakeTimeHours = Math.floor(avgWakeTimeMinutes / 60);
    const wakeTimeMinutes = Math.round(avgWakeTimeMinutes % 60);

    return {
      bedtime: `${bedtimeHours.toString().padStart(2, '0')}:${bedtimeMinutes
        .toString()
        .padStart(2, '0')}`,
      wakeTime: `${wakeTimeHours.toString().padStart(2, '0')}:${wakeTimeMinutes
        .toString()
        .padStart(2, '0')}`,
    };
  }

  private calculateSleepEfficiency(entries: SleepEntry[]): number {
    if (entries.length === 0) return 0;

    let totalEfficiency = 0;
    let count = 0;

    entries.forEach(entry => {
      if (entry.interruptions !== undefined) {
        const interruptionPenalty = entry.interruptions * 5;
        const efficiency = Math.max(0, 100 - interruptionPenalty);
        totalEfficiency += efficiency;
        count++;
      }
    });

    return count > 0 ? totalEfficiency / count : 85;
  }

  private calculateAverageStages(entries: SleepEntry[]): {
    deepSleep: number;
    remSleep: number;
    lightSleep: number;
    awake: number;
  } {
    let totalDeep = 0;
    let totalRem = 0;
    let totalLight = 0;
    let totalAwake = 0;
    let count = 0;

    entries.forEach(entry => {
      if (entry.sleepStageData) {
        try {
          const stages = JSON.parse(entry.sleepStageData);
          totalDeep += stages.deepSleep || 0;
          totalRem += stages.remSleep || 0;
          totalLight += stages.lightSleep || 0;
          totalAwake += stages.awake || 0;
          count++;
        } catch {}
      }
    });

    if (count === 0) {
      return { deepSleep: 20, remSleep: 25, lightSleep: 50, awake: 5 };
    }

    const total = totalDeep + totalRem + totalLight + totalAwake;
    return {
      deepSleep: total > 0 ? Math.round((totalDeep / total) * 100) : 20,
      remSleep: total > 0 ? Math.round((totalRem / total) * 100) : 25,
      lightSleep: total > 0 ? Math.round((totalLight / total) * 100) : 50,
      awake: total > 0 ? Math.round((totalAwake / total) * 100) : 5,
    };
  }

  private analyzeFactors(entries: SleepEntry[]): SleepFactor[] {
    const factors: SleepFactor[] = [];

    const avgDuration =
      entries.reduce((sum, e) => sum + e.durationHours, 0) / entries.length;
    if (avgDuration < 7) {
      factors.push({
        factor: 'Sleep Duration',
        impact: 'NEGATIVE',
        description: `Average sleep duration is ${avgDuration.toFixed(1)} hours, which is below recommended.`,
        recommendation: 'Aim for 7-9 hours of sleep per night.',
      });
    } else if (avgDuration >= 7 && avgDuration <= 9) {
      factors.push({
        factor: 'Sleep Duration',
        impact: 'POSITIVE',
        description: `Average sleep duration is ${avgDuration.toFixed(1)} hours, within recommended range.`,
      });
    }

    const avgInterruptions =
      entries.reduce((sum, e) => sum + (e.interruptions || 0), 0) / entries.length;
    if (avgInterruptions > 2) {
      factors.push({
        factor: 'Sleep Interruptions',
        impact: 'NEGATIVE',
        description: `Average of ${avgInterruptions.toFixed(1)} interruptions per night.`,
        recommendation: 'Identify and address causes of nighttime awakenings.',
      });
    }

    const qualityDistribution: Record<SleepQuality, number> = {
      TERRIBLE: 0,
      POOR: 0,
      FAIR: 0,
      GOOD: 0,
      EXCELLENT: 0,
    };
    entries.forEach(e => qualityDistribution[e.quality]++);

    const mostCommonQuality = Object.entries(qualityDistribution).reduce(
      (max, [quality, count]) =>
        count > max.count ? { quality: quality as SleepQuality, count } : max,
      { quality: 'FAIR' as SleepQuality, count: 0 }
    );

    if (mostCommonQuality.quality === 'EXCELLENT' || mostCommonQuality.quality === 'GOOD') {
      factors.push({
        factor: 'Sleep Quality',
        impact: 'POSITIVE',
        description: `Most nights rated as ${mostCommonQuality.quality.toLowerCase()}.`,
      });
    } else if (
      mostCommonQuality.quality === 'POOR' ||
      mostCommonQuality.quality === 'TERRIBLE'
    ) {
      factors.push({
        factor: 'Sleep Quality',
        impact: 'NEGATIVE',
        description: `Many nights rated as ${mostCommonQuality.quality.toLowerCase()}.`,
        recommendation: 'Consider improving sleep hygiene and environment.',
      });
    }

    return factors;
  }

  private getQualityFromScore(score: number): SleepQuality {
    if (score >= 4.5) return 'EXCELLENT';
    if (score >= 3.5) return 'GOOD';
    if (score >= 2.5) return 'FAIR';
    if (score >= 1.5) return 'POOR';
    return 'TERRIBLE';
  }

  async getRecommendations(userId: string): Promise<SleepRecommendation[]> {
    const analysis = await this.getSleepAnalysis(userId);
    const recommendations: SleepRecommendation[] = [];

    if (analysis.averageDuration < 7) {
      recommendations.push({
        category: 'DURATION',
        title: 'Increase Sleep Duration',
        description: `You're averaging ${analysis.averageDuration} hours. Aim for 7-9 hours.`,
        priority: 'HIGH',
        actionable: true,
      });
    }

    if (analysis.consistency < 70) {
      recommendations.push({
        category: 'CONSISTENCY',
        title: 'Improve Sleep Schedule Consistency',
        description: 'Your sleep schedule varies significantly. Try to maintain consistent bedtimes.',
        priority: 'HIGH',
        actionable: true,
      });
    }

    if (analysis.sleepDebt > 5) {
      recommendations.push({
        category: 'SLEEP_DEBT',
        title: 'Address Sleep Debt',
        description: `You have approximately ${analysis.sleepDebt.toFixed(1)} hours of sleep debt.`,
        priority: 'HIGH',
        actionable: true,
      });
    }

    if (analysis.sleepEfficiency < 85) {
      recommendations.push({
        category: 'EFFICIENCY',
        title: 'Improve Sleep Efficiency',
        description: 'Your sleep efficiency is below optimal. Reduce nighttime interruptions.',
        priority: 'MEDIUM',
        actionable: true,
      });
    }

    recommendations.push(...this.RECOMMENDATIONS.slice(0, 3));

    return recommendations;
  }

  async getSleepTrend(
    userId: string,
    period: 'week' | 'month' | 'quarter'
  ): Promise<SleepTrend> {
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
    const entries = await this.getSleepHistory(userId, days);

    const data = entries.map(e => ({
      date: format(new Date(e.bedtime), 'yyyy-MM-dd'),
      duration: e.durationHours,
      quality: this.QUALITY_SCORES[e.quality],
    }));

    const averageDuration =
      data.length > 0
        ? data.reduce((sum, d) => sum + d.duration, 0) / data.length
        : 0;
    const averageQuality =
      data.length > 0
        ? data.reduce((sum, d) => sum + d.quality, 0) / data.length
        : 0;

    const consistency = this.calculateConsistency(entries);

    const recentEntries = entries.slice(0, Math.floor(entries.length / 2));
    const olderEntries = entries.slice(Math.floor(entries.length / 2));

    const recentAvg =
      recentEntries.length > 0
        ? recentEntries.reduce((sum, e) => sum + e.durationHours, 0) /
          recentEntries.length
        : 0;
    const olderAvg =
      olderEntries.length > 0
        ? olderEntries.reduce((sum, e) => sum + e.durationHours, 0) /
          olderEntries.length
        : 0;

    const improvement = olderAvg > 0
      ? ((recentAvg - olderAvg) / olderAvg) * 100
      : 0;

    return {
      period,
      averageDuration: Math.round(averageDuration * 10) / 10,
      averageQuality: Math.round(averageQuality * 10) / 10,
      consistency: Math.round(consistency),
      improvement: Math.round(improvement),
      data,
    };
  }

  async getSleepSummary(userId: string): Promise<SleepSummary> {
    const entries = await this.getSleepHistory(userId, 30);

    if (entries.length === 0) {
      return {
        totalSleep: 0,
        averageBedtime: 'N/A',
        averageWakeTime: 'N/A',
        bestNight: { date: 'N/A', duration: 0, quality: 'FAIR' },
        worstNight: { date: 'N/A', duration: 0, quality: 'FAIR' },
        sleepScore: 0,
      };
    }

    const totalSleep = entries.reduce((sum, e) => sum + e.durationHours, 0);
    const optimalTimes = this.calculateOptimalTimes(entries);

    let bestNight = entries[0];
    let worstNight = entries[0];

    entries.forEach(entry => {
      const entryScore = this.QUALITY_SCORES[entry.quality] * entry.durationHours;
      const bestScore = this.QUALITY_SCORES[bestNight.quality] * bestNight.durationHours;
      const worstScore = this.QUALITY_SCORES[worstNight.quality] * worstNight.durationHours;

      if (entryScore > bestScore) bestNight = entry;
      if (entryScore < worstScore) worstNight = entry;
    });

    const sleepScore = entries.reduce(
      (sum, e) => sum + this.QUALITY_SCORES[e.quality],
      0
    ) / entries.length * 20;

    return {
      totalSleep: Math.round(totalSleep * 10) / 10,
      averageBedtime: optimalTimes.bedtime,
      averageWakeTime: optimalTimes.wakeTime,
      bestNight: {
        date: format(new Date(bestNight.bedtime), 'MMM d'),
        duration: bestNight.durationHours,
        quality: bestNight.quality,
      },
      worstNight: {
        date: format(new Date(worstNight.bedtime), 'MMM d'),
        duration: worstNight.durationHours,
        quality: worstNight.quality,
      },
      sleepScore: Math.round(sleepScore),
    };
  }

  async getChartData(
    userId: string,
    days: number = 30
  ): Promise<{
    labels: string[];
    duration: number[];
    quality: number[];
    goal: number[];
  }> {
    const entries = await this.getSleepHistory(userId, days);
    const labels: string[] = [];
    const duration: number[] = [];
    const quality: number[] = [];
    const goal: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const entry = entries.find(
        e => format(new Date(e.bedtime), 'yyyy-MM-dd') === dateStr
      );

      labels.push(format(date, 'MMM d'));
      duration.push(entry?.durationHours || 0);
      quality.push(entry ? this.QUALITY_SCORES[entry.quality] : 0);
      goal.push(8);
    }

    return { labels, duration, quality, goal };
  }

  async getSleepCorrelation(
    userId: string,
    metric: 'exercise' | 'caffeine' | 'screen_time' | 'stress'
  ): Promise<{
    correlation: number;
    dataPoints: { x: number; y: number }[];
  }> {
    const entries = await this.getSleepHistory(userId, 30);

    const dataPoints = entries.map(entry => {
      let xValue = 0;

      switch (metric) {
        case 'exercise':
          xValue = Math.random() * 10;
          break;
        case 'caffeine':
          xValue = Math.random() * 5;
          break;
        case 'screen_time':
          xValue = Math.random() * 8;
          break;
        case 'stress':
          xValue = Math.random() * 10;
          break;
      }

      return {
        x: xValue,
        y: entry.durationHours,
      };
    });

    const correlation = this.calculateCorrelation(
      dataPoints.map(d => d.x),
      dataPoints.map(d => d.y)
    );

    return { correlation, dataPoints };
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n < 2) return 0;

    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominatorX = 0;
    let denominatorY = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - xMean;
      const yDiff = y[i] - yMean;
      numerator += xDiff * yDiff;
      denominatorX += xDiff * xDiff;
      denominatorY += yDiff * yDiff;
    }

    const denominator = Math.sqrt(denominatorX * denominatorY);
    return denominator !== 0 ? numerator / denominator : 0;
  }
}

export const sleepService = new SleepService();