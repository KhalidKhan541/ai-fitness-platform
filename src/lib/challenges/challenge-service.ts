import { z } from "zod";
import {
  addDays,
  addWeeks,
  differenceInDays,
  differenceInHours,
  format,
  parseISO,
  startOfDay,
  isAfter,
  isBefore,
  eachDayOfInterval,
} from "date-fns";

// ─── Enums & Constants ──────────────────────────────────────────────

export enum ChallengeType {
  STEPS = "STEPS",
  WORKOUT_FREQUENCY = "WORKOUT_FREQUENCY",
  WEIGHT_LOSS = "WEIGHT_LOSS",
  WATER_INTAKE = "WATER_INTAKE",
  CALORIE_BURN = "CALORIE_BURN",
  DISTANCE = "DISTANCE",
  STREAK = "STREAK",
  CUSTOM = "CUSTOM",
}

export enum ChallengeStatus {
  DRAFT = "DRAFT",
  UPCOMING = "UPCOMING",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum ChallengePrivacy {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
  FRIENDS_ONLY = "FRIENDS_ONLY",
}

export enum ParticipantStatus {
  JOINED = "JOINED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  DISQUALIFIED = "DISQUALIFIED",
  WITHDRAWN = "WITHDRAWN",
}

export enum TeamRole {
  CREATOR = "CREATOR",
  CAPTAIN = "CAPTAIN",
  MEMBER = "MEMBER",
}

export const CHALLENGE_TYPE_CONFIG: Record<
  ChallengeType,
  {
    label: string;
    icon: string;
    unit: string;
    description: string;
    metricKey: string;
  }
> = {
  [ChallengeType.STEPS]: {
    label: "Steps",
    icon: "🚶",
    unit: "steps",
    description: "Track daily step count",
    metricKey: "steps",
  },
  [ChallengeType.WORKOUT_FREQUENCY]: {
    label: "Workout Frequency",
    icon: "🏋️",
    unit: "workouts",
    description: "Complete the most workouts",
    metricKey: "workout_count",
  },
  [ChallengeType.WEIGHT_LOSS]: {
    label: "Weight Loss",
    icon: "📉",
    unit: "kg",
    description: "Lose the most weight",
    metricKey: "weight_change",
  },
  [ChallengeType.WATER_INTAKE]: {
    label: "Water Intake",
    icon: "💧",
    unit: "ml",
    description: "Drink the most water",
    metricKey: "water_intake",
  },
  [ChallengeType.CALORIE_BURN]: {
    label: "Calorie Burn",
    icon: "🔥",
    unit: "cal",
    description: "Burn the most calories",
    metricKey: "calories_burned",
  },
  [ChallengeType.DISTANCE]: {
    label: "Distance",
    icon: "🏃",
    unit: "km",
    description: "Cover the most distance",
    metricKey: "distance",
  },
  [ChallengeType.STREAK]: {
    label: "Streak",
    icon: "🔥",
    unit: "days",
    description: "Maintain the longest streak",
    metricKey: "streak_days",
  },
  [ChallengeType.CUSTOM]: {
    label: "Custom",
    icon: "⚙️",
    unit: "points",
    description: "Custom metric challenge",
    metricKey: "custom",
  },
};

// ─── Validation Schemas ─────────────────────────────────────────────

export const createChallengeSchema = z
  .object({
    creatorId: z.string().uuid(),
    title: z.string().min(3).max(100),
    description: z.string().max(1000).optional(),
    type: z.nativeEnum(ChallengeType),
    privacy: z.nativeEnum(ChallengePrivacy).default(ChallengePrivacy.PUBLIC),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    maxParticipants: z.number().int().min(2).max(10000).optional(),
    targetValue: z.number().positive(),
    teamMode: z.boolean().default(false),
    teamSize: z.number().int().min(2).max(50).optional(),
    rewards: z
      .array(
        z.object({
          rank: z.number().int().min(1),
          type: z.enum(["points", "badge", "title", "unlock"]),
          value: z.string(),
          amount: z.number().positive().optional(),
        })
      )
      .optional(),
    rules: z.string().max(2000).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return isAfter(end, start);
    },
    { message: "End date must be after start date", path: ["endDate"] }
  );

export const joinChallengeSchema = z.object({
  userId: z.string().uuid(),
  challengeId: z.string().uuid(),
  teamId: z.string().uuid().optional(),
});

export const updateChallengeProgressSchema = z.object({
  userId: z.string().uuid(),
  challengeId: z.string().uuid(),
  value: z.number().min(0),
  date: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ─── Types ──────────────────────────────────────────────────────────

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type JoinChallengeInput = z.infer<typeof joinChallengeSchema>;
export type UpdateChallengeProgressInput = z.infer<
  typeof updateChallengeProgressSchema
>;

export interface ChallengeReward {
  rank: number;
  type: "points" | "badge" | "title" | "unlock";
  value: string;
  amount?: number;
}

export interface Challenge {
  id: string;
  creatorId: string;
  title: string;
  description: string | null;
  type: ChallengeType;
  status: ChallengeStatus;
  privacy: ChallengePrivacy;
  startDate: string;
  endDate: string;
  targetValue: number;
  maxParticipants: number | null;
  teamMode: boolean;
  teamSize: number | null;
  rewards: ChallengeReward[];
  rules: string | null;
  metadata: Record<string, unknown>;
  participants: ChallengeParticipant[];
  teams: ChallengeTeam[];
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeParticipant {
  id: string;
  userId: string;
  challengeId: string;
  teamId: string | null;
  status: ParticipantStatus;
  currentValue: number;
  rank: number;
  joinedAt: string;
  lastActiveAt: string;
  dailyProgress: DailyProgress[];
  metadata: Record<string, unknown>;
}

export interface ChallengeTeam {
  id: string;
  challengeId: string;
  name: string;
  captainId: string;
  members: ChallengeParticipant[];
  totalValue: number;
  averageValue: number;
  rank: number;
  createdAt: string;
}

export interface DailyProgress {
  date: string;
  value: number;
  metadata: Record<string, unknown>;
}

export interface ChallengeLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  currentValue: number;
  targetValue: number;
  percentage: number;
  dailyAverage: number;
  streak: number;
  teamId: string | null;
  teamName: string | null;
  isOnTrack: boolean;
}

export interface ChallengeStats {
  totalChallenges: number;
  activeChallenges: number;
  completedChallenges: number;
  wonChallenges: number;
  totalRewards: number;
  averageRank: number;
  bestRank: number;
  totalParticipantsFaced: number;
  challengesByType: Record<ChallengeType, number>;
}

export interface ChallengeActivity {
  id: string;
  challengeId: string;
  userId: string;
  type:
    | "joined"
    | "progress_update"
    | "milestone_reached"
    | "rank_change"
    | "completed"
    | "withdrew";
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ─── Service ────────────────────────────────────────────────────────

export class ChallengeService {
  private challenges: Map<string, Challenge> = new Map();
  private participants: Map<string, ChallengeParticipant[]> = new Map();
  private teams: Map<string, ChallengeTeam[]> = new Map();
  private activities: Map<string, ChallengeActivity[]> = new Map();
  private dailyProgress: Map<string, DailyProgress[]> = new Map();

  async createChallenge(input: CreateChallengeInput): Promise<Challenge> {
    const validated = createChallengeSchema.parse(input);
    const now = new Date().toISOString();

    const startDate = parseISO(validated.startDate);
    const nowDate = new Date();
    const initialStatus = isAfter(startDate, nowDate)
      ? ChallengeStatus.UPCOMING
      : ChallengeStatus.ACTIVE;

    const challenge: Challenge = {
      id: crypto.randomUUID(),
      creatorId: validated.creatorId,
      title: validated.title,
      description: validated.description ?? null,
      type: validated.type,
      status: initialStatus,
      privacy: validated.privacy,
      startDate: validated.startDate,
      endDate: validated.endDate,
      targetValue: validated.targetValue,
      maxParticipants: validated.maxParticipants ?? null,
      teamMode: validated.teamMode,
      teamSize: validated.teamSize ?? null,
      rewards: validated.rewards ?? [],
      rules: validated.rules ?? null,
      metadata: validated.metadata ?? {},
      participants: [],
      teams: [],
      createdAt: now,
      updatedAt: now,
    };

    this.challenges.set(challenge.id, challenge);
    this.participants.set(challenge.id, []);
    this.teams.set(challenge.id, []);
    this.activities.set(challenge.id, []);

    this.recordActivity(challenge.id, validated.creatorId, "joined", {
      message: `Created challenge "${challenge.title}"`,
    });

    return challenge;
  }

  async joinChallenge(input: JoinChallengeInput): Promise<ChallengeParticipant> {
    const challenge = this.challenges.get(input.challengeId);
    if (!challenge) throw new Error(`Challenge ${input.challengeId} not found`);

    if (
      challenge.status !== ChallengeStatus.ACTIVE &&
      challenge.status !== ChallengeStatus.UPCOMING
    ) {
      throw new Error("Challenge is not accepting participants");
    }

    const existingParticipants = this.participants.get(input.challengeId) ?? [];
    const alreadyJoined = existingParticipants.find(
      (p) => p.userId === input.userId
    );
    if (alreadyJoined) throw new Error("User already joined this challenge");

    if (
      challenge.maxParticipants &&
      existingParticipants.length >= challenge.maxParticipants
    ) {
      throw new Error("Challenge is full");
    }

    if (challenge.teamMode && input.teamId) {
      const teams = this.teams.get(input.challengeId) ?? [];
      const team = teams.find((t) => t.id === input.teamId);
      if (!team) throw new Error(`Team ${input.teamId} not found`);

      if (challenge.teamSize && team.members.length >= challenge.teamSize) {
        throw new Error("Team is full");
      }
    }

    const now = new Date().toISOString();
    const participant: ChallengeParticipant = {
      id: crypto.randomUUID(),
      userId: input.userId,
      challengeId: input.challengeId,
      teamId: input.teamId ?? null,
      status: ParticipantStatus.JOINED,
      currentValue: 0,
      rank: existingParticipants.length + 1,
      joinedAt: now,
      lastActiveAt: now,
      dailyProgress: [],
      metadata: {},
    };

    existingParticipants.push(participant);
    this.participants.set(input.challengeId, existingParticipants);

    if (input.teamId) {
      const teams = this.teams.get(input.challengeId) ?? [];
      const team = teams.find((t) => t.id === input.teamId);
      if (team) {
        team.members.push(participant);
        this.updateTeamStats(team);
      }
    }

    this.recordActivity(input.challengeId, input.userId, "joined", {
      message: "Joined the challenge",
      teamId: input.teamId,
    });

    return participant;
  }

  async leaveChallenge(
    userId: string,
    challengeId: string
  ): Promise<boolean> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return false;

    const challengeParticipants = this.participants.get(challengeId) ?? [];
    const participantIndex = challengeParticipants.findIndex(
      (p) => p.userId === userId
    );
    if (participantIndex === -1) return false;

    const participant = challengeParticipants[participantIndex];
    participant.status = ParticipantStatus.WITHDRAWN;

    if (participant.teamId) {
      const teams = this.teams.get(challengeId) ?? [];
      const team = teams.find((t) => t.id === participant.teamId);
      if (team) {
        team.members = team.members.filter((m) => m.userId !== userId);
        this.updateTeamStats(team);
      }
    }

    this.recordActivity(challengeId, userId, "withdrew", {
      message: "Left the challenge",
    });

    return true;
  }

  async createTeam(
    challengeId: string,
    creatorId: string,
    teamName: string
  ): Promise<ChallengeTeam> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) throw new Error(`Challenge ${challengeId} not found`);
    if (!challenge.teamMode) throw new Error("Challenge is not in team mode");

    const now = new Date().toISOString();
    const team: ChallengeTeam = {
      id: crypto.randomUUID(),
      challengeId,
      name: teamName,
      captainId: creatorId,
      members: [],
      totalValue: 0,
      averageValue: 0,
      rank: 0,
      createdAt: now,
    };

    const teams = this.teams.get(challengeId) ?? [];
    teams.push(team);
    this.teams.set(challengeId, teams);

    return team;
  }

  async joinTeam(
    challengeId: string,
    userId: string,
    teamId: string
  ): Promise<ChallengeParticipant> {
    return this.joinChallenge({
      userId,
      challengeId,
      teamId,
    });
  }

  async updateProgress(
    input: UpdateChallengeProgressInput
  ): Promise<ChallengeParticipant> {
    const challenge = this.challenges.get(input.challengeId);
    if (!challenge) throw new Error(`Challenge ${input.challengeId} not found`);
    if (challenge.status !== ChallengeStatus.ACTIVE) {
      throw new Error("Challenge is not active");
    }

    const challengeParticipants = this.participants.get(input.challengeId) ?? [];
    const participant = challengeParticipants.find(
      (p) => p.userId === input.userId && p.status !== ParticipantStatus.WITHDRAWN
    );
    if (!participant) throw new Error("User is not a participant");

    const progressDate =
      input.date ?? new Date().toISOString();
    const dateStr = format(parseISO(progressDate), "yyyy-MM-dd");

    const existingDayProgress = participant.dailyProgress.find(
      (d) => d.date === dateStr
    );
    if (existingDayProgress) {
      existingDayProgress.value = input.value;
      existingDayProgress.metadata = input.metadata ?? {};
    } else {
      participant.dailyProgress.push({
        date: dateStr,
        value: input.value,
        metadata: input.metadata ?? {},
      });
    }

    participant.currentValue = participant.dailyProgress.reduce(
      (sum, d) => sum + d.value,
      0
    );
    participant.lastActiveAt = new Date().toISOString();
    participant.status = ParticipantStatus.IN_PROGRESS;

    if (participant.currentValue >= challenge.targetValue) {
      participant.status = ParticipantStatus.COMPLETED;
      this.recordActivity(input.challengeId, input.userId, "completed", {
        message: `Completed the challenge with ${participant.currentValue} ${CHALLENGE_TYPE_CONFIG[challenge.type].unit}`,
      });
    } else {
      this.recordActivity(input.challengeId, input.userId, "progress_update", {
        message: `Progress: ${participant.currentValue}/${challenge.targetValue} ${CHALLENGE_TYPE_CONFIG[challenge.type].unit}`,
        value: participant.currentValue,
      });
    }

    if (participant.teamId) {
      const teams = this.teams.get(input.challengeId) ?? [];
      const team = teams.find((t) => t.id === participant.teamId);
      if (team) this.updateTeamStats(team);
    }

    this.updateRankings(input.challengeId);

    return participant;
  }

  async getLeaderboard(
    challengeId: string,
    options?: {
      limit?: number;
      offset?: number;
      team?: boolean;
    }
  ): Promise<ChallengeLeaderboardEntry[]> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) throw new Error(`Challenge ${challengeId} not found`);

    if (options?.team) {
      return this.getTeamLeaderboard(challengeId, options);
    }

    const challengeParticipants = this.participants.get(challengeId) ?? [];
    const activeParticipants = challengeParticipants.filter(
      (p) =>
        p.status !== ParticipantStatus.WITHDRAWN &&
        p.status !== ParticipantStatus.DISQUALIFIED
    );

    const now = startOfDay(new Date());
    const startDate = startOfDay(parseISO(challenge.startDate));
    const daysElapsed = Math.max(differenceInDays(now, startDate), 1);

    const entries: ChallengeLeaderboardEntry[] = activeParticipants
      .sort((a, b) => b.currentValue - a.currentValue)
      .map((p, index) => {
        const percentage =
          challenge.targetValue > 0
            ? Math.min(
                (p.currentValue / challenge.targetValue) * 100,
                100
              )
            : 0;

        const dailyAverage = p.currentValue / daysElapsed;
        const streak = this.calculateParticipantStreak(p);

        const remainingDays = Math.max(
          differenceInDays(parseISO(challenge.endDate), now),
          0
        );
        const projectedTotal = p.currentValue + dailyAverage * remainingDays;
        const isOnTrack = projectedTotal >= challenge.targetValue;

        return {
          rank: index + 1,
          userId: p.userId,
          username: `user_${p.userId.slice(0, 8)}`,
          displayName: `User ${p.userId.slice(0, 8)}`,
          avatarUrl: null,
          currentValue: p.currentValue,
          targetValue: challenge.targetValue,
          percentage: Math.round(percentage * 100) / 100,
          dailyAverage: Math.round(dailyAverage * 100) / 100,
          streak,
          teamId: p.teamId,
          teamName: null,
          isOnTrack,
        };
      });

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    return entries.slice(offset, offset + limit);
  }

  private getTeamLeaderboard(
    challengeId: string,
    options?: { limit?: number; offset?: number }
  ): ChallengeLeaderboardEntry[] {
    const teams = this.teams.get(challengeId) ?? [];
    const challenge = this.challenges.get(challengeId)!;

    const now = startOfDay(new Date());
    const startDate = startOfDay(parseISO(challenge.startDate));
    const daysElapsed = Math.max(differenceInDays(now, startDate), 1);

    const entries: ChallengeLeaderboardEntry[] = teams
      .sort((a, b) => b.totalValue - a.totalValue)
      .map((team, index) => {
        const percentage =
          challenge.targetValue > 0
            ? Math.min(
                (team.averageValue / challenge.targetValue) * 100,
                100
              )
            : 0;

        const dailyAverage = team.averageValue / daysElapsed;

        return {
          rank: index + 1,
          userId: team.captainId,
          username: `team_${team.name}`,
          displayName: team.name,
          avatarUrl: null,
          currentValue: team.averageValue,
          targetValue: challenge.targetValue,
          percentage: Math.round(percentage * 100) / 100,
          dailyAverage: Math.round(dailyAverage * 100) / 100,
          streak: 0,
          teamId: team.id,
          teamName: team.name,
          isOnTrack: false,
        };
      });

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    return entries.slice(offset, offset + limit);
  }

  async getChallenge(
    challengeId: string
  ): Promise<Challenge | null> {
    return this.challenges.get(challengeId) ?? null;
  }

  async getUserChallenges(
    userId: string,
    options?: {
      status?: ChallengeStatus;
      type?: ChallengeType;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ challenges: Challenge[]; total: number }> {
    let userChallenges: Challenge[] = [];

    for (const [challengeId, challengeParticipants] of this.participants) {
      const isParticipant = challengeParticipants.some(
        (p) => p.userId === userId && p.status !== ParticipantStatus.WITHDRAWN
      );
      if (isParticipant) {
        const challenge = this.challenges.get(challengeId);
        if (challenge) userChallenges.push(challenge);
      }
    }

    if (options?.status) {
      userChallenges = userChallenges.filter(
        (c) => c.status === options.status
      );
    }
    if (options?.type) {
      userChallenges = userChallenges.filter(
        (c) => c.type === options.type
      );
    }

    userChallenges.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = userChallenges.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;

    return {
      challenges: userChallenges.slice(offset, offset + limit),
      total,
    };
  }

  async getDiscoverableChallenges(
    options?: {
      type?: ChallengeType;
      privacy?: ChallengePrivacy;
      status?: ChallengeStatus;
      limit?: number;
      offset?: number;
      sortBy?: "newest" | "popular" | "ending_soon";
    }
  ): Promise<{ challenges: Challenge[]; total: number }> {
    let challenges = Array.from(this.challenges.values()).filter(
      (c) =>
        c.privacy === ChallengePrivacy.PUBLIC &&
        c.status !== ChallengeStatus.CANCELLED
    );

    if (options?.type) {
      challenges = challenges.filter((c) => c.type === options.type);
    }
    if (options?.status) {
      challenges = challenges.filter((c) => c.status === options.status);
    }

    switch (options?.sortBy) {
      case "popular":
        challenges.sort((a, b) => {
          const aCount = this.participants.get(a.id)?.length ?? 0;
          const bCount = this.participants.get(b.id)?.length ?? 0;
          return bCount - aCount;
        });
        break;
      case "ending_soon":
        challenges.sort(
          (a, b) =>
            new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
        );
        break;
      default:
        challenges.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    const total = challenges.length;
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;

    return {
      challenges: challenges.slice(offset, offset + limit),
      total,
    };
  }

  async getChallengeActivities(
    challengeId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ChallengeActivity[]> {
    const activities = this.activities.get(challengeId) ?? [];

    const sorted = [...activities].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;

    return sorted.slice(offset, offset + limit);
  }

  async getChallengeStats(userId: string): Promise<ChallengeStats> {
    const userChallenges: Challenge[] = [];
    let wonChallenges = 0;
    let totalParticipantsFaced = 0;
    const ranks: number[] = [];

    for (const [challengeId, challengeParticipants] of this.participants) {
      const participant = challengeParticipants.find(
        (p) => p.userId === userId
      );
      if (!participant) continue;

      const challenge = this.challenges.get(challengeId);
      if (!challenge) continue;

      userChallenges.push(challenge);

      if (participant.rank === 1) wonChallenges++;
      ranks.push(participant.rank);
      totalParticipantsFaced += challengeParticipants.length;
    }

    const activeChallenges = userChallenges.filter(
      (c) => c.status === ChallengeStatus.ACTIVE
    ).length;
    const completedChallenges = userChallenges.filter(
      (c) => c.status === ChallengeStatus.COMPLETED
    ).length;

    const challengesByType = Object.values(ChallengeType).reduce((acc, type) => {
      acc[type] = userChallenges.filter((c) => c.type === type).length;
      return acc;
    }, {} as Record<ChallengeType, number>);

    return {
      totalChallenges: userChallenges.length,
      activeChallenges,
      completedChallenges,
      wonChallenges,
      totalRewards: 0,
      averageRank:
        ranks.length > 0
          ? Math.round(
              (ranks.reduce((a, b) => a + b, 0) / ranks.length) * 100
            ) / 100
          : 0,
      bestRank: ranks.length > 0 ? Math.min(...ranks) : 0,
      totalParticipantsFaced,
      challengesByType,
    };
  }

  async completeChallenge(challengeId: string): Promise<Challenge> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) throw new Error(`Challenge ${challengeId} not found`);

    challenge.status = ChallengeStatus.COMPLETED;

    const challengeParticipants = this.participants.get(challengeId) ?? [];
    for (const participant of challengeParticipants) {
      if (participant.status === ParticipantStatus.IN_PROGRESS) {
        participant.status = ParticipantStatus.COMPLETED;
      }
    }

    challenge.updatedAt = new Date().toISOString();

    this.recordActivity(challengeId, challenge.creatorId, "completed", {
      message: `Challenge "${challenge.title}" has ended`,
    });

    return challenge;
  }

  async cancelChallenge(
    challengeId: string,
    userId: string
  ): Promise<Challenge> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) throw new Error(`Challenge ${challengeId} not found`);
    if (challenge.creatorId !== userId) {
      throw new Error("Only the creator can cancel a challenge");
    }

    challenge.status = ChallengeStatus.CANCELLED;
    challenge.updatedAt = new Date().toISOString();

    this.recordActivity(challengeId, userId, "completed", {
      message: `Challenge "${challenge.title}" was cancelled`,
    });

    return challenge;
  }

  async getDailyProgress(
    challengeId: string,
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<DailyProgress[]> {
    const challengeParticipants = this.participants.get(challengeId) ?? [];
    const participant = challengeParticipants.find(
      (p) => p.userId === userId
    );
    if (!participant) return [];

    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const days = eachDayOfInterval({ start, end });

    return days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const existing = participant.dailyProgress.find(
        (d) => d.date === dateStr
      );
      return (
        existing ?? {
          date: dateStr,
          value: 0,
          metadata: {},
        }
      );
    });
  }

  async getChallengeCalendarData(
    challengeId: string
  ): Promise<
    Array<{
      date: string;
      participants: number;
      totalValue: number;
      topPerformer: string | null;
    }>
  > {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return [];

    const challengeParticipants = this.participants.get(challengeId) ?? [];
    const start = parseISO(challenge.startDate);
    const end = parseISO(challenge.endDate);
    const days = eachDayOfInterval({ start, end });

    return days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");

      let participantsActive = 0;
      let totalValue = 0;
      let topPerformer: string | null = null;
      let topValue = 0;

      for (const p of challengeParticipants) {
        const dayProgress = p.dailyProgress.find((d) => d.date === dateStr);
        if (dayProgress && dayProgress.value > 0) {
          participantsActive++;
          totalValue += dayProgress.value;

          if (dayProgress.value > topValue) {
            topValue = dayProgress.value;
            topPerformer = p.userId;
          }
        }
      }

      return {
        date: dateStr,
        participants: participantsActive,
        totalValue,
        topPerformer,
      };
    });
  }

  private updateRankings(challengeId: string): void {
    const challengeParticipants = this.participants.get(challengeId) ?? [];
    const active = challengeParticipants
      .filter(
        (p) =>
          p.status !== ParticipantStatus.WITHDRAWN &&
          p.status !== ParticipantStatus.DISQUALIFIED
      )
      .sort((a, b) => b.currentValue - a.currentValue);

    active.forEach((p, index) => {
      p.rank = index + 1;
    });
  }

  private updateTeamStats(team: ChallengeTeam): void {
    team.totalValue = team.members.reduce(
      (sum, m) => sum + m.currentValue,
      0
    );
    team.averageValue =
      team.members.length > 0 ? team.totalValue / team.members.length : 0;
  }

  private calculateParticipantStreak(participant: ChallengeParticipant): number {
    if (participant.dailyProgress.length === 0) return 0;

    const sortedDates = participant.dailyProgress
      .filter((d) => d.value > 0)
      .map((d) => d.date)
      .sort()
      .reverse();

    if (sortedDates.length === 0) return 0;

    let streak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = parseISO(sortedDates[i - 1]);
      const curr = parseISO(sortedDates[i]);
      const diff = differenceInDays(prev, curr);

      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }

    const today = format(startOfDay(new Date()), "yyyy-MM-dd");
    if (sortedDates[0] !== today) {
      const lastActive = parseISO(sortedDates[0]);
      const daysSinceActive = differenceInDays(
        startOfDay(new Date()),
        lastActive
      );
      if (daysSinceActive > 1) streak = 0;
    }

    return streak;
  }

  private recordActivity(
    challengeId: string,
    userId: string,
    type: ChallengeActivity["type"],
    metadata: Record<string, unknown> = {}
  ): void {
    const activity: ChallengeActivity = {
      id: crypto.randomUUID(),
      challengeId,
      userId,
      type,
      message: (metadata.message as string) ?? "",
      metadata,
      createdAt: new Date().toISOString(),
    };

    const activities = this.activities.get(challengeId) ?? [];
    activities.push(activity);
    this.activities.set(challengeId, activities);
  }

  async autoCompleteExpiredChallenges(): Promise<string[]> {
    const completedIds: string[] = [];
    const now = new Date();

    for (const [id, challenge] of this.challenges) {
      if (
        challenge.status === ChallengeStatus.ACTIVE &&
        isAfter(now, parseISO(challenge.endDate))
      ) {
        await this.completeChallenge(id);
        completedIds.push(id);
      }
    }

    return completedIds;
  }
}

export const challengeService = new ChallengeService();
