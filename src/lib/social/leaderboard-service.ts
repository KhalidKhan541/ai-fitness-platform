import { z } from "zod";
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
  eachWeekOfInterval,
  eachMonthOfInterval,
  differenceInWeeks,
  differenceInMonths,
} from "date-fns";

// ─── Enums & Constants ──────────────────────────────────────────────

export enum LeaderboardType {
  GLOBAL = "GLOBAL",
  FRIENDS = "FRIENDS",
  CHALLENGE = "CHALLENGE",
  REGIONAL = "REGIONAL",
  WORKOUT_SPECIFIC = "WORKOUT_SPECIFIC",
}

export enum LeaderboardPeriod {
  ALL_TIME = "ALL_TIME",
  YEARLY = "YEARLY",
  MONTHLY = "MONTHLY",
  WEEKLY = "WEEKLY",
  DAILY = "DAILY",
}

export enum LeaderboardMetric {
  TOTAL_POINTS = "TOTAL_POINTS",
  WORKOUT_COUNT = "WORKOUT_COUNT",
  CALORIES_BURNED = "CALORIES_BURNED",
  STREAK_DAYS = "STREAK_DAYS",
  ACHIEVEMENT_POINTS = "ACHIEVEMENT_POINTS",
  CHALLENGE_WINS = "CHALLENGE_WINS",
  TOTAL_VOLUME = "TOTAL_VOLUME",
  TOTAL_DISTANCE = "TOTAL_DISTANCE",
  TOTAL_DURATION = "TOTAL_DURATION",
  STEPS = "STEPS",
}

export const LEADERBOARD_METRIC_CONFIG: Record<
  LeaderboardMetric,
  { label: string; unit: string; icon: string; description: string }
> = {
  [LeaderboardMetric.TOTAL_POINTS]: {
    label: "Total Points",
    unit: "pts",
    icon: "⭐",
    description: "Overall fitness points",
  },
  [LeaderboardMetric.WORKOUT_COUNT]: {
    label: "Workouts",
    unit: "workouts",
    icon: "🏋️",
    description: "Number of completed workouts",
  },
  [LeaderboardMetric.CALORIES_BURNED]: {
    label: "Calories Burned",
    unit: "cal",
    icon: "🔥",
    description: "Total calories burned",
  },
  [LeaderboardMetric.STREAK_DAYS]: {
    label: "Streak Days",
    unit: "days",
    icon: "🔥",
    description: "Current workout streak",
  },
  [LeaderboardMetric.ACHIEVEMENT_POINTS]: {
    label: "Achievement Points",
    unit: "pts",
    icon: "🏆",
    description: "Points from achievements",
  },
  [LeaderboardMetric.CHALLENGE_WINS]: {
    label: "Challenge Wins",
    unit: "wins",
    icon: "🥇",
    description: "Number of challenge victories",
  },
  [LeaderboardMetric.TOTAL_VOLUME]: {
    label: "Total Volume",
    unit: "kg",
    icon: "📦",
    description: "Total weight lifted",
  },
  [LeaderboardMetric.TOTAL_DISTANCE]: {
    label: "Total Distance",
    unit: "km",
    icon: "🏃",
    description: "Total distance covered",
  },
  [LeaderboardMetric.TOTAL_DURATION]: {
    label: "Total Duration",
    unit: "min",
    icon: "⏰",
    description: "Total workout time",
  },
  [LeaderboardMetric.STEPS]: {
    label: "Total Steps",
    unit: "steps",
    icon: "🚶",
    description: "Total steps taken",
  },
};

// ─── Types ──────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  previousRank: number | null;
  rankChange: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  value: number;
  formattedValue: string;
  percentile: number;
  isCurrentUser: boolean;
  isFriend: boolean;
  badges: Array<{
    icon: string;
    label: string;
    color: string;
  }>;
  streak: number;
  level: number;
}

export interface Leaderboard {
  id: string;
  type: LeaderboardType;
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  totalParticipants: number;
  lastUpdated: string;
  metadata: Record<string, unknown>;
}

export interface UserRankHistory {
  date: string;
  rank: number;
  value: number;
}

export interface LeaderboardStats {
  currentRank: number | null;
  previousRank: number | null;
  rankChange: number;
  value: number;
  percentile: number;
  totalParticipants: number;
  bestRank: number;
  averageRank: number;
  rankHistory: UserRankHistory[];
  nearbyEntries: LeaderboardEntry[];
}

export interface LeaderboardConfig {
  type: LeaderboardType;
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  limit: number;
  userId?: string;
  challengeId?: string;
  region?: string;
  workoutType?: string;
}

// ─── Service ────────────────────────────────────────────────────────

export class LeaderboardService {
  private userMetrics: Map<string, Map<string, number>> = new Map();
  private rankHistory: Map<string, UserRankHistory[]> = new Map();
  private leaderboardCache: Map<string, Leaderboard> = new Map();

  async getLeaderboard(
    config: LeaderboardConfig,
    viewerId?: string
  ): Promise<Leaderboard> {
    const cacheKey = this.buildCacheKey(config);
    const cached = this.leaderboardCache.get(cacheKey);
    if (cached) return cached;

    const entries = await this.calculateLeaderboard(config, viewerId);
    const leaderboard: Leaderboard = {
      id: cacheKey,
      type: config.type,
      metric: config.metric,
      period: config.period,
      entries,
      totalParticipants: entries.length,
      lastUpdated: new Date().toISOString(),
      metadata: {
        challengeId: config.challengeId,
        region: config.region,
        workoutType: config.workoutType,
      },
    };

    this.leaderboardCache.set(cacheKey, leaderboard);
    return leaderboard;
  }

  async getUserLeaderboardStats(
    userId: string,
    config: LeaderboardConfig
  ): Promise<LeaderboardStats> {
    const leaderboard = await this.getLeaderboard(config, userId);
    const entry = leaderboard.entries.find((e) => e.userId === userId);

    const userHistory = this.rankHistory.get(
      `${userId}_${config.metric}_${config.period}`
    ) ?? [];

    const previousRank = entry?.previousRank ?? null;
    const rankChange = entry?.rankChange ?? 0;

    let bestRank = leaderboard.totalParticipants;
    let totalRank = 0;
    for (const h of userHistory) {
      if (h.rank < bestRank) bestRank = h.rank;
      totalRank += h.rank;
    }
    const averageRank =
      userHistory.length > 0
        ? Math.round(totalRank / userHistory.length)
        : entry?.rank ?? 0;

    const percentile =
      entry && leaderboard.totalParticipants > 0
        ? Math.round(
            ((leaderboard.totalParticipants - entry.rank + 1) /
              leaderboard.totalParticipants) *
              100 *
              100
          ) / 100
        : 0;

    const nearbyEntries = entry
      ? leaderboard.entries.filter(
          (e) =>
            Math.abs(e.rank - entry.rank) <= 5 &&
            e.userId !== userId
        )
      : [];

    return {
      currentRank: entry?.rank ?? null,
      previousRank,
      rankChange,
      value: entry?.value ?? 0,
      percentile,
      totalParticipants: leaderboard.totalParticipants,
      bestRank,
      averageRank,
      rankHistory: userHistory.slice(-30),
      nearbyEntries,
    };
  }

  async getWeeklyLeaderboard(
    metric: LeaderboardMetric,
    viewerId?: string
  ): Promise<Leaderboard> {
    return this.getLeaderboard(
      {
        type: LeaderboardType.GLOBAL,
        metric,
        period: LeaderboardPeriod.WEEKLY,
        limit: 100,
      },
      viewerId
    );
  }

  async getMonthlyLeaderboard(
    metric: LeaderboardMetric,
    viewerId?: string
  ): Promise<Leaderboard> {
    return this.getLeaderboard(
      {
        type: LeaderboardType.GLOBAL,
        metric,
        period: LeaderboardPeriod.MONTHLY,
        limit: 100,
      },
      viewerId
    );
  }

  async getFriendsLeaderboard(
    userId: string,
    metric: LeaderboardMetric,
    period: LeaderboardPeriod = LeaderboardPeriod.WEEKLY
  ): Promise<Leaderboard> {
    return this.getLeaderboard(
      {
        type: LeaderboardType.FRIENDS,
        metric,
        period,
        limit: 100,
        userId,
      },
      userId
    );
  }

  async getStreakLeaderboard(
    period: LeaderboardPeriod = LeaderboardPeriod.ALL_TIME,
    viewerId?: string
  ): Promise<Leaderboard> {
    return this.getLeaderboard(
      {
        type: LeaderboardType.GLOBAL,
        metric: LeaderboardMetric.STREAK_DAYS,
        period,
        limit: 100,
      },
      viewerId
    );
  }

  async getWorkoutLeaderboard(
    workoutType: string,
    metric: LeaderboardMetric = LeaderboardMetric.TOTAL_VOLUME,
    period: LeaderboardPeriod = LeaderboardPeriod.MONTHLY,
    viewerId?: string
  ): Promise<Leaderboard> {
    return this.getLeaderboard(
      {
        type: LeaderboardType.WORKOUT_SPECIFIC,
        metric,
        period,
        limit: 100,
        workoutType,
      },
      viewerId
    );
  }

  async getRegionalLeaderboard(
    region: string,
    metric: LeaderboardMetric = LeaderboardMetric.TOTAL_POINTS,
    period: LeaderboardPeriod = LeaderboardPeriod.MONTHLY,
    viewerId?: string
  ): Promise<Leaderboard> {
    return this.getLeaderboard(
      {
        type: LeaderboardType.REGIONAL,
        metric,
        period,
        limit: 100,
        region,
      },
      viewerId
    );
  }

  async recordMetric(
    userId: string,
    metric: LeaderboardMetric,
    value: number,
    period: LeaderboardPeriod
  ): Promise<void> {
    const key = `${userId}_${metric}`;
    const userMetrics = this.userMetrics.get(key) ?? new Map();

    const periodKey = this.getPeriodKey(period);
    const currentValue = userMetrics.get(periodKey) ?? 0;
    userMetrics.set(periodKey, currentValue + value);
    this.userMetrics.set(key, userMetrics);

    this.leaderboardCache.clear();
  }

  async setMetric(
    userId: string,
    metric: LeaderboardMetric,
    value: number,
    period: LeaderboardPeriod
  ): Promise<void> {
    const key = `${userId}_${metric}`;
    const userMetrics = this.userMetrics.get(key) ?? new Map();

    const periodKey = this.getPeriodKey(period);
    userMetrics.set(periodKey, value);
    this.userMetrics.set(key, userMetrics);

    this.leaderboardCache.clear();
  }

  async getUserRankHistory(
    userId: string,
    metric: LeaderboardMetric,
    period: LeaderboardPeriod,
    days: number = 30
  ): Promise<UserRankHistory[]> {
    const historyKey = `${userId}_${metric}_${period}`;
    const history = this.rankHistory.get(historyKey) ?? [];

    return history.slice(-days);
  }

  async getTopPerformers(
    metric: LeaderboardMetric,
    period: LeaderboardPeriod,
    limit: number = 10
  ): Promise<
    Array<{
      userId: string;
      username: string;
      value: number;
      streak: number;
    }>
  > {
    const leaderboard = await this.getLeaderboard({
      type: LeaderboardType.GLOBAL,
      metric,
      period,
      limit,
    });

    return leaderboard.entries.map((e) => ({
      userId: e.userId,
      username: e.username,
      value: e.value,
      streak: e.streak,
    }));
  }

  async compareUsers(
    userIds: string[],
    metric: LeaderboardMetric,
    period: LeaderboardPeriod = LeaderboardPeriod.MONTHLY
  ): Promise<
    Array<{
      userId: string;
      value: number;
      rank: number;
    }>
  > {
    const leaderboard = await this.getLeaderboard({
      type: LeaderboardType.GLOBAL,
      metric,
      period,
      limit: Number.MAX_SAFE_INTEGER,
    });

    return userIds
      .map((userId) => {
        const entry = leaderboard.entries.find((e) => e.userId === userId);
        return {
          userId,
          value: entry?.value ?? 0,
          rank: entry?.rank ?? leaderboard.totalParticipants + 1,
        };
      })
      .sort((a, b) => a.rank - b.rank);
  }

  async getLeaderboardTrends(
    metric: LeaderboardMetric,
    period: LeaderboardPeriod,
    weeks: number = 4
  ): Promise<
    Array<{
      period: string;
      topEntry: { userId: string; value: number };
      averageValue: number;
      totalParticipants: number;
    }>
  > {
    const trends: Array<{
      period: string;
      topEntry: { userId: string; value: number };
      averageValue: number;
      totalParticipants: number;
    }> = [];

    for (let i = weeks - 1; i >= 0; i--) {
      const now = new Date();
      let periodStart: Date;
      let periodEnd: Date;
      let periodLabel: string;

      if (period === LeaderboardPeriod.WEEKLY) {
        const weekDate = subWeeks(now, i);
        periodStart = startOfWeek(weekDate);
        periodEnd = endOfWeek(weekDate);
        periodLabel = format(periodStart, "yyyy-MM-dd");
      } else {
        const monthDate = subMonths(now, i);
        periodStart = startOfMonth(monthDate);
        periodEnd = endOfMonth(monthDate);
        periodLabel = format(periodStart, "yyyy-MM");
      }

      const allEntries = Array.from(this.userMetrics.entries())
        .filter(([key]) => key.endsWith(`_${metric}`))
        .map(([key, metrics]) => {
          const userId = key.split("_")[0];
          const periodKey = format(periodStart, "yyyy-MM-dd");
          const value = metrics.get(periodKey) ?? 0;
          return { userId, value };
        })
        .filter((e) => e.value > 0)
        .sort((a, b) => b.value - a.value);

      if (allEntries.length > 0) {
        const totalValue = allEntries.reduce((sum, e) => sum + e.value, 0);
        trends.push({
          period: periodLabel,
          topEntry: {
            userId: allEntries[0].userId,
            value: allEntries[0].value,
          },
          averageValue:
            Math.round((totalValue / allEntries.length) * 100) / 100,
          totalParticipants: allEntries.length,
        });
      }
    }

    return trends;
  }

  private async calculateLeaderboard(
    config: LeaderboardConfig,
    viewerId?: string
  ): Promise<LeaderboardEntry[]> {
    const entries: LeaderboardEntry[] = [];
    const periodKey = this.getPeriodKey(config.period);

    for (const [key, metrics] of this.userMetrics) {
      if (!key.endsWith(`_${config.metric}`)) continue;

      const userId = key.replace(`_${config.metric}`, "").replace(/_/g, "");
      const value = metrics.get(periodKey) ?? 0;

      if (value <= 0) continue;

      const previousPeriodKey = this.getPreviousPeriodKey(config.period);
      const previousValue = metrics.get(previousPeriodKey) ?? 0;

      entries.push({
        rank: 0,
        previousRank: null,
        rankChange: 0,
        userId,
        username: `user_${userId.slice(0, 8)}`,
        displayName: `User ${userId.slice(0, 8)}`,
        avatarUrl: null,
        value,
        formattedValue: this.formatValue(value, config.metric),
        percentile: 0,
        isCurrentUser: viewerId === userId,
        isFriend: false,
        badges: this.getUserBadges(value, config.metric),
        streak: 0,
        level: this.calculateLevel(value),
      });
    }

    entries.sort((a, b) => b.value - a.value);

    entries.forEach((entry, index) => {
      entry.rank = index + 1;
      entry.percentile =
        entries.length > 0
          ? Math.round(
              ((entries.length - entry.rank + 1) / entries.length) *
                100 *
                100
            ) / 100
          : 0;
    });

    if (viewerId) {
      const viewerEntry = entries.find((e) => e.userId === viewerId);
      if (viewerEntry) {
        const historyKey = `${viewerId}_${config.metric}_${config.period}`;
        const history = this.rankHistory.get(historyKey) ?? [];
        const previousRank =
          history.length > 0
            ? history[history.length - 1].rank
            : null;
        viewerEntry.previousRank = previousRank;
        viewerEntry.rankChange = previousRank
          ? previousRank - viewerEntry.rank
          : 0;
      }
    }

    return entries.slice(0, config.limit);
  }

  private formatValue(value: number, metric: LeaderboardMetric): string {
    const config = LEADERBOARD_METRIC_CONFIG[metric];

    switch (metric) {
      case LeaderboardMetric.CALORIES_BURNED:
        return `${value.toLocaleString()} ${config.unit}`;
      case LeaderboardMetric.TOTAL_VOLUME:
        return `${value.toLocaleString()} ${config.unit}`;
      case LeaderboardMetric.TOTAL_DISTANCE:
        return `${(value / 1000).toFixed(1)} ${config.unit}`;
      case LeaderboardMetric.TOTAL_DURATION:
        const hours = Math.floor(value / 60);
        const mins = value % 60;
        return hours > 0
          ? `${hours}h ${mins}m`
          : `${mins} ${config.unit}`;
      case LeaderboardMetric.STEPS:
        return `${value.toLocaleString()}`;
      default:
        return `${value} ${config.unit}`;
    }
  }

  private getUserBadges(
    value: number,
    metric: LeaderboardMetric
  ): Array<{ icon: string; label: string; color: string }> {
    const badges: Array<{ icon: string; label: string; color: string }> = [];

    const thresholds: Array<{
      min: number;
      icon: string;
      label: string;
      color: string;
    }> = [
      { min: 1000, icon: "💎", label: "Diamond", color: "#3b82f6" },
      { min: 500, icon: "👑", label: "Crown", color: "#f59e0b" },
      { min: 100, icon: "🏅", label: "Gold", color: "#eab308" },
      { min: 50, icon: "🥈", label: "Silver", color: "#9ca3af" },
      { min: 10, icon: "🥉", label: "Bronze", color: "#d97706" },
    ];

    for (const threshold of thresholds) {
      if (value >= threshold.min) {
        badges.push({
          icon: threshold.icon,
          label: threshold.label,
          color: threshold.color,
        });
        break;
      }
    }

    return badges;
  }

  private calculateLevel(value: number): number {
    if (value >= 10000) return 50;
    if (value >= 5000) return 40;
    if (value >= 2000) return 30;
    if (value >= 1000) return 20;
    if (value >= 500) return 15;
    if (value >= 100) return 10;
    if (value >= 50) return 5;
    return 1;
  }

  private getPeriodKey(period: LeaderboardPeriod): string {
    const now = new Date();
    switch (period) {
      case LeaderboardPeriod.DAILY:
        return format(now, "yyyy-MM-dd");
      case LeaderboardPeriod.WEEKLY:
        return format(startOfWeek(now), "yyyy-MM-dd");
      case LeaderboardPeriod.MONTHLY:
        return format(startOfMonth(now), "yyyy-MM");
      case LeaderboardPeriod.YEARLY:
        return format(now, "yyyy");
      case LeaderboardPeriod.ALL_TIME:
        return "all_time";
    }
  }

  private getPreviousPeriodKey(period: LeaderboardPeriod): string {
    const now = new Date();
    switch (period) {
      case LeaderboardPeriod.DAILY:
        return format(subWeeks(now, 1), "yyyy-MM-dd");
      case LeaderboardPeriod.WEEKLY:
        return format(startOfWeek(subWeeks(now, 1)), "yyyy-MM-dd");
      case LeaderboardPeriod.MONTHLY:
        return format(startOfMonth(subMonths(now, 1)), "yyyy-MM");
      case LeaderboardPeriod.YEARLY:
        return format(subMonths(now, 12), "yyyy");
      case LeaderboardPeriod.ALL_TIME:
        return "all_time";
    }
  }

  private buildCacheKey(config: LeaderboardConfig): string {
    return [
      config.type,
      config.metric,
      config.period,
      config.challengeId ?? "",
      config.region ?? "",
      config.workoutType ?? "",
    ]
      .filter(Boolean)
      .join("_");
  }

  async invalidateCache(): Promise<void> {
    this.leaderboardCache.clear();
  }

  async getGlobalRankings(
    metric: LeaderboardMetric = LeaderboardMetric.TOTAL_POINTS,
    limit: number = 100
  ): Promise<
    Array<{
      rank: number;
      userId: string;
      username: string;
      value: number;
      level: number;
    }>
  > {
    const leaderboard = await this.getLeaderboard({
      type: LeaderboardType.GLOBAL,
      metric,
      period: LeaderboardPeriod.ALL_TIME,
      limit,
    });

    return leaderboard.entries.map((e) => ({
      rank: e.rank,
      userId: e.userId,
      username: e.username,
      value: e.value,
      level: e.level,
    }));
  }
}

export const leaderboardService = new LeaderboardService();
