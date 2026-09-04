import {
  ProgressService,
  ProgressMetric,
} from "@/lib/workouts/progress-service";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    progressEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    bodyMeasurement: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    workoutLog: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
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

describe("ProgressService", () => {
  let service: ProgressService;

  const mockProgressEntry = {
    id: "prog-1",
    userId: "user-1",
    metric: ProgressMetric.WEIGHT,
    value: 75.5,
    unit: "kg",
    recordedAt: new Date("2024-01-15"),
    notes: "Morning weigh-in",
    source: "manual",
  };

  const mockBodyMeasurement = {
    id: "bm-1",
    userId: "user-1",
    chest: 100,
    waist: 80,
    hips: 95,
    biceps: 35,
    thighs: 60,
    bodyFat: 18.5,
    measuredAt: new Date("2024-01-15"),
  };

  beforeEach(() => {
    service = new ProgressService();
    jest.clearAllMocks();
  });

  describe("logProgress", () => {
    it("should log a progress entry", async () => {
      mockPrisma.progressEntry.create.mockResolvedValue(mockProgressEntry);

      const result = await service.logProgress({
        userId: "user-1",
        metric: ProgressMetric.WEIGHT,
        value: 75.5,
        unit: "kg",
        notes: "Morning weigh-in",
      });

      expect(result).toEqual(mockProgressEntry);
      expect(mockPrisma.progressEntry.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          metric: ProgressMetric.WEIGHT,
          value: 75.5,
          unit: "kg",
          notes: "Morning weigh-in",
          source: "manual",
          recordedAt: expect.any(Date),
        },
      });
    });

    it("should auto-set recordedAt if not provided", async () => {
      mockPrisma.progressEntry.create.mockResolvedValue(mockProgressEntry);

      await service.logProgress({
        userId: "user-1",
        metric: ProgressMetric.WEIGHT,
        value: 75.5,
        unit: "kg",
      });

      expect(mockPrisma.progressEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recordedAt: expect.any(Date),
          }),
        })
      );
    });

    it("should accept custom recordedAt", async () => {
      const customDate = new Date("2024-01-10");
      mockPrisma.progressEntry.create.mockResolvedValue(mockProgressEntry);

      await service.logProgress({
        userId: "user-1",
        metric: ProgressMetric.WEIGHT,
        value: 75.5,
        unit: "kg",
        recordedAt: customDate,
      });

      expect(mockPrisma.progressEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recordedAt: customDate,
          }),
        })
      );
    });

    it("should validate metric values", async () => {
      await expect(
        service.logProgress({
          userId: "user-1",
          metric: ProgressMetric.WEIGHT,
          value: -5,
          unit: "kg",
        })
      ).rejects.toThrow("Weight cannot be negative");

      await expect(
        service.logProgress({
          userId: "user-1",
          metric: ProgressMetric.BODY_FAT,
          value: 105,
          unit: "%",
        })
      ).rejects.toThrow("Body fat percentage must be between 0 and 100");
    });

    it("should validate unit for metric", async () => {
      await expect(
        service.logProgress({
          userId: "user-1",
          metric: ProgressMetric.WEIGHT,
          value: 75,
          unit: "lbs",
        })
      ).rejects.toThrow("Invalid unit for weight metric");
    });

    it("should clear cache after logging", async () => {
      mockPrisma.progressEntry.create.mockResolvedValue(mockProgressEntry);

      await service.logProgress({
        userId: "user-1",
        metric: ProgressMetric.WEIGHT,
        value: 75.5,
        unit: "kg",
      });

      const { redis } = require("@/lib/redis");
      expect(redis.del).toHaveBeenCalledWith("progress:user-1:*");
    });
  });

  describe("getProgressHistory", () => {
    it("should return progress history for metric", async () => {
      const entries = [
        mockProgressEntry,
        { ...mockProgressEntry, id: "prog-2", value: 75.0 },
        { ...mockProgressEntry, id: "prog-3", value: 74.5 },
      ];
      mockPrisma.progressEntry.findMany.mockResolvedValue(entries);

      const result = await service.getProgressHistory(
        "user-1",
        ProgressMetric.WEIGHT,
        { days: 30 }
      );

      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].value).toBe(75.5);
    });

    it("should filter by date range", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([]);

      await service.getProgressHistory("user-1", ProgressMetric.WEIGHT, {
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
      });

      expect(mockPrisma.progressEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recordedAt: {
              gte: new Date("2024-01-01"),
              lte: new Date("2024-01-31"),
            },
          }),
        })
      );
    });

    it("should return trend analysis", async () => {
      const entries = [
        { ...mockProgressEntry, value: 76, recordedAt: new Date("2024-01-01") },
        { ...mockProgressEntry, value: 75.5, recordedAt: new Date("2024-01-08") },
        { ...mockProgressEntry, value: 75, recordedAt: new Date("2024-01-15") },
      ];
      mockPrisma.progressEntry.findMany.mockResolvedValue(entries);

      const result = await service.getProgressHistory(
        "user-1",
        ProgressMetric.WEIGHT,
        { days: 30, includeTrend: true }
      );

      expect(result.trend).toBeDefined();
      expect(result.trend).toHaveProperty("direction");
      expect(result.trend).toHaveProperty("changeRate");
    });

    it("should handle empty history", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([]);

      const result = await service.getProgressHistory(
        "user-1",
        ProgressMetric.WEIGHT,
        { days: 30 }
      );

      expect(result.entries).toHaveLength(0);
      expect(result.trend).toBeNull();
    });

    it("should cache results", async () => {
      const { redis } = require("@/lib/redis");
      redis.get.mockResolvedValue(null);
      mockPrisma.progressEntry.findMany.mockResolvedValue([]);

      await service.getProgressHistory(
        "user-1",
        ProgressMetric.WEIGHT,
        { days: 30 }
      );

      expect(redis.set).toHaveBeenCalled();
    });
  });

  describe("logBodyMeasurement", () => {
    it("should log body measurements", async () => {
      mockPrisma.bodyMeasurement.create.mockResolvedValue(
        mockBodyMeasurement
      );

      const result = await service.logBodyMeasurement({
        userId: "user-1",
        chest: 100,
        waist: 80,
        hips: 95,
        biceps: 35,
        thighs: 60,
        bodyFat: 18.5,
      });

      expect(result).toEqual(mockBodyMeasurement);
      expect(mockPrisma.bodyMeasurement.create).toHaveBeenCalled();
    });

    it("should validate measurement ranges", async () => {
      await expect(
        service.logBodyMeasurement({
          userId: "user-1",
          chest: -10,
          waist: 80,
          hips: 95,
          biceps: 35,
          thighs: 60,
        })
      ).rejects.toThrow("Chest measurement must be positive");
    });

    it("should validate body fat percentage", async () => {
      await expect(
        service.logBodyMeasurement({
          userId: "user-1",
          chest: 100,
          waist: 80,
          hips: 95,
          biceps: 35,
          thighs: 60,
          bodyFat: 50,
        })
      ).rejects.toThrow("Body fat percentage must be realistic");
    });

    it("should accept partial measurements", async () => {
      mockPrisma.bodyMeasurement.create.mockResolvedValue({
        ...mockBodyMeasurement,
        biceps: null,
        thighs: null,
      });

      const result = await service.logBodyMeasurement({
        userId: "user-1",
        chest: 100,
        waist: 80,
        hips: 95,
      });

      expect(result.biceps).toBeNull();
    });
  });

  describe("getBodyMeasurements", () => {
    it("should return body measurement history", async () => {
      mockPrisma.bodyMeasurement.findMany.mockResolvedValue([
        mockBodyMeasurement,
      ]);

      const result = await service.getBodyMeasurements("user-1", {
        limit: 10,
      });

      expect(result).toHaveLength(1);
    });

    it("should sort by date descending", async () => {
      mockPrisma.bodyMeasurement.findMany.mockResolvedValue([]);

      await service.getBodyMeasurements("user-1", {
        limit: 10,
      });

      expect(mockPrisma.bodyMeasurement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { measuredAt: "desc" },
        })
      );
    });
  });

  describe("calculateProgressPercentage", () => {
    it("should calculate percentage towards goal", () => {
      const result = service.calculateProgressPercentage({
        currentValue: 75,
        startValue: 85,
        targetValue: 70,
      });

      expect(result).toBe(66.67);
    });

    it("should handle reverse progress (gaining)", () => {
      const result = service.calculateProgressPercentage({
        currentValue: 75,
        startValue: 70,
        targetValue: 85,
      });

      expect(result).toBe(33.33);
    });

    it("should cap at 100% when goal exceeded", () => {
      const result = service.calculateProgressPercentage({
        currentValue: 65,
        startValue: 85,
        targetValue: 70,
      });

      expect(result).toBe(100);
    });

    it("should return 0 at start", () => {
      const result = service.calculateProgressPercentage({
        currentValue: 85,
        startValue: 85,
        targetValue: 70,
      });

      expect(result).toBe(0);
    });
  });

  describe("getProgressSummary", () => {
    it("should return comprehensive progress summary", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([
        mockProgressEntry,
      ]);

      mockPrisma.bodyMeasurement.findMany.mockResolvedValue([
        mockBodyMeasurement,
      ]);

      const summary = await service.getProgressSummary("user-1");

      expect(summary).toHaveProperty("weight");
      expect(summary).toHaveProperty("bodyFat");
      expect(summary).toHaveProperty("measurements");
      expect(summary).toHaveProperty("streak");
      expect(summary).toHaveProperty("lastUpdate");
    });

    it("should include streak information", async () => {
      const recentEntries = Array.from({ length: 5 }, (_, i) => ({
        ...mockProgressEntry,
        recordedAt: new Date(Date.now() - i * 86400000),
      }));
      mockPrisma.progressEntry.findMany.mockResolvedValue(recentEntries);
      mockPrisma.bodyMeasurement.findMany.mockResolvedValue([]);

      const summary = await service.getProgressSummary("user-1");

      expect(summary.streak).toBeGreaterThanOrEqual(0);
    });

    it("should handle no data gracefully", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([]);
      mockPrisma.bodyMeasurement.findMany.mockResolvedValue([]);

      const summary = await service.getProgressSummary("user-1");

      expect(summary.weight.current).toBeNull();
      expect(summary.streak).toBe(0);
    });
  });

  describe("generateProgressReport", () => {
    it("should generate a progress report", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([
        mockProgressEntry,
      ]);
      mockPrisma.bodyMeasurement.findMany.mockResolvedValue([]);

      const report = await service.generateProgressReport(
        "user-1",
        new Date("2024-01-01"),
        new Date("2024-01-31")
      );

      expect(report).toHaveProperty("period");
      expect(report).toHaveProperty("metrics");
      expect(report).toHaveProperty("highlights");
      expect(report).toHaveProperty("recommendations");
    });

    it("should include metric comparisons", async () => {
      const entries = [
        { ...mockProgressEntry, value: 76, recordedAt: new Date("2024-01-01") },
        { ...mockProgressEntry, value: 75, recordedAt: new Date("2024-01-31") },
      ];
      mockPrisma.progressEntry.findMany.mockResolvedValue(entries);
      mockPrisma.bodyMeasurement.findMany.mockResolvedValue([]);

      const report = await service.generateProgressReport(
        "user-1",
        new Date("2024-01-01"),
        new Date("2024-01-31")
      );

      expect(report.metrics).toHaveProperty("weight");
      expect(report.metrics.weight).toHaveProperty("start");
      expect(report.metrics.weight).toHaveProperty("end");
      expect(report.metrics.weight).toHaveProperty("change");
    });
  });

  describe("deleteProgressEntry", () => {
    it("should delete a progress entry", async () => {
      mockPrisma.progressEntry.delete.mockResolvedValue(mockProgressEntry);

      await service.deleteProgressEntry("prog-1", "user-1");

      expect(mockPrisma.progressEntry.delete).toHaveBeenCalledWith({
        where: {
          id: "prog-1",
          userId: "user-1",
        },
      });
    });

    it("should throw for non-existent entry", async () => {
      mockPrisma.progressEntry.delete.mockRejectedValue(
        new Error("Record not found")
      );

      await expect(
        service.deleteProgressEntry("non-existent", "user-1")
      ).rejects.toThrow("Record not found");
    });
  });

  describe("getProgressCharts", () => {
    it("should return chart-ready data", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([
        mockProgressEntry,
      ]);

      const charts = await service.getProgressCharts("user-1", {
        metrics: [ProgressMetric.WEIGHT],
        days: 30,
      });

      expect(charts).toHaveProperty("labels");
      expect(charts).toHaveProperty("datasets");
      expect(charts.labels).toBeInstanceOf(Array);
      expect(charts.datasets).toBeInstanceOf(Array);
    });

    it("should format dates correctly for charts", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([]);

      const charts = await service.getProgressCharts("user-1", {
        metrics: [ProgressMetric.WEIGHT],
        days: 7,
      });

      expect(charts.labels).toHaveLength(0);
    });
  });
});
