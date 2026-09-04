import { GoalService, GoalType, GoalStatus } from "@/lib/goals/goal-service";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    goal: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    goalMilestone: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    goalProgress: {
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    workoutLog: {
      findMany: jest.fn(),
    },
    nutritionLog: {
      findMany: jest.fn(),
    },
    progressEntry: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = jest.mocked(prisma);

describe("GoalService", () => {
  let service: GoalService;

  const mockGoal = {
    id: "goal-1",
    userId: "user-1",
    type: GoalType.WEIGHT_LOSS,
    title: "Lose 10kg",
    description: "Reach 65kg in 3 months",
    targetValue: 65,
    currentValue: 75,
    startValue: 75,
    unit: "kg",
    startDate: new Date("2024-01-01"),
    targetDate: new Date("2024-04-01"),
    status: GoalStatus.ACTIVE,
    progress: 0,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
    milestones: [
      {
        id: "ms-1",
        title: "First 2kg lost",
        targetValue: 73,
        isCompleted: false,
      },
    ],
  };

  beforeEach(() => {
    service = new GoalService();
    jest.clearAllMocks();
  });

  describe("createGoal", () => {
    it("should create a new goal", async () => {
      mockPrisma.goal.create.mockResolvedValue(mockGoal);

      const result = await service.createGoal({
        userId: "user-1",
        type: GoalType.WEIGHT_LOSS,
        title: "Lose 10kg",
        description: "Reach 65kg in 3 months",
        targetValue: 65,
        startValue: 75,
        unit: "kg",
        targetDate: new Date("2024-04-01"),
      });

      expect(result).toEqual(mockGoal);
      expect(mockPrisma.goal.create).toHaveBeenCalled();
    });

    it("should validate target date is in future", async () => {
      await expect(
        service.createGoal({
          userId: "user-1",
          type: GoalType.WEIGHT_LOSS,
          title: "Past Goal",
          targetValue: 65,
          startValue: 75,
          unit: "kg",
          targetDate: new Date("2023-01-01"),
        })
      ).rejects.toThrow("Target date must be in the future");
    });

    it("should validate target value for weight loss", async () => {
      await expect(
        service.createGoal({
          userId: "user-1",
          type: GoalType.WEIGHT_LOSS,
          title: "Gain Weight Goal",
          targetValue: 85,
          startValue: 75,
          unit: "kg",
          targetDate: new Date("2024-04-01"),
        })
      ).rejects.toThrow("Target weight must be less than start weight");
    });

    it("should validate target value for weight gain", async () => {
      await expect(
        service.createGoal({
          userId: "user-1",
          type: GoalType.WEIGHT_GAIN,
          title: "Lose Weight Goal",
          targetValue: 65,
          startValue: 75,
          unit: "kg",
          targetDate: new Date("2024-04-01"),
        })
      ).rejects.toThrow("Target weight must be more than start weight");
    });

    it("should create default milestones for weight loss", async () => {
      mockPrisma.goal.create.mockResolvedValue(mockGoal);
      mockPrisma.goalMilestone.create.mockResolvedValue({
        id: "ms-1",
        title: "25% progress",
      });

      await service.createGoal({
        userId: "user-1",
        type: GoalType.WEIGHT_LOSS,
        title: "Lose 10kg",
        targetValue: 65,
        startValue: 75,
        unit: "kg",
        targetDate: new Date("2024-04-01"),
        autoMilestones: true,
      });

      expect(mockPrisma.goalMilestone.create).toHaveBeenCalledTimes(3);
    });

    it("should limit active goals to 5", async () => {
      mockPrisma.goal.count.mockResolvedValue(5);

      await expect(
        service.createGoal({
          userId: "user-1",
          type: GoalType.WEIGHT_LOSS,
          title: "New Goal",
          targetValue: 65,
          startValue: 75,
          unit: "kg",
          targetDate: new Date("2024-04-01"),
        })
      ).rejects.toThrow("Maximum 5 active goals allowed");
    });
  });

  describe("getGoalById", () => {
    it("should return goal with milestones", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(mockGoal);

      const result = await service.getGoalById("goal-1");

      expect(result).toEqual(mockGoal);
      expect(mockPrisma.goal.findUnique).toHaveBeenCalledWith({
        where: { id: "goal-1" },
        include: {
          milestones: { orderBy: { targetValue: "asc" } },
          progress: { orderBy: { recordedAt: "desc" }, take: 30 },
        },
      });
    });

    it("should return null for non-existent goal", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(null);

      const result = await service.getGoalById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getUserGoals", () => {
    it("should return user's goals", async () => {
      mockPrisma.goal.findMany.mockResolvedValue([mockGoal]);

      const result = await service.getUserGoals("user-1");

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe("user-1");
    });

    it("should filter by status", async () => {
      mockPrisma.goal.findMany.mockResolvedValue([]);

      await service.getUserGoals("user-1", { status: GoalStatus.ACTIVE });

      expect(mockPrisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: GoalStatus.ACTIVE,
          }),
        })
      );
    });

    it("should filter by type", async () => {
      mockPrisma.goal.findMany.mockResolvedValue([]);

      await service.getUserGoals("user-1", { type: GoalType.WEIGHT_LOSS });

      expect(mockPrisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: GoalType.WEIGHT_LOSS,
          }),
        })
      );
    });

    it("should sort by target date", async () => {
      mockPrisma.goal.findMany.mockResolvedValue([]);

      await service.getUserGoals("user-1", {
        sortBy: "targetDate",
        sortOrder: "asc",
      });

      expect(mockPrisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { targetDate: "asc" },
        })
      );
    });
  });

  describe("updateGoalProgress", () => {
    it("should update goal progress", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(mockGoal);
      mockPrisma.goalProgress.create.mockResolvedValue({
        id: "gp-1",
        goalId: "goal-1",
        value: 74,
        recordedAt: new Date(),
      });
      mockPrisma.goal.update.mockResolvedValue({
        ...mockGoal,
        currentValue: 74,
        progress: 10,
      });

      const result = await service.updateGoalProgress("goal-1", 74);

      expect(result.currentValue).toBe(74);
      expect(result.progress).toBe(10);
    });

    it("should calculate progress percentage correctly", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({
        ...mockGoal,
        startValue: 80,
        targetValue: 60,
      });

      mockPrisma.goalProgress.create.mockResolvedValue({
        id: "gp-1",
        value: 70,
      });

      mockPrisma.goal.update.mockResolvedValue({
        ...mockGoal,
        currentValue: 70,
        progress: 50,
      });

      const result = await service.updateGoalProgress("goal-1", 70);

      expect(result.progress).toBe(50);
    });

    it("should mark goal as completed when target reached", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({
        ...mockGoal,
        startValue: 80,
        targetValue: 65,
      });

      mockPrisma.goalProgress.create.mockResolvedValue({
        id: "gp-1",
        value: 65,
      });

      mockPrisma.goal.update.mockResolvedValue({
        ...mockGoal,
        currentValue: 65,
        progress: 100,
        status: GoalStatus.COMPLETED,
      });

      const result = await service.updateGoalProgress("goal-1", 65);

      expect(result.status).toBe(GoalStatus.COMPLETED);
    });

    it("should update milestones when passed", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({
        ...mockGoal,
        milestones: [
          { id: "ms-1", targetValue: 73, isCompleted: false },
          { id: "ms-2", targetValue: 71, isCompleted: false },
        ],
      });

      mockPrisma.goalProgress.create.mockResolvedValue({
        id: "gp-1",
        value: 72,
      });

      mockPrisma.goal.update.mockResolvedValue(mockGoal);
      mockPrisma.goalMilestone.update.mockResolvedValue({
        id: "ms-1",
        isCompleted: true,
      });

      await service.updateGoalProgress("goal-1", 72);

      expect(mockPrisma.goalMilestone.update).toHaveBeenCalledWith({
        where: { id: "ms-1" },
        data: {
          isCompleted: true,
          completedAt: expect.any(Date),
        },
      });
    });
  });

  describe("completeGoal", () => {
    it("should mark goal as completed", async () => {
      mockPrisma.goal.update.mockResolvedValue({
        ...mockGoal,
        status: GoalStatus.COMPLETED,
      });

      const result = await service.completeGoal("goal-1");

      expect(result.status).toBe(GoalStatus.COMPLETED);
    });

    it("should not allow completing already completed goal", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({
        ...mockGoal,
        status: GoalStatus.COMPLETED,
      });

      await expect(service.completeGoal("goal-1")).rejects.toThrow(
        "Goal is already completed"
      );
    });
  });

  describe("archiveGoal", () => {
    it("should archive a goal", async () => {
      mockPrisma.goal.update.mockResolvedValue({
        ...mockGoal,
        status: GoalStatus.ARCHIVED,
      });

      const result = await service.archiveGoal("goal-1");

      expect(result.status).toBe(GoalStatus.ARCHIVED);
    });

    it("should only allow archiving completed goals", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({
        ...mockGoal,
        status: GoalStatus.ACTIVE,
      });

      await expect(service.archiveGoal("goal-1")).rejects.toThrow(
        "Only completed goals can be archived"
      );
    });
  });

  describe("deleteGoal", () => {
    it("should delete goal and related data", async () => {
      mockPrisma.goalProgress.findMany.mockResolvedValue([]);
      mockPrisma.goalMilestone.findMany.mockResolvedValue([]);
      mockPrisma.goal.delete.mockResolvedValue(mockGoal);

      await service.deleteGoal("goal-1");

      expect(mockPrisma.goal.delete).toHaveBeenCalledWith({
        where: { id: "goal-1" },
      });
    });

    it("should not allow deleting active goals with progress", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({
        ...mockGoal,
        status: GoalStatus.ACTIVE,
      });

      mockPrisma.goalProgress.findMany.mockResolvedValue([
        { id: "gp-1" },
      ]);

      await expect(service.deleteGoal("goal-1")).rejects.toThrow(
        "Cannot delete active goal with progress"
      );
    });
  });

  describe("getGoalStats", () => {
    it("should return goal statistics", async () => {
      mockPrisma.goal.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(1);

      mockPrisma.goal.findMany.mockResolvedValue([
        { ...mockGoal, progress: 75 },
        { ...mockGoal, id: "goal-2", progress: 100 },
        { ...mockGoal, id: "goal-3", progress: 30 },
      ]);

      const stats = await service.getGoalStats("user-1");

      expect(stats).toHaveProperty("totalGoals");
      expect(stats).toHaveProperty("activeGoals");
      expect(stats).toHaveProperty("completedGoals");
      expect(stats).toHaveProperty("averageProgress");
    });

    it("should calculate average progress correctly", async () => {
      mockPrisma.goal.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0);

      mockPrisma.goal.findMany.mockResolvedValue([
        { ...mockGoal, progress: 50 },
        { ...mockGoal, id: "goal-2", progress: 75 },
        { ...mockGoal, id: "goal-3", progress: 25 },
      ]);

      const stats = await service.getGoalStats("user-1");

      expect(stats.averageProgress).toBe(50);
    });

    it("should handle zero goals", async () => {
      mockPrisma.goal.count.mockResolvedValue(0);
      mockPrisma.goal.findMany.mockResolvedValue([]);

      const stats = await service.getGoalStats("user-1");

      expect(stats.totalGoals).toBe(0);
      expect(stats.averageProgress).toBe(0);
    });
  });

  describe("getGoalTimeline", () => {
    it("should return goal timeline data", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(mockGoal);
      mockPrisma.goalProgress.findMany.mockResolvedValue([
        { value: 74, recordedAt: new Date("2024-01-15") },
        { value: 73, recordedAt: new Date("2024-01-20") },
        { value: 72, recordedAt: new Date("2024-01-25") },
      ]);

      const timeline = await service.getGoalTimeline("goal-1");

      expect(timeline).toHaveProperty("entries");
      expect(timeline).toHaveProperty("milestones");
      expect(timeline).toHaveProperty("projected");
    });

    it("should calculate projected completion date", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(mockGoal);
      mockPrisma.goalProgress.findMany.mockResolvedValue([
        { value: 74, recordedAt: new Date("2024-01-15") },
        { value: 72, recordedAt: new Date("2024-01-22") },
      ]);

      const timeline = await service.getGoalTimeline("goal-1");

      expect(timeline.projected).toHaveProperty("date");
      expect(timeline.projected).toHaveProperty("onTrack");
    });
  });

  describe("suggestGoal", () => {
    it("should suggest a realistic weight loss goal", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([
        { value: 80, recordedAt: new Date("2024-01-01") },
        { value: 79, recordedAt: new Date("2024-01-08") },
        { value: 78, recordedAt: new Date("2024-01-15") },
      ]);

      const suggestion = await service.suggestGoal("user-1", GoalType.WEIGHT_LOSS);

      expect(suggestion).toHaveProperty("title");
      expect(suggestion).toHaveProperty("targetValue");
      expect(suggestion).toHaveProperty("targetDate");
      expect(suggestion).toHaveProperty("milestones");
    });

    it("should base suggestions on recent progress rate", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([
        { value: 80, recordedAt: new Date("2024-01-01") },
        { value: 78, recordedAt: new Date("2024-01-15") },
      ]);

      const suggestion = await service.suggestGoal("user-1", GoalType.WEIGHT_LOSS);

      expect(suggestion.targetValue).toBeLessThan(78);
    });
  });
});
