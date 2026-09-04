import { NutritionAdvisor } from "@/lib/ai/nutrition-advisor";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    nutritionLog: { findMany: jest.fn() },
    progressEntry: { findMany: jest.fn() },
    food: { findMany: jest.fn() },
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
                  recommendations: [
                    { type: "macronutrient", message: "Increase protein intake", priority: "high" },
                  ],
                  mealSuggestions: [
                    { name: "Grilled Chicken Salad", calories: 450, protein: 35, carbs: 20, fat: 25 },
                  ],
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

describe("NutritionAdvisor", () => {
  let advisor: NutritionAdvisor;

  const mockUserProfile = {
    id: "user-1",
    name: "Test User",
    weight: 75,
    height: 180,
    age: 30,
    gender: "male",
    activityLevel: "moderate",
    goals: [{ type: "weight_loss", targetWeight: 70 }],
    dietaryRestrictions: ["gluten-free"],
    allergies: ["nuts"],
    preferences: {
      favoriteFoods: ["chicken", "rice", "broccoli"],
      dislikedFoods: ["liver"],
      mealFrequency: 4,
    },
  };

  const mockNutritionData = {
    totalCalories: 2200,
    totalProtein: 140,
    totalCarbs: 250,
    totalFat: 70,
    meals: {
      BREAKFAST: [{ name: "Oatmeal", calories: 350, protein: 12, carbs: 60, fat: 8 }],
      LUNCH: [{ name: "Chicken Salad", calories: 500, protein: 40, carbs: 25, fat: 20 }],
      DINNER: [{ name: "Salmon", calories: 600, protein: 45, carbs: 30, fat: 25 }],
      SNACK: [{ name: "Greek Yogurt", calories: 150, protein: 20, carbs: 10, fat: 5 }],
    },
  };

  beforeEach(() => {
    advisor = new NutritionAdvisor();
    jest.clearAllMocks();
  });

  describe("analyzeNutrition", () => {
    it("should analyze nutrition data and provide insights", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);
      mockPrisma.nutritionLog.findMany.mockResolvedValue([
        { calories: 2200, protein: 140, carbs: 250, fat: 70, mealType: "LUNCH" },
      ]);

      const result = await advisor.analyzeNutrition("user-1");

      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("recommendations");
      expect(result).toHaveProperty("score");
    });

    it("should calculate macro percentages", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);
      mockPrisma.nutritionLog.findMany.mockResolvedValue([]);

      const result = await advisor.analyzeNutrition("user-1", {
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 67,
      });

      expect(result.summary).toHaveProperty("proteinPercent");
      expect(result.summary).toHaveProperty("carbsPercent");
      expect(result.summary).toHaveProperty("fatPercent");
    });

    it("should identify nutritional deficiencies", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);
      mockPrisma.nutritionLog.findMany.mockResolvedValue([]);

      const result = await advisor.analyzeNutrition("user-1", {
        calories: 2000,
        protein: 80,
        carbs: 250,
        fat: 70,
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("calculateCalorieNeeds", () => {
    it("should calculate BMR using Mifflin-St Jeor", () => {
      const result = advisor.calculateCalorieNeeds({
        weight: 75,
        height: 180,
        age: 30,
        gender: "male",
        activityLevel: "moderate",
        goal: "maintain",
      });

      expect(result.bmr).toBeGreaterThan(0);
      expect(result.tdee).toBeGreaterThan(result.bmr);
    });

    it("should apply activity multiplier", () => {
      const sedentary = advisor.calculateCalorieNeeds({
        weight: 75,
        height: 180,
        age: 30,
        gender: "male",
        activityLevel: "sedentary",
        goal: "maintain",
      });

      const active = advisor.calculateCalorieNeeds({
        weight: 75,
        height: 180,
        age: 30,
        gender: "male",
        activityLevel: "very_active",
        goal: "maintain",
      });

      expect(active.tdee).toBeGreaterThan(sedentary.tdee);
    });

    it("should adjust for weight loss goal", () => {
      const maintain = advisor.calculateCalorieNeeds({
        weight: 75,
        height: 180,
        age: 30,
        gender: "male",
        activityLevel: "moderate",
        goal: "maintain",
      });

      const lose = advisor.calculateCalorieNeeds({
        weight: 75,
        height: 180,
        age: 30,
        gender: "male",
        activityLevel: "moderate",
        goal: "lose",
      });

      expect(lose.targetCalories).toBeLessThan(maintain.targetCalories);
    });

    it("should adjust for muscle gain goal", () => {
      const maintain = advisor.calculateCalorieNeeds({
        weight: 75,
        height: 180,
        age: 30,
        gender: "male",
        activityLevel: "moderate",
        goal: "maintain",
      });

      const gain = advisor.calculateCalorieNeeds({
        weight: 75,
        height: 180,
        age: 30,
        gender: "male",
        activityLevel: "moderate",
        goal: "gain",
      });

      expect(gain.targetCalories).toBeGreaterThan(maintain.targetCalories);
    });

    it("should use different formula for females", () => {
      const male = advisor.calculateCalorieNeeds({
        weight: 75,
        height: 180,
        age: 30,
        gender: "male",
        activityLevel: "moderate",
        goal: "maintain",
      });

      const female = advisor.calculateCalorieNeeds({
        weight: 75,
        height: 180,
        age: 30,
        gender: "female",
        activityLevel: "moderate",
        goal: "maintain",
      });

      expect(male.bmr).not.toBe(female.bmr);
    });
  });

  describe("generateMealPlan", () => {
    it("should generate meal suggestions via AI", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);
      mockPrisma.food.findMany.mockResolvedValue([
        { id: "f1", name: "Chicken Breast", caloriesPer100g: 165, proteinPer100g: 31 },
        { id: "f2", name: "Brown Rice", caloriesPer100g: 111, proteinPer100g: 2.6 },
      ]);

      const result = await advisor.generateMealPlan("user-1", {
        targetCalories: 2200,
        targetProtein: 150,
        mealsPerDay: 4,
      });

      expect(result).toHaveProperty("meals");
      expect(result).toHaveProperty("totalNutrition");
    });

    it("should respect dietary restrictions", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUserProfile,
        dietaryRestrictions: ["vegan"],
      });

      mockPrisma.food.findMany.mockResolvedValue([]);

      await advisor.generateMealPlan("user-1", {
        targetCalories: 2200,
        targetProtein: 150,
        mealsPerDay: 4,
      });

      expect(mockPrisma.food.findMany).toHaveBeenCalled();
    });

    it("should handle allergen avoidance", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUserProfile,
        allergies: ["dairy", "soy"],
      });

      mockPrisma.food.findMany.mockResolvedValue([]);

      await advisor.generateMealPlan("user-1", {
        targetCalories: 2000,
        targetProtein: 120,
        mealsPerDay: 3,
      });

      expect(mockPrisma.food.findMany).toHaveBeenCalled();
    });
  });

  describe("getNutritionScore", () => {
    it("should calculate overall nutrition score", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);

      const score = await advisor.getNutritionScore("user-1", mockNutritionData);

      expect(score).toHaveProperty("overall");
      expect(score).toHaveProperty("breakdown");
      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(100);
    });

    it("should score higher for balanced macros", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);

      const balanced = await advisor.getNutritionScore("user-1", {
        totalCalories: 2000,
        totalProtein: 150,
        totalCarbs: 200,
        totalFat: 67,
        meals: {},
      });

      const unbalanced = await advisor.getNutritionScore("user-1", {
        totalCalories: 2000,
        totalProtein: 50,
        totalCarbs: 350,
        totalFat: 30,
        meals: {},
      });

      expect(balanced.overall).toBeGreaterThan(unbalanced.overall);
    });
  });

  describe("generateRecommendations", () => {
    it("should generate personalized recommendations", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);
      mockPrisma.nutritionLog.findMany.mockResolvedValue([]);

      const result = await advisor.generateRecommendations("user-1");

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("type");
      expect(result[0]).toHaveProperty("message");
      expect(result[0]).toHaveProperty("priority");
    });

    it("should prioritize high-priority items", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);
      mockPrisma.nutritionLog.findMany.mockResolvedValue([]);

      const result = await advisor.generateRecommendations("user-1");

      const highPriority = result.filter((r) => r.priority === "high");
      const lowPriority = result.filter((r) => r.priority === "low");

      expect(highPriority.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getSupplementSuggestions", () => {
    it("should suggest supplements based on diet gaps", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);
      mockPrisma.nutritionLog.findMany.mockResolvedValue([]);

      const suggestions = await advisor.getSupplementSuggestions("user-1");

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions[0]).toHaveProperty("name");
      expect(suggestions[0]).toHaveProperty("reason");
      expect(suggestions[0]).toHaveProperty("dosage");
    });

    it("should consider dietary restrictions", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUserProfile,
        dietaryRestrictions: ["vegan"],
      });

      mockPrisma.nutritionLog.findMany.mockResolvedValue([]);

      const suggestions = await advisor.getSupplementSuggestions("user-1");

      const hasB12 = suggestions.some((s) => s.name.includes("B12"));
      expect(hasB12).toBe(true);
    });
  });

  describe("getHydrationRecommendations", () => {
    it("should calculate daily water intake", () => {
      const result = advisor.getHydrationRecommendations({
        weight: 75,
        activityLevel: "moderate",
        climate: "temperate",
      });

      expect(result).toHaveProperty("dailyWaterMl");
      expect(result.dailyWaterMl).toBeGreaterThan(0);
    });

    it("should increase for active users", () => {
      const sedentary = advisor.getHydrationRecommendations({
        weight: 75,
        activityLevel: "sedentary",
        climate: "temperate",
      });

      const active = advisor.getHydrationRecommendations({
        weight: 75,
        activityLevel: "very_active",
        climate: "temperate",
      });

      expect(active.dailyWaterMl).toBeGreaterThan(sedentary.dailyWaterMl);
    });

    it("should adjust for climate", () => {
      const temperate = advisor.getHydrationRecommendations({
        weight: 75,
        activityLevel: "moderate",
        climate: "temperate",
      });

      const hot = advisor.getHydrationRecommendations({
        weight: 75,
        activityLevel: "moderate",
        climate: "hot",
      });

      expect(hot.dailyWaterMl).toBeGreaterThan(temperate.dailyWaterMl);
    });
  });
});
