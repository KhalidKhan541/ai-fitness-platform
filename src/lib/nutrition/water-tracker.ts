import { v4 as uuidv4 } from 'uuid';
import { PrismaClient, WaterIntake, Prisma } from '@prisma/client';
import { format, startOfDay, endOfDay, subDays, eachDayOfInterval } from 'date-fns';

const prisma = new PrismaClient();

export interface LogWaterInput {
  amount: number;
  unit: 'ML' | 'OZ' | 'LITERS' | 'CUPS';
  type?: WaterType;
  notes?: string;
}

export interface WaterGoal {
  id: string;
  userId: string;
  dailyGoal: number;
  unit: string;
  reminderEnabled: boolean;
  reminderInterval: number;
  reminderStartTime: string;
  reminderEndTime: string;
}

export interface DailyWaterIntake {
  date: string;
  totalIntake: number;
  goal: number;
  percentage: number;
  entries: WaterIntake[];
  streak: number;
  isGoalMet: boolean;
}

export interface WaterStreak {
  currentStreak: number;
  longestStreak: number;
  totalDaysMetGoal: number;
  recentDays: { date: string; met: boolean }[];
}

export interface WaterStats {
  averageDailyIntake: number;
  totalIntake: number;
  daysTracked: number;
  goalMetPercentage: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  weeklyAverage: number;
  monthlyAverage: number;
}

export interface WaterReminder {
  id: string;
  userId: string;
  time: string;
  enabled: boolean;
  message: string;
}

export type WaterType = 'WATER' | 'TEA' | 'COFFEE' | 'JUICE' | 'SPORTS_DRINK' | 'SPARKLING' | 'OTHER';

export class WaterTrackerService {
  private readonly WATER_CONVERSION_RATES: Record<string, number> = {
    ML: 1,
    OZ: 29.5735,
    LITERS: 1000,
    CUPS: 236.588,
  };

  private readonly DEFAULT_MESSAGES = [
    'Time to hydrate! 💧',
    'Don\'t forget to drink water!',
    'Stay hydrated for better performance!',
    'Water break! Your body will thank you.',
    'Hydration check! Have you had water recently?',
    'Drink up! Water is essential for recovery.',
    'Quick water break recommended!',
    'Keep that water intake up!',
  ];

  async logWater(userId: string, input: LogWaterInput): Promise<WaterIntake> {
    const amountML = this.convertToML(input.amount, input.unit);

    return prisma.waterIntake.create({
      data: {
        id: uuidv4(),
        userId,
        amount: amountML,
        unit: 'ML',
        type: input.type || 'WATER',
        notes: input.notes,
        loggedAt: new Date(),
      },
    });
  }

  async logMultipleWaters(userId: string, entries: LogWaterInput[]): Promise<WaterIntake[]> {
    const results: WaterIntake[] = [];

    for (const entry of entries) {
      const result = await this.logWater(userId, entry);
      results.push(result);
    }

    return results;
  }

  async getDailyIntake(userId: string, date?: Date): Promise<DailyWaterIntake> {
    const targetDate = date || new Date();
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    const entries = await prisma.waterIntake.findMany({
      where: {
        userId,
        loggedAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      orderBy: { loggedAt: 'asc' },
    });

    const totalIntake = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const goal = await this.getDailyGoal(userId);
    const percentage = goal > 0 ? Math.min(100, (totalIntake / goal) * 100) : 0;
    const streak = await this.getCurrentStreak(userId);

    return {
      date: format(targetDate, 'yyyy-MM-dd'),
      totalIntake,
      goal,
      percentage: Math.round(percentage),
      entries,
      streak,
      isGoalMet: totalIntake >= goal,
    };
  }

  async getWaterGoal(userId: string): Promise<WaterGoal> {
    const goal = await prisma.waterGoal.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!goal) {
      return {
        id: '',
        userId,
        dailyGoal: 2500,
        unit: 'ML',
        reminderEnabled: true,
        reminderInterval: 60,
        reminderStartTime: '08:00',
        reminderEndTime: '22:00',
      };
    }

    return {
      id: goal.id,
      userId: goal.userId,
      dailyGoal: goal.dailyGoal,
      unit: goal.unit,
      reminderEnabled: goal.reminderEnabled,
      reminderInterval: goal.reminderInterval,
      reminderStartTime: goal.reminderStartTime,
      reminderEndTime: goal.reminderEndTime,
    };
  }

  async setWaterGoal(userId: string, goal: Partial<WaterGoal>): Promise<WaterGoal> {
    const existing = await prisma.waterGoal.findFirst({
      where: { userId },
    });

    if (existing) {
      const updated = await prisma.waterGoal.update({
        where: { id: existing.id },
        data: goal,
      });

      return {
        id: updated.id,
        userId: updated.userId,
        dailyGoal: updated.dailyGoal,
        unit: updated.unit,
        reminderEnabled: updated.reminderEnabled,
        reminderInterval: updated.reminderInterval,
        reminderStartTime: updated.reminderStartTime,
        reminderEndTime: updated.reminderEndTime,
      };
    } else {
      const created = await prisma.waterGoal.create({
        data: {
          id: uuidv4(),
          userId,
          dailyGoal: goal.dailyGoal || 2500,
          unit: goal.unit || 'ML',
          reminderEnabled: goal.reminderEnabled ?? true,
          reminderInterval: goal.reminderInterval || 60,
          reminderStartTime: goal.reminderStartTime || '08:00',
          reminderEndTime: goal.reminderEndTime || '22:00',
        },
      });

      return {
        id: created.id,
        userId: created.userId,
        dailyGoal: created.dailyGoal,
        unit: created.unit,
        reminderEnabled: created.reminderEnabled,
        reminderInterval: created.reminderInterval,
        reminderStartTime: created.reminderStartTime,
        reminderEndTime: created.reminderEndTime,
      };
    }
  }

  async getStreak(userId: string): Promise<WaterStreak> {
    const currentStreak = await this.getCurrentStreak(userId);
    const longestStreak = await this.getLongestStreak(userId);
    const totalDaysMetGoal = await this.getTotalDaysMetGoal(userId);
    const recentDays = await this.getRecentDaysStatus(userId, 30);

    return {
      currentStreak,
      longestStreak,
      totalDaysMetGoal,
      recentDays,
    };
  }

  private async getCurrentStreak(userId: string): Promise<number> {
    let streak = 0;
    let currentDate = new Date();

    while (true) {
      const dayStart = startOfDay(currentDate);
      const dayEnd = endOfDay(currentDate);

      const entries = await prisma.waterIntake.findMany({
        where: {
          userId,
          loggedAt: { gte: dayStart, lte: dayEnd },
        },
      });

      const totalIntake = entries.reduce((sum, e) => sum + e.amount, 0);
      const goal = await this.getDailyGoal(userId);

      if (totalIntake >= goal) {
        streak++;
        currentDate = subDays(currentDate, 1);
      } else {
        break;
      }
    }

    return streak;
  }

  private async getLongestStreak(userId: string): Promise<number> {
    const thirtyDaysAgo = subDays(new Date(), 365);
    const entries = await prisma.waterIntake.findMany({
      where: {
        userId,
        loggedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { loggedAt: 'asc' },
    });

    const dailyTotals: Record<string, number> = {};
    entries.forEach(entry => {
      const dateKey = format(entry.loggedAt, 'yyyy-MM-dd');
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + entry.amount;
    });

    const goal = await this.getDailyGoal(userId);
    let longestStreak = 0;
    let currentStreak = 0;

    const dates = Object.keys(dailyTotals).sort();
    for (const date of dates) {
      if (dailyTotals[date] >= goal) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return longestStreak;
  }

  private async getTotalDaysMetGoal(userId: string): Promise<number> {
    const goal = await this.getDailyGoal(userId);
    const thirtyDaysAgo = subDays(new Date(), 365);

    const entries = await prisma.waterIntake.findMany({
      where: {
        userId,
        loggedAt: { gte: thirtyDaysAgo },
      },
    });

    const dailyTotals: Record<string, number> = {};
    entries.forEach(entry => {
      const dateKey = format(entry.loggedAt, 'yyyy-MM-dd');
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + entry.amount;
    });

    return Object.values(dailyTotals).filter(total => total >= goal).length;
  }

  private async getRecentDaysStatus(
    userId: string,
    days: number
  ): Promise<{ date: string; met: boolean }[]> {
    const goal = await this.getDailyGoal(userId);
    const result: { date: string; met: boolean }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const entries = await prisma.waterIntake.findMany({
        where: {
          userId,
          loggedAt: { gte: dayStart, lte: dayEnd },
        },
      });

      const totalIntake = entries.reduce((sum, e) => sum + e.amount, 0);
      result.push({
        date: format(date, 'yyyy-MM-dd'),
        met: totalIntake >= goal,
      });
    }

    return result;
  }

  async getWaterStats(userId: string, days: number = 30): Promise<WaterStats> {
    const startDate = subDays(new Date(), days);

    const entries = await prisma.waterIntake.findMany({
      where: {
        userId,
        loggedAt: { gte: startDate },
      },
      orderBy: { loggedAt: 'asc' },
    });

    const dailyTotals: Record<string, number> = {};
    entries.forEach(entry => {
      const dateKey = format(entry.loggedAt, 'yyyy-MM-dd');
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + entry.amount;
    });

    const totalsArray = Object.values(dailyTotals);
    const totalIntake = totalsArray.reduce((sum, t) => sum + t, 0);
    const daysTracked = totalsArray.length;
    const averageDailyIntake = daysTracked > 0 ? totalIntake / daysTracked : 0;

    const goal = await this.getDailyGoal(userId);
    const goalMetPercentage = daysTracked > 0
      ? (totalsArray.filter(t => t >= goal).length / daysTracked) * 100
      : 0;

    const weeklyAverage = await this.calculatePeriodAverage(userId, 7);
    const monthlyAverage = await this.calculatePeriodAverage(userId, 30);

    const trend = this.calculateTrend(totalsArray);

    return {
      averageDailyIntake: Math.round(averageDailyIntake),
      totalIntake,
      daysTracked,
      goalMetPercentage: Math.round(goalMetPercentage),
      trend,
      weeklyAverage: Math.round(weeklyAverage),
      monthlyAverage: Math.round(monthlyAverage),
    };
  }

  private async calculatePeriodAverage(userId: string, days: number): Promise<number> {
    const startDate = subDays(new Date(), days);

    const entries = await prisma.waterIntake.findMany({
      where: {
        userId,
        loggedAt: { gte: startDate },
      },
    });

    const dailyTotals: Record<string, number> = {};
    entries.forEach(entry => {
      const dateKey = format(entry.loggedAt, 'yyyy-MM-dd');
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + entry.amount;
    });

    const totalsArray = Object.values(dailyTotals);
    return totalsArray.length > 0
      ? totalsArray.reduce((sum, t) => sum + t, 0) / totalsArray.length
      : 0;
  }

  private calculateTrend(values: number[]): 'INCREASING' | 'DECREASING' | 'STABLE' {
    if (values.length < 7) return 'STABLE';

    const recentWeek = values.slice(-7);
    const previousWeek = values.slice(-14, -7);

    if (previousWeek.length === 0) return 'STABLE';

    const recentAvg = recentWeek.reduce((a, b) => a + b, 0) / recentWeek.length;
    const previousAvg = previousWeek.reduce((a, b) => a + b, 0) / previousWeek.length;

    const changePercent = ((recentAvg - previousAvg) / previousAvg) * 100;

    if (changePercent > 10) return 'INCREASING';
    if (changePercent < -10) return 'DECREASING';
    return 'STABLE';
  }

  async getChartData(userId: string, days: number = 30): Promise<{
    labels: string[];
    intake: number[];
    goal: number[];
  }> {
    const labels: string[] = [];
    const intake: number[] = [];
    const goal: number[] = [];
    const dailyGoal = await this.getDailyGoal(userId);

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const entries = await prisma.waterIntake.findMany({
        where: {
          userId,
          loggedAt: { gte: dayStart, lte: dayEnd },
        },
      });

      const totalIntake = entries.reduce((sum, e) => sum + e.amount, 0);

      labels.push(format(date, 'MMM d'));
      intake.push(totalIntake);
      goal.push(dailyGoal);
    }

    return { labels, intake, goal };
  }

  async updateEntry(entryId: string, amount: number, unit: string): Promise<WaterIntake> {
    const amountML = this.convertToML(amount, unit);

    return prisma.waterIntake.update({
      where: { id: entryId },
      data: { amount: amountML },
    });
  }

  async deleteEntry(entryId: string): Promise<void> {
    await prisma.waterIntake.delete({ where: { id: entryId } });
  }

  async deleteAllEntriesForDay(userId: string, date: Date): Promise<void> {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    await prisma.waterIntake.deleteMany({
      where: {
        userId,
        loggedAt: { gte: dayStart, lte: dayEnd },
      },
    });
  }

  async getReminders(userId: string): Promise<WaterReminder[]> {
    const goal = await this.getWaterGoal(userId);

    if (!goal.reminderEnabled) return [];

    const reminders: WaterReminder[] = [];
    const startHour = parseInt(goal.reminderStartTime.split(':')[0]);
    const endHour = parseInt(goal.reminderEndTime.split(':')[0]);

    for (let hour = startHour; hour <= endHour; hour += Math.ceil(goal.reminderInterval / 60)) {
      reminders.push({
        id: uuidv4(),
        userId,
        time: `${hour.toString().padStart(2, '0')}:00`,
        enabled: true,
        message: this.getRandomMessage(),
      });
    }

    return reminders;
  }

  private getRandomMessage(): string {
    return this.DEFAULT_MESSAGES[Math.floor(Math.random() * this.DEFAULT_MESSAGES.length)];
  }

  private convertToML(amount: number, unit: string): number {
    const conversionRate = this.WATER_CONVERSION_RATES[unit] || 1;
    return Math.round(amount * conversionRate);
  }

  async getWeeklySummary(userId: string): Promise<{
    averageIntake: number;
    totalIntake: number;
    daysMetGoal: number;
    bestDay: { date: string; amount: number };
    streak: number;
  }> {
    const一周前 = subDays(new Date(), 7);

    const entries = await prisma.waterIntake.findMany({
      where: {
        userId,
        loggedAt: { gte: 一周前 },
      },
      orderBy: { loggedAt: 'asc' },
    });

    const dailyTotals: Record<string, number> = {};
    entries.forEach(entry => {
      const dateKey = format(entry.loggedAt, 'yyyy-MM-dd');
      dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + entry.amount;
    });

    const totalsArray = Object.values(dailyTotals);
    const totalIntake = totalsArray.reduce((sum, t) => sum + t, 0);
    const averageIntake = totalsArray.length > 0 ? totalIntake / totalsArray.length : 0;

    const goal = await this.getDailyGoal(userId);
    const daysMetGoal = totalsArray.filter(t => t >= goal).length;

    let bestDay = { date: '', amount: 0 };
    Object.entries(dailyTotals).forEach(([date, amount]) => {
      if (amount > bestDay.amount) {
        bestDay = { date, amount };
      }
    });

    const streak = await this.getCurrentStreak(userId);

    return {
      averageIntake: Math.round(averageIntake),
      totalIntake,
      daysMetGoal,
      bestDay,
      streak,
    };
  }

  async quickLog(userId: string, preset: 'small' | 'medium' | 'large'): Promise<WaterIntake> {
    const presetAmounts = {
      small: 200,
      medium: 350,
      large: 500,
    };

    return this.logWater(userId, {
      amount: presetAmounts[preset],
      unit: 'ML',
      type: 'WATER',
    });
  }

  async getHydrationTips(): Promise<string[]> {
    return [
      'Drink a glass of water first thing in the morning',
      'Keep a water bottle at your desk',
      'Set hourly reminders to drink water',
      'Drink water before, during, and after exercise',
      'Eat water-rich foods like cucumber and watermelon',
      'Drink a glass of water before each meal',
      'Monitor your urine color - pale yellow is ideal',
      'Add lemon or cucumber for flavor if needed',
      'Drink extra water in hot weather',
      'Increase intake when sick or stressed',
    ];
  }

  async calculateRecommendedIntake(userId: string): Promise<{
    base: number;
    exercise: number;
    climate: number;
    total: number;
  }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { base: 2000, exercise: 0, climate: 0, total: 2000 };
    }

    const weight = user.weight || 70;
    const base = Math.round(weight * 35);

    const exerciseAddition = 500;
    const climateAddition = 0;

    return {
      base,
      exercise: exerciseAddition,
      climate: climateAddition,
      total: base + exerciseAddition + climateAddition,
    };
  }
}

export const waterTrackerService = new WaterTrackerService();