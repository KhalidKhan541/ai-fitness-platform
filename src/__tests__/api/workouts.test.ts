import { NextRequest, NextResponse } from "next/server";

// Mock dependencies
jest.mock("@/lib/prisma", () => ({
  prisma: {
    workout: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
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

import { GET, POST, PUT, DELETE } from "@/app/api/workouts/route";
import {
  GET as GET_BY_ID,
  PUT as PUT_BY_ID,
  DELETE as DELETE_BY_ID,
} from "@/app/api/workouts/[id]/route";
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

describe("Workouts API", () => {
  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
  };

  const mockWorkout = {
    id: "workout-1",
    userId: "user-1",
    name: "Morning Strength",
    type: "STRENGTH",
    difficulty: "INTERMEDIATE",
    duration: 45,
    caloriesBurned: 350,
    isCompleted: false,
    isPublic: true,
    exercises: [],
    createdAt: new Date("2024-01-15"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: mockUser } as any);
  });

  describe("GET /api/workouts", () => {
    it("should return paginated workouts", async () => {
      mockPrisma.workout.findMany.mockResolvedValue([mockWorkout]);
      mockPrisma.workout.count.mockResolvedValue(1);

      const request = createRequest(
        "http://localhost:3000/api/workouts?page=1&limit=10"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.total).toBe(1);
    });

    it("should filter by workout type", async () => {
      mockPrisma.workout.findMany.mockResolvedValue([]);
      mockPrisma.workout.count.mockResolvedValue(0);

      const request = createRequest(
        "http://localhost:3000/api/workouts?type=STRENGTH"
      );

      await GET(request);

      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: "STRENGTH" }),
        })
      );
    });

    it("should filter by difficulty", async () => {
      mockPrisma.workout.findMany.mockResolvedValue([]);
      mockPrisma.workout.count.mockResolvedValue(0);

      const request = createRequest(
        "http://localhost:3000/api/workouts?difficulty=BEGINNER"
      );

      await GET(request);

      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ difficulty: "BEGINNER" }),
        })
      );
    });

    it("should require authentication", async () => {
      mockGetSession.mockResolvedValue(null);

      const request = createRequest("http://localhost:3000/api/workouts");

      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("should handle database errors", async () => {
      mockPrisma.workout.findMany.mockRejectedValue(
        new Error("Database error")
      );

      const request = createRequest("http://localhost:3000/api/workouts");

      const response = await GET(request);

      expect(response.status).toBe(500);
    });

    it("should support search query", async () => {
      mockPrisma.workout.findMany.mockResolvedValue([]);
      mockPrisma.workout.count.mockResolvedValue(0);

      const request = createRequest(
        "http://localhost:3000/api/workouts?search=strength"
      );

      await GET(request);

      expect(mockPrisma.workout.findMany).toHaveBeenCalled();
    });

    it("should sort by different fields", async () => {
      mockPrisma.workout.findMany.mockResolvedValue([]);
      mockPrisma.workout.count.mockResolvedValue(0);

      const request = createRequest(
        "http://localhost:3000/api/workouts?sortBy=duration&sortOrder=desc"
      );

      await GET(request);

      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { duration: "desc" },
        })
      );
    });
  });

  describe("POST /api/workouts", () => {
    it("should create a new workout", async () => {
      mockPrisma.workout.create.mockResolvedValue(mockWorkout);

      const request = createRequest("http://localhost:3000/api/workouts", {
        method: "POST",
        body: {
          name: "Morning Strength",
          type: "STRENGTH",
          difficulty: "INTERMEDIATE",
          duration: 45,
          exercises: [
            { exerciseId: "ex-1", sets: 3, reps: 10, weight: 50 },
          ],
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("id");
    });

    it("should validate required fields", async () => {
      const request = createRequest("http://localhost:3000/api/workouts", {
        method: "POST",
        body: { name: "" },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should validate workout data", async () => {
      const request = createRequest("http://localhost:3000/api/workouts", {
        method: "POST",
        body: {
          name: "Test",
          type: "INVALID",
          duration: -5,
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should require authentication", async () => {
      mockGetSession.mockResolvedValue(null);

      const request = createRequest("http://localhost:3000/api/workouts", {
        method: "POST",
        body: { name: "Test" },
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/workouts/[id]", () => {
    it("should return workout by ID", async () => {
      mockPrisma.workout.findUnique.mockResolvedValue(mockWorkout);

      const request = createRequest(
        "http://localhost:3000/api/workouts/workout-1"
      );

      const response = await GET_BY_ID(request, {
        params: { id: "workout-1" },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("workout-1");
    });

    it("should return 404 for non-existent workout", async () => {
      mockPrisma.workout.findUnique.mockResolvedValue(null);

      const request = createRequest(
        "http://localhost:3000/api/workouts/non-existent"
      );

      const response = await GET_BY_ID(request, {
        params: { id: "non-existent" },
      });

      expect(response.status).toBe(404);
    });

    it("should check authorization for private workouts", async () => {
      mockPrisma.workout.findUnique.mockResolvedValue({
        ...mockWorkout,
        isPublic: false,
        userId: "user-2",
      });

      const request = createRequest(
        "http://localhost:3000/api/workouts/workout-1"
      );

      const response = await GET_BY_ID(request, {
        params: { id: "workout-1" },
      });

      expect(response.status).toBe(403);
    });
  });

  describe("PUT /api/workouts/[id]", () => {
    it("should update workout", async () => {
      mockPrisma.workout.findUnique.mockResolvedValue(mockWorkout);
      mockPrisma.workout.update.mockResolvedValue({
        ...mockWorkout,
        name: "Updated Workout",
      });

      const request = createRequest(
        "http://localhost:3000/api/workouts/workout-1",
        {
          method: "PUT",
          body: { name: "Updated Workout" },
        }
      );

      const response = await PUT_BY_ID(request, {
        params: { id: "workout-1" },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Updated Workout");
    });

    it("should not allow updating others' workouts", async () => {
      mockPrisma.workout.findUnique.mockResolvedValue({
        ...mockWorkout,
        userId: "user-2",
      });

      const request = createRequest(
        "http://localhost:3000/api/workouts/workout-1",
        {
          method: "PUT",
          body: { name: "Hacked" },
        }
      );

      const response = await PUT_BY_ID(request, {
        params: { id: "workout-1" },
      });

      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /api/workouts/[id]", () => {
    it("should delete workout", async () => {
      mockPrisma.workout.findUnique.mockResolvedValue(mockWorkout);
      mockPrisma.workout.delete.mockResolvedValue(mockWorkout);

      const request = createRequest(
        "http://localhost:3000/api/workouts/workout-1"
      );

      const response = await DELETE_BY_ID(request, {
        params: { id: "workout-1" },
      });

      expect(response.status).toBe(200);
    });

    it("should not allow deleting others' workouts", async () => {
      mockPrisma.workout.findUnique.mockResolvedValue({
        ...mockWorkout,
        userId: "user-2",
      });

      const request = createRequest(
        "http://localhost:3000/api/workouts/workout-1"
      );

      const response = await DELETE_BY_ID(request, {
        params: { id: "workout-1" },
      });

      expect(response.status).toBe(403);
    });
  });
});
