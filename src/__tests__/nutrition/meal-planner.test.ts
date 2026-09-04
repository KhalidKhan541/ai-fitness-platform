import { MealPlanner, MealPlan } from "@/lib/nutrition/meal-planner";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    mealPlan: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    mealPlanItem: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    food: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/ai/nutrition-advisor", () => ({
  NutritionAdvisor: {
    generateMealSuggestions: jest.fn().mockResolvedValue([
      { foodId: "food-1", quantity: 200, mealType: "LUNCH" },
      { foodId: "food-2", quantity: 150, mealType: "DINNER" },
    ]),
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

describe("MealPlanner", () => {
  let planner: MealPlanner;

  const mockMealPlan = {
    id: "plan-1",
    userId: "user-1",
    name: "Weight Loss Plan",
    startDate: new Date("2024-01-15"),
    endDate: new Date("2024-01-21"),
    targetCalories: 2000,
    targetProtein: 150,
    targetCarbs: 200,
    targetFat: 67,
    isActive: true,
    createdAt: new Date("2024-01-15"),
    items: [
      {
        id: "item-1",
        day: 1,
        mealType: "BREAKFAST",
        foodId: "food-1",
        food: { name: "Oatmeal", caloriesPer100g: 68, proteinPer100g: 2.4 },
        quantity: 100,
        calories: 68,
        protein: 2.4,
      },
    ],
  };

  beforeEach(() => {
    planner = new MealPlanner();
    jest.clearAllMocks();
  });

  describe("createMealPlan", () => {
    it("should create a meal plan", async () => {
      mockPrisma.mealPlan.create.mockResolvedValue(mockMealPlan);
      mockPrisma.mealPlanItem.createMany.mockResolvedValue({ count: 1 });

      const result = await planner.createMealPlan({
        userId: "user-1",
        name: "Weight Loss Plan",
        startDate: new Date("2024-01-15"),
        endDate: new Date("2024-01-21"),
        targetCalories: 2000,
        targetProtein: 150,
        targetCarbs: 200,
        targetFat: 67,
      });

      expect(result).toEqual(mockMealPlan);
      expect(mockPrisma.mealPlan.create).toHaveBeenCalled();
    });

    it("should validate date range", async () => {
      await expect(
        planner.createMealPlan({
          userId: "user-1",
          name: "Invalid Plan",
          startDate: new Date("2024-01-21"),
          endDate: new Date("2024-01-15"),
          targetCalories: 2000,
          targetProtein: 150,
          targetCarbs: 200,
          targetFat: 67,
        })
      ).rejects.toThrow("End date must be after start date");
    });

    it("should validate macro targets", async () => {
      await expect(
        planner.createMealPlan({
          userId: "user-1",
          name: "Invalid Macros",
          startDate: new Date("2024-01-15"),
          endDate: new Date("2024-01-21"),
          targetCalories: -500,
          targetProtein: 150,
          targetCarbs: 200,
          targetFat: 67,
        })
      ).rejects.toThrow("Target calories must be positive");
    });

    it("should validate macro consistency", async () => {
      await expect(
        planner.createMealPlan({
          userId: "user-1",
          name: "Too Many Macros",
          startDate: new Date("2024-01-15"),
          endDate: new Date("2024-01-21"),
          targetCalories: 1000,
          targetProtein: 200,
          targetCarbs: 300,
          targetFat: 100,
        })
      ).rejects.toThrow("Macros exceed target calories");
    });

    it("should limit plan duration to 30 days", async () => {
      await expect(
        planner.createMealPlan({
          userId: "user-1",
          name: "Long Plan",
          startDate: new Date("2024-01-01"),
          endDate: new Date("2024-03-01"),
          targetCalories: 2000,
          targetProtein: 150,
          targetCarbs: 200,
          targetFat: 67,
        })
      ).rejects.toThrow("Plan duration cannot exceed 30 days");
    });
  });

  describe("generateAutoPlan", () => {
    it("should auto-generate meal plan with AI", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        weight: 75,
        height: 180,
        age: 30,
        gender: "male",
        activityLevel: "moderate",
        dietaryRestrictions: ["gluten-free"],
      });

      mockPrisma.food.findMany.mockResolvedValue([
        { id: "food-1", name: "Chicken Breast", caloriesPer100g: 165 },
        { id: "food-2", name: "Brown Rice", caloriesPer100g: 111 },
      ]);

      mockPrisma.mealPlan.create.mockResolvedValue(mockMealPlan);
      mockPrisma.mealPlanItem.createMany.mockResolvedValue({ count: 7 });

      const result = await planner.generateAutoPlan({
        userId: "user-1",
        startDate: new Date("2024-01-15"),
        days: 7,
        goal: "lose",
      });

      expect(result).toBeDefined();
      expect(mockPrisma.mealPlan.create).toHaveBeenCalled();
    });

    it("should respect dietary restrictions", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        dietaryRestrictions: ["vegan"],
      });

      mockPrisma.food.findMany.mockResolvedValue([]);
      mockPrisma.mealPlan.create.mockResolvedValue(mockMealPlan);
      mockPrisma.mealPlanItem.createMany.mockResolvedValue({ count: 0 });

      await planner.generateAutoPlan({
        userId: "user-1",
        startDate: new Date("2024-01-15"),
        days: 7,
        goal: "maintain",
      });

      expect(mockPrisma.food.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: expect.any(String),
          }),
        })
      );
    });

    it("should calculate correct nutritional targets", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        weight: 75,
        height: 180,
        age: 30,
        gender: "male",
        activityLevel: "moderate",
        dietaryRestrictions: [],
      });

      mockPrisma.food.findMany.mockResolvedValue([]);
      mockPrisma.mealPlan.create.mockResolvedValue(mockMealPlan);
      mockPrisma.mealPlanItem.createMany.mockResolvedValue({ count: 0 });

      const result = await planner.generateAutoPlan({
        userId: "user-1",
        startDate: new Date("2024-01-15"),
        days: 7,
        goal: "lose",
      });

      expect(result.targetCalories).toBeLessThan(2500);
    });

    it("should distribute meals across day", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        weight: 75,
        height: 180,
        age: 30,
        gender: "male",
        activityLevel: "moderate",
        dietaryRestrictions: [],
      });

      mockPrisma.food.findMany.mockResolvedValue([
        { id: "food-1", name: "Oatmeal" },
        { id: "food-2", name: "Chicken" },
        { id: "food-3", name: "Salmon" },
      ]);

      mockPrisma.mealPlan.create.mockResolvedValue(mockMealPlan);
      mockPrisma.mealPlanItem.createMany.mockResolvedValue({ count: 14 });

      const result = await planner.generateAutoPlan({
        userId: "user-1",
        startDate: new Date("2024-01-15"),
        days: 7,
        goal: "maintain",
      });

      expect(mockPrisma.mealPlanItem.createMany).toHaveBeenCalled();
    });
  });

  describe("getMealPlan", () => {
    it("should return meal plan with items", async () => {
      mockPrisma.mealPlan.findUnique.mockResolvedValue(mockMealPlan);

      const result = await planner.getMealPlan("plan-1");

      expect(result).toEqual(mockMealPlan);
      expect(mockPrisma.mealPlan.findUnique).toHaveBeenCalledWith({
        where: { id: "plan-1" },
        include: {
          items: {
            include: { food: true },
            orderBy: [{ day: "asc" }, { mealType: "asc" }],
          },
        },
      });
    });

    it("should return null for non-existent plan", async () => {
      mockPrisma.mealPlan.findUnique.mockResolvedValue(null);

      const result = await planner.getMealPlan("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("updateMealPlanItem", () => {
    it("should update a meal plan item", async () => {
      mockPrisma.mealPlanItem.findMany.mockResolvedValue([
        { id: "item-1", day: 1, mealType: "LUNCH" },
      ]);

      mockPrisma.mealPlanItem.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.mealPlanItem.createMany.mockResolvedValue({ count: 1 });

      await planner.updateMealPlanItem("plan-1", "item-1", {
        foodId: "food-2",
        quantity: 250,
      });

      expect(mockPrisma.mealPlanItem.createMany).toHaveBeenCalled();
    });

    it("should recalculate calories after update", async () => {
      mockPrisma.food.findMany.mockResolvedValue([
        { id: "food-2", caloriesPer100g: 200, proteinPer100g: 25 },
      ]);

      mockPrisma.mealPlanItem.findMany.mockResolvedValue([
        { id: "item-1", day: 1, mealType: "LUNCH", quantity: 200 },
      ]);

      mockPrisma.mealPlanItem.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.mealPlanItem.createMany.mockResolvedValue({ count: 1 });

      await planner.updateMealPlanItem("plan-1", "item-1", {
        quantity: 250,
      });

      expect(mockPrisma.mealPlanItem.createMany).toHaveBeenCalled();
    });
  });

  describe("swapMealItem", () => {
    it("should swap a meal item with alternative", async () => {
      mockPrisma.mealPlanItem.findMany.mockResolvedValue([
        {
          id: "item-1",
          day: 1,
          mealType: "LUNCH",
          foodId: "food-1",
          quantity: 200,
        },
      ]);

      mockPrisma.food.findMany.mockResolvedValue([
        { id: "food-3", name: "Turkey Breast", caloriesPer100g: 135 },
      ]);

      mockPrisma.mealPlanItem.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.mealPlanItem.createMany.mockResolvedValue({ count: 1 });

      const result = await planner.swapMealItem("plan-1", "item-1", "food-3");

      expect(result).toBeDefined();
      expect(mockPrisma.mealPlanItem.createMany).toHaveBeenCalled();
    });

    it("should find similar food alternatives", async () => {
      mockPrisma.mealPlanItem.findMany.mockResolvedValue([
        {
          id: "item-1",
          day: 1,
          mealType: "LUNCH",
          foodId: "food-1",
          quantity: 200,
        },
      ]);

      mockPrisma.food.findMany.mockResolvedValue([
        { id: "food-2", name: "Grilled Chicken" },
        { id: "food-3", name: "Baked Salmon" },
      ]);

      const alternatives = await planner.getAlternatives("plan-1", "item-1");

      expect(alternatives).toBeInstanceOf(Array);
      expect(alternatives.length).toBeGreaterThan(0);
    });
  });

  describe("getDaySummary", () => {
    it("should return nutrition summary for a day", async () => {
      mockPrisma.mealPlanItem.findMany.mockResolvedValue([
        { calories: 350, protein: 25, carbs: 40, fat: 10, quantity: 100 },
        { calories: 500, protein: 40, carbs: 50, fat: 15, quantity: 200 },
      ]);

      const result = await planner.getDaySummary("plan-1", 1);

      expect(result).toHaveProperty("totalCalories");
      expect(result).toHaveProperty("totalProtein");
      expect(result).toHaveProperty("totalCarbs");
      expect(result).toHaveProperty("totalFat");
      expect(result).toHaveProperty("meals");
      expect(result.totalCalories).toBe(850);
      expect(result.totalProtein).toBe(65);
    });

    it("should group by meal type", async () => {
      mockPrisma.mealPlanItem.findMany.mockResolvedValue([
        { mealType: "BREAKFAST", calories: 350 },
        { mealType: "LUNCH", calories: 500 },
        { mealType: "DINNER", calories: 600 },
      ]);

      const result = await planner.getDaySummary("plan-1", 1);

      expect(result.meals).toHaveProperty("BREAKFAST");
      expect(result.meals).toHaveProperty("LUNCH");
      expect(result.meals).toHaveProperty("DINNER");
    });

    it("should calculate remaining macros", async () => {
      mockPrisma.mealPlan.findUnique.mockResolvedValue({
        ...mockMealPlan,
        targetCalories: 2000,
        targetProtein: 150,
      });

      mockPrisma.mealPlanItem.findMany.mockResolvedValue([
        { calories: 850, protein: 65, carbs: 80, fat: 25 },
      ]);

      const result = await planner.getDaySummary("plan-1", 1);

      expect(result).toHaveProperty("remaining");
      expect(result.remaining.calories).toBe(1150);
      expect(result.remaining.protein).toBe(85);
    });
  });

  describe("getWeeklySummary", () => {
    it("should return weekly nutrition summary", async () => {
      mockPrisma.mealPlanItem.findMany.mockResolvedValue(
        Array.from({ length: 7 }, (_, i) => ({
          day: i + 1,
          calories: 2000 + Math.random() * 200,
          protein: 150,
          carbs: 200,
          fat: 67,
        }))
      );

      const result = await planner.getWeeklySummary("plan-1");

      expect(result).toHaveProperty("dailyAverages");
      expect(result).toHaveProperty("totalIntake");
      expect(result).toHaveProperty("adherence");
    });

    it("should calculate adherence percentage", async () => {
      mockPrisma.mealPlan.findUnique.mockResolvedValue({
        ...mockMealPlan,
        targetCalories: 2000,
      });

      mockPrisma.mealPlanItem.findMany.mockResolvedValue(
        Array.from({ length: 7 }, () => ({
          calories: 2000,
          protein: 150,
          carbs: 200,
          fat: 67,
        }))
      );

      const result = await planner.getWeeklySummary("plan-1");

      expect(result.adherence).toHaveProperty("calories");
      expect(result.adherence.calories).toBeCloseTo(100, 0);
    });
  });

  describe("deleteMealPlan", () => {
    it("should delete meal plan and items", async () => {
      mockPrisma.mealPlanItem.deleteMany.mockResolvedValue({ count: 7 });
      mockPrisma.mealPlan.delete.mockResolvedValue(mockMealPlan);

      await planner.deleteMealPlan("plan-1");

      expect(mockPrisma.mealPlanItem.deleteMany).toHaveBeenCalledWith({
        where: { mealPlanId: "plan-1" },
      });
      expect(mockPrisma.mealPlan.delete).toHaveBeenCalledWith({
        where: { id: "plan-1" },
      });
    });
  });

  describe("getUserMealPlans", () => {
    it("should return user's meal plans", async () => {
      mockPrisma.mealPlan.findMany.mockResolvedValue([mockMealPlan]);

      const result = await planner.getUserMealPlans("user-1");

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe("user-1");
    });

    it("should filter active plans only", async () => {
      mockPrisma.mealPlan.findMany.mockResolvedValue([]);

      await planner.getUserMealPlans("user-1", { activeOnly: true });

      expect(mockPrisma.mealPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      );
    });

    it("should sort by creation date", async () => {
      mockPrisma.mealPlan.findMany.mockResolvedValue([]);

      await planner.getUserMealPlans("user-1");

      expect(mockPrisma.mealPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "desc" },
        })
      );
    });
  });
});
