import { NextRequest, NextResponse } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    nutritionLog: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    food: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    dailyNutrition: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/redis", () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

import { GET, POST, DELETE } from "@/app/api/nutrition/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";

const mockPrisma = jest.mocked(prisma);
const mockGetSession = jest.mocked(getServerSession);

function createRequest(
  url: string,
  options?: { method?: string; body?: any }
): NextRequest {
  return new NextRequest(url, {
    method: options?.method || "GET",
    body: options?.body ? JSON.stringify(options.body) : undefined,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Nutrition API", () => {
  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
  };

  const mockLog = {
    id: "log-1",
    userId: "user-1",
    foodId: "food-1",
    food: { name: "Chicken Breast" },
    mealType: "LUNCH",
    quantity: 200,
    unit: "g",
    calories: 330,
    protein: 62,
    carbs: 0,
    fat: 7.2,
    loggedAt: new Date("2024-01-15T12:00:00Z"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: mockUser } as any);
  });

  describe("GET /api/nutrition", () => {
    it("should return daily nutrition logs", async () => {
      mockPrisma.nutritionLog.findMany.mockResolvedValue([mockLog]);
      mockPrisma.nutritionLog.aggregate.mockResolvedValue({
        _sum: { calories: 330, protein: 62, carbs: 0, fat: 7.2 },
      });

      const request = createRequest(
        "http://localhost:3000/api/nutrition?date=2024-01-15"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("logs");
      expect(data).toHaveProperty("totals");
    });

    it("should filter by meal type", async () => {
      mockPrisma.nutritionLog.findMany.mockResolvedValue([]);
      mockPrisma.nutritionLog.aggregate.mockResolvedValue({
        _sum: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      });

      const request = createRequest(
        "http://localhost:3000/api/nutrition?mealType=LUNCH"
      );

      await GET(request);

      expect(mockPrisma.nutritionLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ mealType: "LUNCH" }),
        })
      );
    });

    it("should require authentication", async () => {
      mockGetSession.mockResolvedValue(null);

      const request = createRequest("http://localhost:3000/api/nutrition");

      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("should handle date range queries", async () => {
      mockPrisma.nutritionLog.findMany.mockResolvedValue([]);
      mockPrisma.nutritionLog.aggregate.mockResolvedValue({
        _sum: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      });

      const request = createRequest(
        "http://localhost:3000/api/nutrition?startDate=2024-01-01&endDate=2024-01-31"
      );

      await GET(request);

      expect(mockPrisma.nutritionLog.findMany).toHaveBeenCalled();
    });

    it("should return weekly summary", async () => {
      mockPrisma.nutritionLog.findMany.mockResolvedValue([]);
      mockPrisma.nutritionLog.aggregate.mockResolvedValue({
        _sum: { calories: 14000, protein: 1050, carbs: 1540, fat: 490 },
      });

      const request = createRequest(
        "http://localhost:3000/api/nutrition?view=weekly"
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("should handle database errors gracefully", async () => {
      mockPrisma.nutritionLog.findMany.mockRejectedValue(
        new Error("DB Error")
      );

      const request = createRequest("http://localhost:3000/api/nutrition");

      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/nutrition", () => {
    it("should log food entry", async () => {
      mockPrisma.food.findFirst.mockResolvedValue({
        id: "food-1",
        name: "Chicken Breast",
        caloriesPer100g: 165,
        proteinPer100g: 31,
        carbsPer100g: 0,
        fatPer100g: 3.6,
      });
      mockPrisma.nutritionLog.create.mockResolvedValue(mockLog);
      mockPrisma.dailyNutrition.upsert.mockResolvedValue({
        id: "daily-1",
        totalCalories: 330,
      });

      const request = createRequest("http://localhost:3000/api/nutrition", {
        method: "POST",
        body: {
          foodId: "food-1",
          mealType: "LUNCH",
          quantity: 200,
          unit: "g",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("id");
    });

    it("should validate required fields", async () => {
      const request = createRequest("http://localhost:3000/api/nutrition", {
        method: "POST",
        body: { mealType: "LUNCH" },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should validate quantity", async () => {
      const request = createRequest("http://localhost:3000/api/nutrition", {
        method: "POST",
        body: {
          foodId: "food-1",
          mealType: "LUNCH",
          quantity: -100,
          unit: "g",
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should accept custom food data", async () => {
      mockPrisma.nutritionLog.create.mockResolvedValue(mockLog);
      mockPrisma.dailyNutrition.upsert.mockResolvedValue({
        id: "daily-1",
      });

      const request = createRequest("http://localhost:3000/api/nutrition", {
        method: "POST",
        body: {
          customFood: {
            name: "Homemade Bar",
            calories: 250,
            protein: 20,
            carbs: 30,
            fat: 8,
          },
          mealType: "SNACK",
          quantity: 1,
          unit: "bar",
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });

    it("should update daily totals", async () => {
      mockPrisma.food.findFirst.mockResolvedValue({
        id: "food-1",
        caloriesPer100g: 165,
        proteinPer100g: 31,
        carbsPer100g: 0,
        fatPer100g: 3.6,
      });
      mockPrisma.nutritionLog.create.mockResolvedValue(mockLog);
      mockPrisma.dailyNutrition.upsert.mockResolvedValue({
        id: "daily-1",
      });

      const request = createRequest("http://localhost:3000/api/nutrition", {
        method: "POST",
        body: {
          foodId: "food-1",
          mealType: "LUNCH",
          quantity: 200,
          unit: "g",
        },
      });

      await POST(request);

      expect(mockPrisma.dailyNutrition.upsert).toHaveBeenCalled();
    });

    it("should require authentication", async () => {
      mockGetSession.mockResolvedValue(null);

      const request = createRequest("http://localhost:3000/api/nutrition", {
        method: "POST",
        body: { foodId: "food-1" },
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/nutrition", () => {
    it("should delete nutrition log", async () => {
      mockPrisma.nutritionLog.findMany.mockResolvedValue([mockLog]);
      mockPrisma.nutritionLog.delete.mockResolvedValue(mockLog);
      mockPrisma.dailyNutrition.upsert.mockResolvedValue({
        id: "daily-1",
      });

      const request = createRequest(
        "http://localhost:3000/api/nutrition?id=log-1"
      );

      const response = await DELETE(request);

      expect(response.status).toBe(200);
    });

    it("should not allow deleting others' logs", async () => {
      mockPrisma.nutritionLog.findMany.mockResolvedValue([]);

      const request = createRequest(
        "http://localhost:3000/api/nutrition?id=log-1"
      );

      const response = await DELETE(request);

      expect(response.status).toBe(404);
    });

    it("should require log ID", async () => {
      const request = createRequest("http://localhost:3000/api/nutrition");

      const response = await DELETE(request);

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/nutrition/food-search", () => {
    it("should search foods", async () => {
      mockPrisma.food.findMany.mockResolvedValue([
        {
          id: "food-1",
          name: "Chicken Breast",
          caloriesPer100g: 165,
          proteinPer100g: 31,
          carbsPer100g: 0,
          fatPer100g: 3.6,
          isVerified: true,
        },
      ]);

      const request = createRequest(
        "http://localhost:3000/api/nutrition/food-search?q=chicken"
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it("should handle empty search", async () => {
      const request = createRequest(
        "http://localhost:3000/api/nutrition/food-search?q="
      );

      const response = await GET(request);

      expect(response.status).toBe(400);
    });
  });
});
