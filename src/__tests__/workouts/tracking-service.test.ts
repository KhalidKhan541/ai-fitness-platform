import {
  TrackingService,
  TrackingMetric,
} from "@/lib/workouts/tracking-service";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    workoutLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    heartRateData: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    workoutSession: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = jest.mocked(prisma);

describe("TrackingService", () => {
  let service: TrackingService;

  const mockLog = {
    id: "log-1",
    workoutId: "workout-1",
    userId: "user-1",
    setsCompleted: 12,
    repsCompleted: 120,
    weightUsed: 55,
    duration: 42,
    caloriesBurned: 320,
    notes: "Felt strong today",
    rating: 8,
    completedAt: new Date("2024-01-15T10:00:00Z"),
  };

  const mockSession = {
    id: "session-1",
    workoutId: "workout-1",
    userId: "user-1",
    startedAt: new Date("2024-01-15T09:00:00Z"),
    endedAt: null,
    isPaused: false,
    currentExerciseIndex: 0,
    currentSet: 1,
    restTimerActive: false,
    heartRateData: [],
  };

  beforeEach(() => {
    service = new TrackingService();
    jest.clearAllMocks();
  });

  describe("startSession", () => {
    it("should create a new workout session", async () => {
      mockPrisma.workoutSession.create.mockResolvedValue(mockSession);

      const result = await service.startSession("workout-1", "user-1");

      expect(result).toEqual(mockSession);
      expect(mockPrisma.workoutSession.create).toHaveBeenCalledWith({
        data: {
          workoutId: "workout-1",
          userId: "user-1",
          startedAt: expect.any(Date),
        },
      });
    });

    it("should track active session in Redis", async () => {
      mockPrisma.workoutSession.create.mockResolvedValue(mockSession);

      await service.startSession("workout-1", "user-1");

      const { redis } = require("@/lib/redis");
      expect(redis.set).toHaveBeenCalledWith(
        "session:user-1",
        expect.any(String),
        "EX",
        7200
      );
    });

    it("should reject if user has active session", async () => {
      const { redis } = require("@/lib/redis");
      redis.get.mockResolvedValue("session-1");

      await expect(
        service.startSession("workout-1", "user-1")
      ).rejects.toThrow("User already has an active session");
    });
  });

  describe("endSession", () => {
    it("should end workout session", async () => {
      mockPrisma.workoutSession.update.mockResolvedValue({
        ...mockSession,
        endedAt: new Date(),
      });

      const result = await service.endSession("session-1", "user-1");

      expect(result.endedAt).toBeDefined();
      expect(mockPrisma.workoutSession.update).toHaveBeenCalledWith({
        where: { id: "session-1" },
        data: {
          endedAt: expect.any(Date),
        },
      });
    });

    it("should remove session from Redis", async () => {
      mockPrisma.workoutSession.update.mockResolvedValue(mockSession);

      await service.endSession("session-1", "user-1");

      const { redis } = require("@/lib/redis");
      expect(redis.del).toHaveBeenCalledWith("session:user-1");
    });

    it("should calculate session duration", async () => {
      mockPrisma.workoutSession.update.mockResolvedValue({
        ...mockSession,
        endedAt: new Date("2024-01-15T10:00:00Z"),
      });

      const result = await service.endSession("session-1", "user-1");

      expect(result).toHaveProperty("duration");
    });
  });

  describe("pauseSession", () => {
    it("should pause active session", async () => {
      mockPrisma.workoutSession.update.mockResolvedValue({
        ...mockSession,
        isPaused: true,
      });

      const result = await service.pauseSession("session-1");

      expect(result.isPaused).toBe(true);
      expect(mockPrisma.workoutSession.update).toHaveBeenCalledWith({
        where: { id: "session-1" },
        data: { isPaused: true },
      });
    });

    it("should resume paused session", async () => {
      mockPrisma.workoutSession.update.mockResolvedValue({
        ...mockSession,
        isPaused: false,
      });

      const result = await service.pauseSession("session-1", false);

      expect(result.isPaused).toBe(false);
    });
  });

  describe("logExercisePerformance", () => {
    it("should log exercise performance data", async () => {
      mockPrisma.workoutLog.create.mockResolvedValue(mockLog);

      const performance = {
        setsCompleted: 3,
        repsCompleted: [10, 10, 8],
        weightUsed: 55,
        restTime: 60,
        notes: "Last set was hard",
      };

      const result = await service.logExercisePerformance(
        "session-1",
        "ex-1",
        performance
      );

      expect(result.setsCompleted).toBe(3);
      expect(result.repsCompleted).toBe(28);
      expect(mockPrisma.workoutLog.create).toHaveBeenCalled();
    });

    it("should calculate total reps correctly", async () => {
      mockPrisma.workoutLog.create.mockResolvedValue(mockLog);

      const performance = {
        setsCompleted: 3,
        repsCompleted: [12, 10, 8],
        weightUsed: 60,
        restTime: 60,
      };

      const result = await service.logExercisePerformance(
        "session-1",
        "ex-1",
        performance
      );

      expect(result.repsCompleted).toBe(30);
    });

    it("should track personal records", async () => {
      mockPrisma.workoutLog.findMany.mockResolvedValue([
        { ...mockLog, weightUsed: 50 },
      ]);
      mockPrisma.workoutLog.create.mockResolvedValue({
        ...mockLog,
        isPersonalRecord: true,
      });

      const performance = {
        setsCompleted: 3,
        repsCompleted: [10, 10, 10],
        weightUsed: 55,
        restTime: 60,
      };

      const result = await service.logExercisePerformance(
        "session-1",
        "ex-1",
        performance
      );

      expect(result.isPersonalRecord).toBe(true);
    });
  });

  describe("logHeartRate", () => {
    it("should record heart rate data point", async () => {
      mockPrisma.heartRateData.create.mockResolvedValue({
        id: "hr-1",
        sessionId: "session-1",
        bpm: 145,
        timestamp: new Date(),
        zone: "CARDIO",
      });

      const result = await service.logHeartRate("session-1", 145);

      expect(result.bpm).toBe(145);
      expect(mockPrisma.heartRateData.create).toHaveBeenCalled();
    });

    it("should determine heart rate zone", async () => {
      mockPrisma.heartRateData.create.mockResolvedValue({
        id: "hr-1",
        bpm: 145,
        zone: "CARDIO",
      });

      const result = await service.logHeartRate("session-1", 145);

      expect(result.zone).toBeDefined();
      expect(["WARM_UP", "FAT_BURN", "CARDIO", "PEAK"]).toContain(
        result.zone
      );
    });

    it("should reject invalid heart rate values", async () => {
      await expect(
        service.logHeartRate("session-1", 30)
      ).rejects.toThrow("Invalid heart rate");

      await expect(
        service.logHeartRate("session-1", 220)
      ).rejects.toThrow("Invalid heart rate");
    });

    it("should handle heart rate data stream", async () => {
      mockPrisma.heartRateData.create.mockResolvedValue({
        id: "hr-1",
        bpm: 140,
      });

      const readings = [140, 142, 145, 143, 148];

      for (const bpm of readings) {
        await service.logHeartRate("session-1", bpm);
      }

      expect(mockPrisma.heartRateData.create).toHaveBeenCalledTimes(5);
    });
  });

  describe("calculateCaloriesBurned", () => {
    it("should calculate calories based on duration and intensity", () => {
      const result = service.calculateCaloriesBurned({
        duration: 45,
        heartRateAvg: 145,
        weight: 75,
        age: 30,
        gender: "male",
      });

      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe("number");
    });

    it("should return higher calories for higher intensity", () => {
      const lowIntensity = service.calculateCaloriesBurned({
        duration: 30,
        heartRateAvg: 110,
        weight: 75,
        age: 30,
        gender: "male",
      });

      const highIntensity = service.calculateCaloriesBurned({
        duration: 30,
        heartRateAvg: 165,
        weight: 75,
        age: 30,
        gender: "male",
      });

      expect(highIntensity).toBeGreaterThan(lowIntensity);
    });

    it("should account for body weight", () => {
      const lightPerson = service.calculateCaloriesBurned({
        duration: 30,
        heartRateAvg: 140,
        weight: 60,
        age: 30,
        gender: "male",
      });

      const heavyPerson = service.calculateCaloriesBurned({
        duration: 30,
        heartRateAvg: 140,
        weight: 90,
        age: 30,
        gender: "male",
      });

      expect(heavyPerson).toBeGreaterThan(lightPerson);
    });

    it("should use different formulas for genders", () => {
      const male = service.calculateCaloriesBurned({
        duration: 30,
        heartRateAvg: 140,
        weight: 75,
        age: 30,
        gender: "male",
      });

      const female = service.calculateCaloriesBurned({
        duration: 30,
        heartRateAvg: 140,
        weight: 75,
        age: 30,
        gender: "female",
      });

      expect(male).not.toBe(female);
    });

    it("should handle edge cases", () => {
      expect(
        service.calculateCaloriesBurned({
          duration: 0,
          heartRateAvg: 140,
          weight: 75,
          age: 30,
          gender: "male",
        })
      ).toBe(0);

      expect(
        service.calculateCaloriesBurned({
          duration: 30,
          heartRateAvg: 60,
          weight: 75,
          age: 30,
          gender: "male",
        })
      ).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getHeartRateZones", () => {
    it("should return heart rate zones based on age", () => {
      const zones = service.getHeartRateZones(30);

      expect(zones).toHaveLength(5);
      expect(zones[0]).toHaveProperty("zone");
      expect(zones[0]).toHaveProperty("minBpm");
      expect(zones[0]).toHaveProperty("maxBpm");
      expect(zones[0]).toHaveProperty("name");
    });

    it("should calculate max heart rate correctly", () => {
      const zones = service.getHeartRateZones(30);

      const maxHr = 220 - 30;
      expect(zones[zones.length - 1].maxBpm).toBe(maxHr);
    });

    it("should handle different ages", () => {
      const young = service.getHeartRateZones(20);
      const old = service.getHeartRateZones(60);

      expect(young[young.length - 1].maxBpm).toBeGreaterThan(
        old[old.length - 1].maxBpm
      );
    });
  });

  describe("getWorkoutSummary", () => {
    it("should generate workout summary", async () => {
      mockPrisma.workoutSession.findUnique.mockResolvedValue({
        ...mockSession,
        endedAt: new Date("2024-01-15T10:00:00Z"),
      });

      mockPrisma.workoutLog.findMany.mockResolvedValue([mockLog]);

      mockPrisma.heartRateData.findMany.mockResolvedValue([
        { bpm: 120, timestamp: new Date() },
        { bpm: 145, timestamp: new Date() },
        { bpm: 135, timestamp: new Date() },
      ]);

      const summary = await service.getWorkoutSummary("session-1");

      expect(summary).toHaveProperty("duration");
      expect(summary).toHaveProperty("caloriesBurned");
      expect(summary).toHaveProperty("exercisesCompleted");
      expect(summary).toHaveProperty("heartRateStats");
      expect(summary).toHaveProperty("personalRecords");
    });

    it("should include heart rate statistics", async () => {
      mockPrisma.workoutSession.findUnique.mockResolvedValue({
        ...mockSession,
        endedAt: new Date("2024-01-15T10:00:00Z"),
      });

      mockPrisma.workoutLog.findMany.mockResolvedValue([]);
      mockPrisma.heartRateData.findMany.mockResolvedValue([
        { bpm: 120 },
        { bpm: 145 },
        { bpm: 160 },
      ]);

      const summary = await service.getWorkoutSummary("session-1");

      expect(summary.heartRateStats).toHaveProperty("avg");
      expect(summary.heartRateStats).toHaveProperty("min");
      expect(summary.heartRateStats).toHaveProperty("max");
      expect(summary.heartRateStats).toHaveProperty("zones");
    });
  });

  describe("getRecentActivity", () => {
    it("should return recent workout activity", async () => {
      mockPrisma.workoutLog.findMany.mockResolvedValue([
        mockLog,
        { ...mockLog, id: "log-2", completedAt: new Date("2024-01-14") },
      ]);

      const activity = await service.getRecentActivity("user-1", 7);

      expect(activity).toHaveLength(2);
      expect(mockPrisma.workoutLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user-1",
            completedAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it("should limit results correctly", async () => {
      mockPrisma.workoutLog.findMany.mockResolvedValue([]);

      await service.getRecentActivity("user-1", 30);

      expect(mockPrisma.workoutLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });
  });
});
