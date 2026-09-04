import { NextRequest, NextResponse } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    goal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
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

import { GET, POST } from "@/app/api/goals/route";
import {
  GET as GET_BY_ID,
  PUT as PUT_BY_ID,
  DELETE as DELETE_BY_ID,
} from "@/app/api/goals/[id]/route";
import {
  POST as POST_PROGRESS,
} from "@/app/api/goals/[id]/progress/route";
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

describe("Goals API", () => {
  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
  };

  const mockGoal = {
    id: "goal-1",
    userId: "user-1",
    type: "WEIGHT_LOSS",
    title: "Lose 10kg",
    description: "Reach target weight",
    targetValue: 65,
    currentValue: 72,
    startValue: 80,
    unit: "kg",
    startDate: new Date("2024-01-01"),
    targetDate: new Date("2024-04-01"),
    status: "ACTIVE",
    progress: 50,
    createdAt: new Date(),
    milestones: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ user: mockUser } as any);
  });

  describe("GET /api/goals", () => {
    it("should return user goals", async () => {
      mockPrisma.goal.findMany.mockResolvedValue([mockGoal]);
      mockPrisma.goal.count.mockResolvedValue(1);

      const request = createRequest("http://localhost:3000/api/goals");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
    });

    it("should filter by status", async () => {
      mockPrisma.goal.findMany.mockResolvedValue([]);
      mockPrisma.goal.count.mockResolvedValue(0);

      const request = createRequest(
        "http://localhost:3000/api/goals?status=ACTIVE"
      );

      await GET(request);

      expect(mockPrisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "ACTIVE" }),
        })
      );
    });

    it("should filter by type", async () => {
      mockPrisma.goal.findMany.mockResolvedValue([]);
      mockPrisma.goal.count.mockResolvedValue(0);

      const request = createRequest(
        "http://localhost:3000/api/goals?type=WEIGHT_LOSS"
      );

      await GET(request);

      expect(mockPrisma.goal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: "WEIGHT_LOSS" }),
        })
      );
    });

    it("should require authentication", async () => {
      mockGetSession.mockResolvedValue(null);

      const request = createRequest("http://localhost:3000/api/goals");

      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("should paginate results", async () => {
      mockPrisma.goal.findMany.mockResolvedValue([]);
      mockPrisma.goal.count.mockResolvedValue(25);

      const request = createRequest(
        "http://localhost:3000/api/goals?page=2&limit=10"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.page).toBe(2);
      expect(data.totalPages).toBe(3);
    });
  });

  describe("POST /api/goals", () => {
    it("should create a new goal", async () => {
      mockPrisma.goal.count.mockResolvedValue(2);
      mockPrisma.goal.create.mockResolvedValue(mockGoal);

      const request = createRequest("http://localhost:3000/api/goals", {
        method: "POST",
        body: {
          type: "WEIGHT_LOSS",
          title: "Lose 10kg",
          targetValue: 65,
          startValue: 80,
          unit: "kg",
          targetDate: "2024-04-01",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("id");
    });

    it("should validate required fields", async () => {
      const request = createRequest("http://localhost:3000/api/goals", {
        method: "POST",
        body: { title: "" },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should validate goal type", async () => {
      const request = createRequest("http://localhost:3000/api/goals", {
        method: "POST",
        body: {
          type: "INVALID",
          title: "Test",
          targetValue: 65,
          startValue: 80,
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should validate target date is future", async () => {
      const request = createRequest("http://localhost:3000/api/goals", {
        method: "POST",
        body: {
          type: "WEIGHT_LOSS",
          title: "Past Goal",
          targetValue: 65,
          startValue: 80,
          targetDate: "2020-01-01",
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should enforce max active goals limit", async () => {
      mockPrisma.goal.count.mockResolvedValue(5);

      const request = createRequest("http://localhost:3000/api/goals", {
        method: "POST",
        body: {
          type: "WEIGHT_LOSS",
          title: "New Goal",
          targetValue: 65,
          startValue: 80,
          targetDate: "2024-12-31",
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it("should create milestones automatically", async () => {
      mockPrisma.goal.count.mockResolvedValue(0);
      mockPrisma.goal.create.mockResolvedValue(mockGoal);
      mockPrisma.goalMilestone.create.mockResolvedValue({
        id: "ms-1",
        title: "25%",
      });

      const request = createRequest("http://localhost:3000/api/goals", {
        method: "POST",
        body: {
          type: "WEIGHT_LOSS",
          title: "Lose 10kg",
          targetValue: 65,
          startValue: 80,
          autoMilestones: true,
          targetDate: "2024-04-01",
        },
      });

      await POST(request);

      expect(mockPrisma.goalMilestone.create).toHaveBeenCalled();
    });
  });

  describe("GET /api/goals/[id]", () => {
    it("should return goal by ID", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(mockGoal);

      const request = createRequest("http://localhost:3000/api/goals/goal-1");

      const response = await GET_BY_ID(request, {
        params: { id: "goal-1" },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("goal-1");
    });

    it("should return 404 for non-existent goal", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(null);

      const request = createRequest(
        "http://localhost:3000/api/goals/non-existent"
      );

      const response = await GET_BY_ID(request, {
        params: { id: "non-existent" },
      });

      expect(response.status).toBe(404);
    });

    it("should check ownership", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({
        ...mockGoal,
        userId: "user-2",
      });

      const request = createRequest("http://localhost:3000/api/goals/goal-1");

      const response = await GET_BY_ID(request, {
        params: { id: "goal-1" },
      });

      expect(response.status).toBe(403);
    });
  });

  describe("PUT /api/goals/[id]", () => {
    it("should update goal", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(mockGoal);
      mockPrisma.goal.update.mockResolvedValue({
        ...mockGoal,
        title: "Updated Goal",
      });

      const request = createRequest("http://localhost:3000/api/goals/goal-1", {
        method: "PUT",
        body: { title: "Updated Goal" },
      });

      const response = await PUT_BY_ID(request, {
        params: { id: "goal-1" },
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.title).toBe("Updated Goal");
    });

    it("should not allow updating others' goals", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({
        ...mockGoal,
        userId: "user-2",
      });

      const request = createRequest("http://localhost:3000/api/goals/goal-1", {
        method: "PUT",
        body: { title: "Hacked" },
      });

      const response = await PUT_BY_ID(request, {
        params: { id: "goal-1" },
      });

      expect(response.status).toBe(403);
    });
  });

  describe("DELETE /api/goals/[id]", () => {
    it("should delete goal", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(mockGoal);
      mockPrisma.goalProgress.findMany.mockResolvedValue([]);
      mockPrisma.goalMilestone.findMany.mockResolvedValue([]);
      mockPrisma.goal.delete.mockResolvedValue(mockGoal);

      const request = createRequest("http://localhost:3000/api/goals/goal-1");

      const response = await DELETE_BY_ID(request, {
        params: { id: "goal-1" },
      });

      expect(response.status).toBe(200);
    });

    it("should not allow deleting active goals with progress", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({
        ...mockGoal,
        status: "ACTIVE",
      });
      mockPrisma.goalProgress.findMany.mockResolvedValue([{ id: "gp-1" }]);

      const request = createRequest("http://localhost:3000/api/goals/goal-1");

      const response = await DELETE_BY_ID(request, {
        params: { id: "goal-1" },
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/goals/[id]/progress", () => {
    it("should log goal progress", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue(mockGoal);
      mockPrisma.goalProgress.create.mockResolvedValue({
        id: "gp-1",
        value: 71,
      });
      mockPrisma.goal.update.mockResolvedValue({
        ...mockGoal,
        currentValue: 71,
        progress: 55,
      });

      const request = createRequest(
        "http://localhost:3000/api/goals/goal-1/progress",
        {
          method: "POST",
          body: { value: 71 },
        }
      );

      const response = await POST_PROGRESS(request, {
        params: { id: "goal-1" },
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("progress");
    });

    it("should validate progress value", async () => {
      const request = createRequest(
        "http://localhost:3000/api/goals/goal-1/progress",
        {
          method: "POST",
          body: { value: -10 },
        }
      );

      const response = await POST_PROGRESS(request, {
        params: { id: "goal-1" },
      });

      expect(response.status).toBe(400);
    });

    it("should complete goal when target reached", async () => {
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
        status: "COMPLETED",
      });

      const request = createRequest(
        "http://localhost:3000/api/goals/goal-1/progress",
        {
          method: "POST",
          body: { value: 65 },
        }
      );

      const response = await POST_PROGRESS(request, {
        params: { id: "goal-1" },
      });
      const data = await response.json();

      expect(data.status).toBe("COMPLETED");
    });

    it("should not allow progress on completed goals", async () => {
      mockPrisma.goal.findUnique.mockResolvedValue({
        ...mockGoal,
        status: "COMPLETED",
      });

      const request = createRequest(
        "http://localhost:3000/api/goals/goal-1/progress",
        {
          method: "POST",
          body: { value: 64 },
        }
      );

      const response = await POST_PROGRESS(request, {
        params: { id: "goal-1" },
      });

      expect(response.status).toBe(400);
    });
  });
});
