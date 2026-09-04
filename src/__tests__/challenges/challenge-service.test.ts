import {
  ChallengeService,
  ChallengeType,
  ChallengeStatus,
} from "@/lib/challenges/challenge-service";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    challenge: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    challengeParticipant: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    challengeInvite: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    workoutLog: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
    del: jest.fn(),
    zadd: jest.fn(),
    zrange: jest.fn(),
    zincrby: jest.fn(),
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = jest.mocked(prisma);

describe("ChallengeService", () => {
  let service: ChallengeService;

  const mockChallenge = {
    id: "challenge-1",
    creatorId: "user-1",
    title: "30-Day Push-up Challenge",
    description: "Complete 1000 push-ups in 30 days",
    type: ChallengeType.REPETITION,
    targetValue: 1000,
    unit: "reps",
    startDate: new Date("2024-02-01"),
    endDate: new Date("2024-03-01"),
    status: ChallengeStatus.ACTIVE,
    maxParticipants: 50,
    isPublic: true,
    entryFee: 0,
    prizePool: 0,
    createdAt: new Date("2024-01-25"),
    participants: [
      {
        id: "cp-1",
        userId: "user-1",
        currentValue: 350,
        rank: 1,
        joinedAt: new Date("2024-01-26"),
      },
    ],
  };

  beforeEach(() => {
    service = new ChallengeService();
    jest.clearAllMocks();
  });

  describe("createChallenge", () => {
    it("should create a new challenge", async () => {
      mockPrisma.challenge.create.mockResolvedValue(mockChallenge);

      const result = await service.createChallenge({
        creatorId: "user-1",
        title: "30-Day Push-up Challenge",
        description: "Complete 1000 push-ups in 30 days",
        type: ChallengeType.REPETITION,
        targetValue: 1000,
        unit: "reps",
        startDate: new Date("2024-02-01"),
        endDate: new Date("2024-03-01"),
      });

      expect(result).toEqual(mockChallenge);
      expect(mockPrisma.challenge.create).toHaveBeenCalled();
    });

    it("should validate date range", async () => {
      await expect(
        service.createChallenge({
          creatorId: "user-1",
          title: "Bad Dates",
          type: ChallengeType.REPETITION,
          targetValue: 100,
          startDate: new Date("2024-03-01"),
          endDate: new Date("2024-02-01"),
        })
      ).rejects.toThrow("End date must be after start date");
    });

    it("should validate challenge duration", async () => {
      await expect(
        service.createChallenge({
          creatorId: "user-1",
          title: "Too Long",
          type: ChallengeType.REPETITION,
          targetValue: 100,
          startDate: new Date("2024-01-01"),
          endDate: new Date("2024-12-31"),
        })
      ).rejects.toThrow("Challenge cannot exceed 90 days");
    });

    it("should validate target value", async () => {
      await expect(
        service.createChallenge({
          creatorId: "user-1",
          title: "Zero Target",
          type: ChallengeType.REPETITION,
          targetValue: 0,
          startDate: new Date("2024-02-01"),
          endDate: new Date("2024-03-01"),
        })
      ).rejects.toThrow("Target value must be positive");
    });

    it("should auto-add creator as participant", async () => {
      mockPrisma.challenge.create.mockResolvedValue(mockChallenge);
      mockPrisma.challengeParticipant.create.mockResolvedValue({
        id: "cp-1",
        userId: "user-1",
      });

      await service.createChallenge({
        creatorId: "user-1",
        title: "My Challenge",
        type: ChallengeType.REPETITION,
        targetValue: 100,
        startDate: new Date("2024-02-01"),
        endDate: new Date("2024-03-01"),
      });

      expect(mockPrisma.challengeParticipant.create).toHaveBeenCalled();
    });
  });

  describe("getChallengeById", () => {
    it("should return challenge with participants", async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue(mockChallenge);

      const result = await service.getChallengeById("challenge-1");

      expect(result).toEqual(mockChallenge);
      expect(mockPrisma.challenge.findUnique).toHaveBeenCalledWith({
        where: { id: "challenge-1" },
        include: {
          participants: {
            include: { user: { select: { id: true, name: true, image: true } } },
            orderBy: { currentValue: "desc" },
          },
          creator: { select: { id: true, name: true, image: true } },
        },
      });
    });
  });

  describe("joinChallenge", () => {
    it("should add user to challenge", async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue(mockChallenge);
      mockPrisma.challengeParticipant.findUnique.mockResolvedValue(null);
      mockPrisma.challengeParticipant.count.mockResolvedValue(5);
      mockPrisma.challengeParticipant.create.mockResolvedValue({
        id: "cp-new",
        userId: "user-2",
        currentValue: 0,
      });

      const result = await service.joinChallenge("challenge-1", "user-2");

      expect(result).toBeDefined();
      expect(mockPrisma.challengeParticipant.create).toHaveBeenCalled();
    });

    it("should not allow joining if already participant", async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue(mockChallenge);
      mockPrisma.challengeParticipant.findUnique.mockResolvedValue({
        id: "cp-1",
        userId: "user-1",
      });

      await expect(
        service.joinChallenge("challenge-1", "user-1")
      ).rejects.toThrow("Already participating in this challenge");
    });

    it("should not allow joining if challenge is full", async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue({
        ...mockChallenge,
        maxParticipants: 2,
      });

      mockPrisma.challengeParticipant.findUnique.mockResolvedValue(null);
      mockPrisma.challengeParticipant.count.mockResolvedValue(2);

      await expect(
        service.joinChallenge("challenge-1", "user-2")
      ).rejects.toThrow("Challenge is full");
    });

    it("should not allow joining ended challenge", async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue({
        ...mockChallenge,
        status: ChallengeStatus.COMPLETED,
      });

      await expect(
        service.joinChallenge("challenge-1", "user-2")
      ).rejects.toThrow("Challenge has ended");
    });

    it("should validate entry fee if required", async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue({
        ...mockChallenge,
        entryFee: 10,
      });
      mockPrisma.challengeParticipant.findUnique.mockResolvedValue(null);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-2",
        credits: 5,
      });

      await expect(
        service.joinChallenge("challenge-1", "user-2")
      ).rejects.toThrow("Insufficient credits");
    });
  });

  describe("leaveChallenge", () => {
    it("should remove user from challenge", async () => {
      mockPrisma.challengeParticipant.findUnique.mockResolvedValue({
        id: "cp-1",
        userId: "user-2",
        currentValue: 50,
      });

      mockPrisma.challengeParticipant.delete.mockResolvedValue({
        id: "cp-1",
      });

      await service.leaveChallenge("challenge-1", "user-2");

      expect(mockPrisma.challengeParticipant.delete).toHaveBeenCalledWith({
        where: {
          challengeId_userId: {
            challengeId: "challenge-1",
            userId: "user-2",
          },
        },
      });
    });

    it("should not allow creator to leave", async () => {
      mockPrisma.challengeParticipant.findUnique.mockResolvedValue({
        id: "cp-1",
        userId: "user-1",
      });

      mockPrisma.challenge.findUnique.mockResolvedValue({
        ...mockChallenge,
        creatorId: "user-1",
      });

      await expect(
        service.leaveChallenge("challenge-1", "user-1")
      ).rejects.toThrow("Challenge creator cannot leave");
    });
  });

  describe("updateProgress", () => {
    it("should update participant progress", async () => {
      mockPrisma.challengeParticipant.findUnique.mockResolvedValue({
        id: "cp-1",
        userId: "user-1",
        challengeId: "challenge-1",
        currentValue: 200,
      });

      mockPrisma.challengeParticipant.update.mockResolvedValue({
        id: "cp-1",
        currentValue: 250,
      });

      const { redis } = require("@/lib/redis");

      const result = await service.updateProgress(
        "challenge-1",
        "user-1",
        50
      );

      expect(result.currentValue).toBe(250);
      expect(redis.zincrby).toHaveBeenCalled();
    });

    it("should calculate percentage complete", async () => {
      mockPrisma.challengeParticipant.findUnique.mockResolvedValue({
        id: "cp-1",
        currentValue: 0,
      });

      mockPrisma.challengeParticipant.update.mockResolvedValue({
        id: "cp-1",
        currentValue: 500,
      });

      mockPrisma.challenge.findUnique.mockResolvedValue({
        ...mockChallenge,
        targetValue: 1000,
      });

      const result = await service.updateProgress(
        "challenge-1",
        "user-1",
        500
      );

      expect(result.percentage).toBe(50);
    });

    it("should not allow progress beyond target", async () => {
      mockPrisma.challengeParticipant.findUnique.mockResolvedValue({
        id: "cp-1",
        currentValue: 950,
      });

      mockPrisma.challenge.findUnique.mockResolvedValue({
        ...mockChallenge,
        targetValue: 1000,
      });

      const result = await service.updateProgress(
        "challenge-1",
        "user-1",
        100
      );

      expect(result.currentValue).toBe(1000);
    });

    it("should not allow updating after challenge ends", async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue({
        ...mockChallenge,
        status: ChallengeStatus.COMPLETED,
      });

      await expect(
        service.updateProgress("challenge-1", "user-1", 50)
      ).rejects.toThrow("Challenge has ended");
    });
  });

  describe("getLeaderboard", () => {
    it("should return challenge leaderboard", async () => {
      const { redis } = require("@/lib/redis");
      redis.zrange.mockResolvedValue([
        "user-1",
        "950",
        "user-2",
        "800",
        "user-3",
        "650",
      ]);

      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: "user-1", name: "Alice" })
        .mockResolvedValueOnce({ id: "user-2", name: "Bob" })
        .mockResolvedValueOnce({ id: "user-3", name: "Charlie" });

      const leaderboard = await service.getLeaderboard("challenge-1");

      expect(leaderboard).toHaveLength(3);
      expect(leaderboard[0]).toHaveProperty("rank");
      expect(leaderboard[0]).toHaveProperty("userId");
      expect(leaderboard[0]).toHaveProperty("value");
    });

    it("should handle empty leaderboard", async () => {
      const { redis } = require("@/lib/redis");
      redis.zrange.mockResolvedValue([]);

      const leaderboard = await service.getLeaderboard("challenge-1");

      expect(leaderboard).toHaveLength(0);
    });

    it("should limit leaderboard results", async () => {
      const { redis } = require("@/lib/redis");
      redis.zrange.mockResolvedValue([]);

      await service.getLeaderboard("challenge-1", { limit: 10 });

      expect(redis.zrange).toHaveBeenCalledWith(
        "challenge:challenge-1:leaderboard",
        0,
        9,
        "WITHSCORES"
      );
    });
  });

  describe("getChallenges", () => {
    it("should return public challenges", async () => {
      mockPrisma.challenge.findMany.mockResolvedValue([mockChallenge]);

      const result = await service.getChallenges({
        publicOnly: true,
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].isPublic).toBe(true);
    });

    it("should filter by status", async () => {
      mockPrisma.challenge.findMany.mockResolvedValue([]);
      mockPrisma.challenge.count.mockResolvedValue(0);

      await service.getChallenges({ status: ChallengeStatus.ACTIVE });

      expect(mockPrisma.challenge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ChallengeStatus.ACTIVE,
          }),
        })
      );
    });

    it("should filter by type", async () => {
      mockPrisma.challenge.findMany.mockResolvedValue([]);
      mockPrisma.challenge.count.mockResolvedValue(0);

      await service.getChallenges({ type: ChallengeType.REPETITION });

      expect(mockPrisma.challenge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: ChallengeType.REPETITION,
          }),
        })
      );
    });

    it("should paginate results", async () => {
      mockPrisma.challenge.findMany.mockResolvedValue([]);
      mockPrisma.challenge.count.mockResolvedValue(25);

      const result = await service.getChallenges({
        page: 2,
        limit: 10,
      });

      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(3);
    });
  });

  describe("getMyChallenges", () => {
    it("should return user's challenges", async () => {
      mockPrisma.challengeParticipant.findMany.mockResolvedValue([
        { challengeId: "challenge-1", currentValue: 350, rank: 1 },
      ]);

      mockPrisma.challenge.findMany.mockResolvedValue([mockChallenge]);

      const result = await service.getMyChallenges("user-1");

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("myProgress");
    });

    it("should include challenges user created", async () => {
      mockPrisma.challengeParticipant.findMany.mockResolvedValue([]);
      mockPrisma.challenge.findMany.mockResolvedValue([mockChallenge]);

      const result = await service.getMyChallenges("user-1");

      expect(result).toHaveLength(1);
    });
  });

  describe("sendInvite", () => {
    it("should send challenge invitation", async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue(mockChallenge);
      mockPrisma.challengeParticipant.findUnique.mockResolvedValue(null);
      mockPrisma.challengeInvite.create.mockResolvedValue({
        id: "inv-1",
        challengeId: "challenge-1",
        inviterId: "user-1",
        inviteeId: "user-2",
        status: "PENDING",
      });

      const result = await service.sendInvite(
        "challenge-1",
        "user-1",
        "user-2"
      );

      expect(result).toBeDefined();
      expect(mockPrisma.challengeInvite.create).toHaveBeenCalled();
    });

    it("should not invite already participating users", async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue(mockChallenge);
      mockPrisma.challengeParticipant.findUnique.mockResolvedValue({
        userId: "user-2",
      });

      await expect(
        service.sendInvite("challenge-1", "user-1", "user-2")
      ).rejects.toThrow("User already participating");
    });
  });

  describe("endChallenge", () => {
    it("should end challenge and calculate winners", async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue({
        ...mockChallenge,
        status: ChallengeStatus.ACTIVE,
      });

      const { redis } = require("@/lib/redis");
      redis.zrange.mockResolvedValue([
        "user-1",
        "950",
        "user-2",
        "800",
      ]);

      mockPrisma.challenge.update.mockResolvedValue({
        ...mockChallenge,
        status: ChallengeStatus.COMPLETED,
      });

      const result = await service.endChallenge("challenge-1");

      expect(result.status).toBe(ChallengeStatus.COMPLETED);
      expect(result).toHaveProperty("winners");
    });

    it("should not end already ended challenge", async () => {
      mockPrisma.challenge.findUnique.mockResolvedValue({
        ...mockChallenge,
        status: ChallengeStatus.COMPLETED,
      });

      await expect(service.endChallenge("challenge-1")).rejects.toThrow(
        "Challenge already ended"
      );
    });
  });

  describe("getChallengeStats", () => {
    it("should return challenge statistics", async () => {
      mockPrisma.challengeParticipant.count.mockResolvedValue(25);
      mockPrisma.challengeParticipant.findMany.mockResolvedValue([
        { currentValue: 500 },
        { currentValue: 800 },
        { currentValue: 1000 },
      ]);

      const stats = await service.getChallengeStats("challenge-1");

      expect(stats).toHaveProperty("totalParticipants");
      expect(stats).toHaveProperty("averageProgress");
      expect(stats).toHaveProperty("completionRate");
      expect(stats).toHaveProperty("topPerformers");
    });

    it("should calculate completion rate", async () => {
      mockPrisma.challengeParticipant.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(3);

      mockPrisma.challenge.findUnique.mockResolvedValue({
        ...mockChallenge,
        targetValue: 1000,
      });

      mockPrisma.challengeParticipant.findMany.mockResolvedValue([]);

      const stats = await service.getChallengeStats("challenge-1");

      expect(stats.completionRate).toBe(30);
    });
  });
});
