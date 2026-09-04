import {
  NutritionService,
  MealType,
  FoodCategory,
} from "@/lib/nutrition/nutrition-service";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    nutritionLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    food: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    recipe: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    dailyNutrition: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
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

describe("NutritionService", () => {
  let service: NutritionService;

  const mockFood = {
    id: "food-1",
    name: "Chicken Breast",
    category: FoodCategory.PROTEIN,
    caloriesPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
    fiberPer100g: 0,
    servingSize: 100,
    servingUnit: "g",
    barcode: "123456789",
    isVerified: true,
  };

  const mockLog = {
    id: "log-1",
    userId: "user-1",
    foodId: "food-1",
    mealType: MealType.LUNCH,
    quantity: 200,
    unit: "g",
    calories: 330,
    protein: 62,
    carbs: 0,
    fat: 7.2,
    loggedAt: new Date("2024-01-15T12:00:00Z"),
    notes: "Post-workout meal",
  };

  beforeEach(() => {
    service = new NutritionService();
    jest.clearAllMocks();
  });

  describe("logFood", () => {
    it("should log a food entry", async () => {
      mockPrisma.nutritionLog.create.mockResolvedValue(mockLog);

      const result = await service.logFood({
        userId: "user-1",
        foodId: "food-1",
        mealType: MealType.LUNCH,
        quantity: 200,
        unit: "g",
      });

      expect(result).toEqual(mockLog);
      expect(mockPrisma.nutritionLog.create).toHaveBeenCalled();
    });

    it("should calculate nutritional values based on quantity", async () => {
      mockPrisma.food.findFirst.mockResolvedValue(mockFood);
      mockPrisma.nutritionLog.create.mockResolvedValue(mockLog);

      await service.logFood({
        userId: "user-1",
        foodId: "food-1",
        mealType: MealType.LUNCH,
        quantity: 200,
        unit: "g",
      });

      expect(mockPrisma.nutritionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            calories: 330,
            protein: 62,
            carbs: 0,
            fat: 7.2,
          }),
        })
      );
    });

    it("should validate quantity", async () => {
      await expect(
        service.logFood({
          userId: "user-1",
          foodId: "food-1",
          mealType: MealType.LUNCH,
          quantity: -100,
          unit: "g",
        })
      ).rejects.toThrow("Quantity must be positive");
    });

    it("should accept custom loggedAt", async () => {
      mockPrisma.nutritionLog.create.mockResolvedValue(mockLog);

      const customDate = new Date("2024-01-15T08:00:00Z");
      await service.logFood({
        userId: "user-1",
        foodId: "food-1",
        mealType: MealType.BREAKFAST,
        quantity: 100,
        unit: "g",
        loggedAt: customDate,
      });

      expect(mockPrisma.nutritionLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            loggedAt: customDate,
          }),
        })
      );
    });

    it("should update daily nutrition totals", async () => {
      mockPrisma.nutritionLog.create.mockResolvedValue(mockLog);
      mockPrisma.dailyNutrition.upsert.mockResolvedValue({
        id: "daily-1",
        userId: "user-1",
        date: new Date("2024-01-15"),
        totalCalories: 330,
        totalProtein: 62,
        totalCarbs: 0,
        totalFat: 7.2,
      });

      await service.logFood({
        userId: "user-1",
        foodId: "food-1",
        mealType: MealType.LUNCH,
        quantity: 200,
        unit: "g",
      });

      expect(mockPrisma.dailyNutrition.upsert).toHaveBeenCalled();
    });
  });

  describe("logCustomFood", () => {
    it("should log food with custom nutritional info", async () => {
      mockPrisma.food.create.mockResolvedValue({
        ...mockFood,
        id: "custom-1",
        isVerified: false,
      });
      mockPrisma.nutritionLog.create.mockResolvedValue(mockLog);

      const result = await service.logCustomFood({
        userId: "user-1",
        name: "Homemade Protein Bar",
        mealType: MealType.SNACK,
        quantity: 1,
        unit: "bar",
        calories: 250,
        protein: 20,
        carbs: 30,
        fat: 8,
      });

      expect(result).toBeDefined();
      expect(mockPrisma.food.create).toHaveBeenCalled();
    });

    it("should validate nutritional macros", async () => {
      await expect(
        service.logCustomFood({
          userId: "user-1",
          name: "Invalid Food",
          mealType: MealType.SNACK,
          quantity: 1,
          unit: "serving",
          calories: 250,
          protein: -10,
          carbs: 30,
          fat: 8,
        })
      ).rejects.toThrow("Protein cannot be negative");
    });

    it("should validate calorie-macro consistency", async () => {
      await expect(
        service.logCustomFood({
          userId: "user-1",
          name: "Impossibly Low Cal Food",
          mealType: MealType.SNACK,
          quantity: 1,
          unit: "serving",
          calories: 50,
          protein: 30,
          carbs: 30,
          fat: 30,
        })
      ).rejects.toThrow("Calories seem too low for the provided macros");
    });
  });

  describe("getDailyNutrition", () => {
    it("should return daily nutrition breakdown", async () => {
      mockPrisma.nutritionLog.findMany.mockResolvedValue([
        mockLog,
        { ...mockLog, id: "log-2", mealType: MealType.DINNER, calories: 500 },
      ]);

      const result = await service.getDailyNutrition("user-1", new Date());

      expect(result).toHaveProperty("totalCalories");
      expect(result).toHaveProperty("totalProtein");
      expect(result).toHaveProperty("totalCarbs");
      expect(result).toHaveProperty("totalFat");
      expect(result).toHaveProperty("meals");
    });

    it("should group by meal type", async () => {
      mockPrisma.nutritionLog.findMany.mockResolvedValue([
        { ...mockLog, mealType: MealType.BREAKFAST, calories: 400 },
        { ...mockLog, id: "log-2", mealType: MealType.LUNCH, calories: 500 },
        { ...mockLog, id: "log-3", mealType: MealType.DINNER, calories: 600 },
      ]);

      const result = await service.getDailyNutrition("user-1", new Date());

      expect(result.meals).toHaveProperty("BREAKFAST");
      expect(result.meals).toHaveProperty("LUNCH");
      expect(result.meals).toHaveProperty("DINNER");
    });

    it("should calculate percentage of daily goal", async () => {
      mockPrisma.nutritionLog.findMany.mockResolvedValue([
        { ...mockLog, calories: 500 },
      ]);

      const result = await service.getDailyNutrition("user-1", new Date());

      expect(result).toHaveProperty("goalProgress");
      expect(result.goalProgress).toHaveProperty("calories");
      expect(result.goalProgress).toHaveProperty("protein");
    });

    it("should handle no data for the day", async () => {
      mockPrisma.nutritionLog.findMany.mockResolvedValue([]);

      const result = await service.getDailyNutrition("user-1", new Date());

      expect(result.totalCalories).toBe(0);
      expect(result.meals).toEqual({});
    });
  });

  describe("getWeeklyNutrition", () => {
    it("should return weekly nutrition data", async () => {
      mockPrisma.nutritionLog.findMany.mockResolvedValue(
        Array.from({ length: 7 }, (_, i) => ({
          ...mockLog,
          loggedAt: new Date(Date.now() - i * 86400000),
        }))
      );

      const result = await service.getWeeklyNutrition("user-1");

      expect(result).toHaveProperty("days");
      expect(result).toHaveProperty("averages");
      expect(result).toHaveProperty("totals");
      expect(result.days).toHaveLength(7);
    });

    it("should calculate daily averages", async () => {
      mockPrisma.nutritionLog.findMany.mockResolvedValue([
        { ...mockLog, calories: 2000, protein: 150 },
        { ...mockLog, id: "log-2", calories: 1800, protein: 120 },
      ]);

      const result = await service.getWeeklyNutrition("user-1");

      expect(result.averages).toHaveProperty("calories");
      expect(result.averages).toHaveProperty("protein");
    });

    it("should calculate weekly totals", async () => {
      mockPrisma.nutritionLog.findMany.mockResolvedValue([
        { ...mockLog, calories: 2000 },
        { ...mockLog, id: "log-2", calories: 1800 },
      ]);

      const result = await service.getWeeklyNutrition("user-1");

      expect(result.totals.calories).toBe(3800);
    });
  });

  describe("getFoodSearch", () => {
    it("should search foods by name", async () => {
      mockPrisma.food.findMany.mockResolvedValue([mockFood]);

      const results = await service.searchFoods("chicken", {
        limit: 10,
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toContain("Chicken");
    });

    it("should filter by category", async () => {
      mockPrisma.food.findMany.mockResolvedValue([]);

      await service.searchFoods("food", {
        category: FoodCategory.PROTEIN,
      });

      expect(mockPrisma.food.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: FoodCategory.PROTEIN,
          }),
        })
      );
    });

    it("should include verified foods first", async () => {
      mockPrisma.food.findMany.mockResolvedValue([]);

      await service.searchFoods("chicken");

      expect(mockPrisma.food.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: expect.objectContaining({
            isVerified: "desc",
          }),
        })
      );
    });

    it("should handle barcode lookup", async () => {
      mockPrisma.food.findFirst.mockResolvedValue(mockFood);

      const result = await service.searchFoods("123456789", {
        barcodeLookup: true,
      });

      expect(result).toHaveLength(1);
    });
  });

  describe("getNutritionGoals", () => {
    it("should return default nutrition goals", async () => {
      const goals = await service.getNutritionGoals("user-1");

      expect(goals).toHaveProperty("calories");
      expect(goals).toHaveProperty("protein");
      expect(goals).toHaveProperty("carbs");
      expect(goals).toHaveProperty("fat");
      expect(goals).toHaveProperty("fiber");
    });

    it("should calculate goals based on user profile", async () => {
      mockPrisma.food.findMany.mockResolvedValue([]);

      const goals = await service.getNutritionGoals("user-1", {
        weight: 75,
        height: 180,
        age: 30,
        gender: "male",
        activityLevel: "moderate",
        goal: "maintain",
      });

      expect(goals.calories).toBeGreaterThan(0);
      expect(goals.protein).toBeGreaterThan(0);
    });

    it("should adjust goals for weight loss", async () => {
      const lossGoals = await service.getNutritionGoals("user-1", {
        weight: 75,
        height: 180,
        age: 30,
        gender: "male",
        activityLevel: "moderate",
        goal: "lose",
      });

      const maintainGoals = await service.getNutritionGoals("user-1", {
        weight: 75,
        height: 180,
        age: 30,
        gender: "male",
        activityLevel: "moderate",
        goal: "maintain",
      });

      expect(lossGoals.calories).toBeLessThan(maintainGoals.calories);
    });
  });

  describe("deleteNutritionLog", () => {
    it("should delete a nutrition log entry", async () => {
      mockPrisma.nutritionLog.delete.mockResolvedValue(mockLog);

      await service.deleteNutritionLog("log-1", "user-1");

      expect(mockPrisma.nutritionLog.delete).toHaveBeenCalledWith({
        where: {
          id: "log-1",
          userId: "user-1",
        },
      });
    });

    it("should update daily totals after deletion", async () => {
      mockPrisma.nutritionLog.delete.mockResolvedValue(mockLog);
      mockPrisma.dailyNutrition.upsert.mockResolvedValue({
        id: "daily-1",
        totalCalories: 0,
      });

      await service.deleteNutritionLog("log-1", "user-1");

      expect(mockPrisma.dailyNutrition.upsert).toHaveBeenCalled();
    });
  });

  describe("getNutritionInsights", () => {
    it("should provide nutrition insights", async () => {
      mockPrisma.nutritionLog.findMany.mockResolvedValue([
        mockLog,
        { ...mockLog, calories: 500, protein: 40 },
      ]);

      const insights = await service.getNutritionInsights("user-1");

      expect(insights).toHaveProperty("macros");
      expect(insights).toHaveProperty("mealTiming");
      expect(insights).toHaveProperty("recommendations");
    });

    it("should analyze macro distribution", async () => {
      mockPrisma.nutritionLog.findMany.mockResolvedValue([
        { ...mockLog, protein: 100, carbs: 150, fat: 50, calories: 1450 },
      ]);

      const insights = await service.getNutritionInsights("user-1");

      expect(insights.macros).toHaveProperty("proteinPercent");
      expect(insights.macros).toHaveProperty("carbsPercent");
      expect(insights.macros).toHaveProperty("fatPercent");
    });

    it("should generate relevant recommendations", async () => {
      mockPrisma.nutritionLog.findMany.mockResolvedValue([
        { ...mockLog, protein: 50, calories: 2000 },
      ]);

      const insights = await service.getNutritionInsights("user-1");

      expect(insights.recommendations).toBeInstanceOf(Array);
      expect(insights.recommendations.length).toBeGreaterThan(0);
    });
  });
});
