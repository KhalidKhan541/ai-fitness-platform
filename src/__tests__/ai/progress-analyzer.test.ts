import { ProgressAnalyzer } from "@/lib/ai/progress-analyzer";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    progressEntry: { findMany: jest.fn() },
    workoutLog: { findMany: jest.fn() },
    nutritionLog: { findMany: jest.fn() },
    bodyMeasurement: { findMany: jest.fn() },
    goal: { findMany: jest.fn() },
    user: { findUnique: jest.fn() },
  },
}));

jest.mock("@/lib/ai/openai", () => ({
  openai: {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  analysis: "Great progress on weight loss journey",
                  insights: ["Consistent workout schedule", "Protein intake on track"],
                  recommendations: ["Consider increasing cardio frequency"],
                  projectedGoalDate: "2024-04-15",
                }),
              },
            },
          ],
        }),
      },
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = jest.mocked(prisma);

describe("ProgressAnalyzer", () => {
  let analyzer: ProgressAnalyzer;

  beforeEach(() => {
    analyzer = new ProgressAnalyzer();
    jest.clearAllMocks();
  });

  describe("analyzeWeightProgress", () => {
    it("should analyze weight trend", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([
        { value: 80, recordedAt: new Date("2024-01-01"), metric: "WEIGHT" },
        { value: 79, recordedAt: new Date("2024-01-08"), metric: "WEIGHT" },
        { value: 78, recordedAt: new Date("2024-01-15"), metric: "WEIGHT" },
        { value: 77, recordedAt: new Date("2024-01-22"), metric: "WEIGHT" },
      ]);

      const result = await analyzer.analyzeWeightProgress("user-1", 30);

      expect(result).toHaveProperty("trend");
      expect(result).toHaveProperty("rate");
      expect(result).toHaveProperty("dataPoints");
      expect(result.trend).toBe("decreasing");
    });

    it("should detect plateaus", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([
        { value: 75, recordedAt: new Date("2024-01-01"), metric: "WEIGHT" },
        { value: 75, recordedAt: new Date("2024-01-08"), metric: "WEIGHT" },
        { value: 75, recordedAt: new Date("2024-01-15"), metric: "WEIGHT" },
        { value: 75, recordedAt: new Date("2024-01-22"), metric: "WEIGHT" },
      ]);

      const result = await analyzer.analyzeWeightProgress("user-1", 30);

      expect(result.trend).toBe("plateau");
    });

    it("should handle insufficient data", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([
        { value: 80, recordedAt: new Date("2024-01-15"), metric: "WEIGHT" },
      ]);

      const result = await analyzer.analyzeWeightProgress("user-1", 30);

      expect(result.trend).toBe("insufficient_data");
    });

    it("should calculate weekly rate of change", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([
        { value: 80, recordedAt: new Date("2024-01-01"), metric: "WEIGHT" },
        { value: 78, recordedAt: new Date("2024-01-15"), metric: "WEIGHT" },
      ]);

      const result = await analyzer.analyzeWeightProgress("user-1", 30);

      expect(result.rate).toHaveProperty("weekly");
      expect(result.rate.weekly).toBeCloseTo(-1, 0);
    });
  });

  describe("analyzeWorkoutProgress", () => {
    it("should analyze workout consistency", async () => {
      mockPrisma.workoutLog.findMany.mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({
          completedAt: new Date(Date.now() - i * 86400000 * 2),
          caloriesBurned: 300 + Math.random() * 100,
          duration: 40 + Math.random() * 20,
        }))
      );

      const result = await analyzer.analyzeWorkoutProgress("user-1", 30);

      expect(result).toHaveProperty("consistency");
      expect(result).toHaveProperty("frequency");
      expect(result).toHaveProperty("volume");
      expect(result).toHaveProperty("trend");
    });

    it("should calculate workout frequency", async () => {
      mockPrisma.workoutLog.findMany.mockResolvedValue(
        Array.from({ length: 12 }, (_, i) => ({
          completedAt: new Date(Date.now() - i * 86400000 * 2.5),
          caloriesBurned: 350,
          duration: 45,
        }))
      );

      const result = await analyzer.analyzeWorkoutProgress("user-1", 30);

      expect(result.frequency).toHaveProperty("perWeek");
      expect(result.frequency.perWeek).toBeGreaterThan(0);
    });

    it("should detect improving fitness", async () => {
      mockPrisma.workoutLog.findMany.mockResolvedValue([
        { caloriesBurned: 300, duration: 45, completedAt: new Date("2024-01-01") },
        { caloriesBurned: 350, duration: 45, completedAt: new Date("2024-01-08") },
        { caloriesBurned: 400, duration: 45, completedAt: new Date("2024-01-15") },
        { caloriesBurned: 450, duration: 45, completedAt: new Date("2024-01-22") },
      ]);

      const result = await analyzer.analyzeWorkoutProgress("user-1", 30);

      expect(result.trend).toBe("improving");
    });

    it("should handle no workout data", async () => {
      mockPrisma.workoutLog.findMany.mockResolvedValue([]);

      const result = await analyzer.analyzeWorkoutProgress("user-1", 30);

      expect(result.frequency.perWeek).toBe(0);
      expect(result.trend).toBe("no_data");
    });
  });

  describe("analyzeBodyComposition", () => {
    it("should analyze body measurements over time", async () => {
      mockPrisma.bodyMeasurement.findMany.mockResolvedValue([
        { chest: 100, waist: 85, measuredAt: new Date("2024-01-01"), bodyFat: 20 },
        { chest: 101, waist: 83, measuredAt: new Date("2024-01-15"), bodyFat: 19 },
        { chest: 102, waist: 81, measuredAt: new Date("2024-02-01"), bodyFat: 18 },
      ]);

      const result = await analyzer.analyzeBodyComposition("user-1");

      expect(result).toHaveProperty("measurements");
      expect(result).toHaveProperty("bodyFatTrend");
      expect(result).toHaveProperty("muscleGain");
    });

    it("should calculate waist-to-height ratio", async () => {
      mockPrisma.bodyMeasurement.findMany.mockResolvedValue([
        { waist: 80, measuredAt: new Date() },
      ]);

      mockPrisma.user.findUnique.mockResolvedValue({ height: 180 });

      const result = await analyzer.analyzeBodyComposition("user-1");

      expect(result).toHaveProperty("waistToHeightRatio");
      expect(result.waistToHeightRatio).toBeCloseTo(0.44, 1);
    });

    it("should assess health risk based on waist ratio", async () => {
      mockPrisma.bodyMeasurement.findMany.mockResolvedValue([
        { waist: 100, measuredAt: new Date() },
      ]);

      mockPrisma.user.findUnique.mockResolvedValue({ height: 170 });

      const result = await analyzer.analyzeBodyComposition("user-1");

      expect(result).toHaveProperty("healthRisk");
    });
  });

  describe("analyzeNutritionProgress", () => {
    it("should analyze macro adherence", async () => {
      mockPrisma.nutritionLog.findMany.mockResolvedValue(
        Array.from({ length: 30 }, (_, i) => ({
          calories: 2000 + Math.random() * 400,
          protein: 140 + Math.random() * 30,
          carbs: 200 + Math.random() * 50,
          fat: 60 + Math.random() * 20,
          loggedAt: new Date(Date.now() - i * 86400000),
        }))
      );

      const result = await analyzer.analyzeNutritionProgress("user-1", {
        targetCalories: 2200,
        targetProtein: 150,
        targetCarbs: 220,
        targetFat: 73,
      });

      expect(result).toHaveProperty("adherence");
      expect(result).toHaveProperty("averages");
      expect(result).toHaveProperty("consistency");
    });

    it("should calculate calorie adherence percentage", async () => {
      mockPrisma.nutritionLog.findMany.mockResolvedValue([
        { calories: 2200, loggedAt: new Date() },
        { calories: 2100, loggedAt: new Date() },
        { calories: 2300, loggedAt: new Date() },
      ]);

      const result = await analyzer.analyzeNutritionProgress("user-1", {
        targetCalories: 2200,
        targetProtein: 150,
        targetCarbs: 220,
        targetFat: 73,
      });

      expect(result.adherence).toHaveProperty("calories");
      expect(result.adherence.calories).toBeGreaterThan(80);
    });

    it("should identify patterns in eating habits", async () => {
      mockPrisma.nutritionLog.findMany.mockResolvedValue(
        Array.from({ length: 14 }, (_, i) => ({
          calories: i % 2 === 0 ? 2500 : 1800,
          protein: 120,
          carbs: 250,
          fat: 80,
          loggedAt: new Date(Date.now() - i * 86400000),
        }))
      );

      const result = await analyzer.analyzeNutritionProgress("user-1", {
        targetCalories: 2000,
        targetProtein: 150,
        targetCarbs: 200,
        targetFat: 67,
      });

      expect(result).toHaveProperty("patterns");
    });
  });

  describe("generateProgressReport", () => {
    it("should generate comprehensive progress report", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([
        { value: 80, recordedAt: new Date("2024-01-01"), metric: "WEIGHT" },
        { value: 78, recordedAt: new Date("2024-01-15"), metric: "WEIGHT" },
      ]);

      mockPrisma.workoutLog.findMany.mockResolvedValue([
        { completedAt: new Date(), caloriesBurned: 350, duration: 45 },
      ]);

      mockPrisma.nutritionLog.findMany.mockResolvedValue([
        { calories: 2200, protein: 150, carbs: 220, fat: 73 },
      ]);

      mockPrisma.bodyMeasurement.findMany.mockResolvedValue([]);

      const report = await analyzer.generateProgressReport("user-1", {
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
      });

      expect(report).toHaveProperty("period");
      expect(report).toHaveProperty("weight");
      expect(report).toHaveProperty("workouts");
      expect(report).toHaveProperty("nutrition");
      expect(report).toHaveProperty("body");
      expect(report).toHaveProperty("insights");
      expect(report).toHaveProperty("recommendations");
    });
  });

  describe("predictGoalCompletion", () => {
    it("should predict when user will reach goal", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([
        { value: 80, recordedAt: new Date("2024-01-01"), metric: "WEIGHT" },
        { value: 79, recordedAt: new Date("2024-01-08"), metric: "WEIGHT" },
        { value: 78, recordedAt: new Date("2024-01-15"), metric: "WEIGHT" },
      ]);

      const prediction = await analyzer.predictGoalCompletion("user-1", {
        currentValue: 78,
        targetValue: 70,
        metric: "WEIGHT",
      });

      expect(prediction).toHaveProperty("estimatedDate");
      expect(prediction).toHaveProperty("confidence");
      expect(prediction).toHaveProperty("onTrack");
    });

    it("should flag when off track", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([
        { value: 80, recordedAt: new Date("2024-01-01"), metric: "WEIGHT" },
        { value: 79.8, recordedAt: new Date("2024-01-15"), metric: "WEIGHT" },
      ]);

      const prediction = await analyzer.predictGoalCompletion("user-1", {
        currentValue: 79.8,
        targetValue: 70,
        metric: "WEIGHT",
        targetDate: new Date("2024-04-01"),
      });

      expect(prediction.onTrack).toBe(false);
    });
  });

  describe("getAIInsights", () => {
    it("should generate AI-powered insights", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([
        { value: 78, recordedAt: new Date(), metric: "WEIGHT" },
      ]);

      mockPrisma.workoutLog.findMany.mockResolvedValue([]);
      mockPrisma.nutritionLog.findMany.mockResolvedValue([]);

      const insights = await analyzer.getAIInsights("user-1");

      expect(insights).toHaveProperty("analysis");
      expect(insights).toHaveProperty("insights");
      expect(insights).toHaveProperty("recommendations");
    });

    it("should provide context-aware recommendations", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([]);
      mockPrisma.workoutLog.findMany.mockResolvedValue([]);
      mockPrisma.nutritionLog.findMany.mockResolvedValue([]);

      const insights = await analyzer.getAIInsights("user-1");

      expect(insights.recommendations).toBeInstanceOf(Array);
      expect(insights.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("detectAnomalies", () => {
    it("should detect weight anomalies", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([
        { value: 75, recordedAt: new Date("2024-01-01"), metric: "WEIGHT" },
        { value: 75, recordedAt: new Date("2024-01-08"), metric: "WEIGHT" },
        { value: 75, recordedAt: new Date("2024-01-15"), metric: "WEIGHT" },
        { value: 85, recordedAt: new Date("2024-01-22"), metric: "WEIGHT" },
      ]);

      const anomalies = await analyzer.detectAnomalies("user-1");

      expect(anomalies).toBeInstanceOf(Array);
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0]).toHaveProperty("type");
      expect(anomalies[0]).toHaveProperty("severity");
    });

    it("should detect workout gaps", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([]);
      mockPrisma.workoutLog.findMany.mockResolvedValue([
        { completedAt: new Date("2024-01-01") },
        { completedAt: new Date("2024-01-03") },
      ]);

      const anomalies = await analyzer.detectAnomalies("user-1");

      expect(anomalies).toBeInstanceOf(Array);
    });

    it("should handle normal data without anomalies", async () => {
      mockPrisma.progressEntry.findMany.mockResolvedValue([
        { value: 75, recordedAt: new Date("2024-01-01"), metric: "WEIGHT" },
        { value: 74.8, recordedAt: new Date("2024-01-08"), metric: "WEIGHT" },
        { value: 74.5, recordedAt: new Date("2024-01-15"), metric: "WEIGHT" },
      ]);

      mockPrisma.workoutLog.findMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          completedAt: new Date(Date.now() - i * 86400000 * 2),
        }))
      );

      const anomalies = await analyzer.detectAnomalies("user-1");

      expect(anomalies.length).toBe(0);
    });
  });
});
