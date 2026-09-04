import {
  WorkoutService,
  WorkoutType,
  DifficultyLevel,
  MuscleGroup,
} from "@/lib/workouts/workout-service";

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    workout: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    workoutExercise: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    exercise: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((fns: Array<() => Promise<any>>) =>
      Promise.all(fns.map((fn) => fn()))
    ),
  },
}));

// Mock AI service
jest.mock("@/lib/ai/workout-generator", () => ({
  WorkoutGenerator: {
    generateWorkout: jest.fn().mockResolvedValue({
      name: "AI Generated Workout",
      exercises: [
        { exerciseId: "ex1", sets: 3, reps: 10, weight: 50 },
        { exerciseId: "ex2", sets: 4, reps: 8, weight: 60 },
      ],
    }),
  },
}));

// Mock Redis cache
jest.mock("@/lib/redis", () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

import { prisma } from "@/lib/prisma";

const mockPrisma = jest.mocked(prisma);

describe("WorkoutService", () => {
  let service: WorkoutService;

  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
  };

  const mockWorkout = {
    id: "workout-1",
    userId: "user-1",
    name: "Morning Strength",
    type: WorkoutType.STRENGTH,
    difficulty: DifficultyLevel.INTERMEDIATE,
    duration: 45,
    caloriesBurned: 350,
    isCompleted: false,
    isPublic: true,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    exercises: [
      {
        id: "we-1",
        exerciseId: "ex-1",
        sets: 3,
        reps: 10,
        weight: 50,
        restSeconds: 60,
        order: 1,
        exercise: {
          id: "ex-1",
          name: "Bench Press",
          muscleGroup: MuscleGroup.CHEST,
          equipment: "Barbell",
        },
      },
    ],
  };

  beforeEach(() => {
    service = new WorkoutService();
    jest.clearAllMocks();
  });

  describe("createWorkout", () => {
    it("should create a new workout with exercises", async () => {
      const createInput = {
        userId: "user-1",
        name: "Morning Strength",
        type: WorkoutType.STRENGTH,
        difficulty: DifficultyLevel.INTERMEDIATE,
        duration: 45,
        exercises: [
          {
            exerciseId: "ex-1",
            sets: 3,
            reps: 10,
            weight: 50,
            restSeconds: 60,
            order: 1,
          },
        ],
      };

      mockPrisma.workout.create.mockResolvedValue(mockWorkout);
      mockPrisma.workoutExercise.createMany.mockResolvedValue({ count: 1 });

      const result = await service.createWorkout(createInput);

      expect(result).toEqual(mockWorkout);
      expect(mockPrisma.workout.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          name: "Morning Strength",
          type: WorkoutType.STRENGTH,
          difficulty: DifficultyLevel.INTERMEDIATE,
          duration: 45,
          isPublic: false,
        },
      });
    });

    it("should throw error if user not provided", async () => {
      await expect(
        service.createWorkout({
          userId: "",
          name: "Test",
          type: WorkoutType.STRENGTH,
          difficulty: DifficultyLevel.BEGINNER,
          duration: 30,
          exercises: [],
        })
      ).rejects.toThrow("User ID is required");
    });

    it("should validate workout duration", async () => {
      await expect(
        service.createWorkout({
          userId: "user-1",
          name: "Test",
          type: WorkoutType.STRENGTH,
          difficulty: DifficultyLevel.BEGINNER,
          duration: -5,
          exercises: [],
        })
      ).rejects.toThrow("Duration must be positive");
    });

    it("should validate exercise count", async () => {
      await expect(
        service.createWorkout({
          userId: "user-1",
          name: "Test",
          type: WorkoutType.STRENGTH,
          difficulty: DifficultyLevel.BEGINNER,
          duration: 30,
          exercises: [],
        })
      ).rejects.toThrow("Workout must have at least one exercise");
    });

    it("should set isPublic flag correctly", async () => {
      mockPrisma.workout.create.mockResolvedValue({
        ...mockWorkout,
        isPublic: true,
      });
      mockPrisma.workoutExercise.createMany.mockResolvedValue({ count: 1 });

      await service.createWorkout({
        userId: "user-1",
        name: "Public Workout",
        type: WorkoutType.CARDIO,
        difficulty: DifficultyLevel.BEGINNER,
        duration: 30,
        isPublic: true,
        exercises: [
          {
            exerciseId: "ex-1",
            sets: 1,
            reps: 1,
            weight: 0,
            restSeconds: 0,
            order: 1,
          },
        ],
      });

      expect(mockPrisma.workout.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isPublic: true }),
        })
      );
    });
  });

  describe("getWorkoutById", () => {
    it("should return workout with exercises", async () => {
      mockPrisma.workout.findUnique.mockResolvedValue(mockWorkout);

      const result = await service.getWorkoutById("workout-1");

      expect(result).toEqual(mockWorkout);
      expect(mockPrisma.workout.findUnique).toHaveBeenCalledWith({
        where: { id: "workout-1" },
        include: {
          exercises: {
            include: { exercise: true },
            orderBy: { order: "asc" },
          },
        },
      });
    });

    it("should return null for non-existent workout", async () => {
      mockPrisma.workout.findUnique.mockResolvedValue(null);

      const result = await service.getWorkoutById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("getUserWorkouts", () => {
    it("should return paginated workouts for user", async () => {
      const workouts = [mockWorkout];
      mockPrisma.workout.findMany.mockResolvedValue(workouts);
      mockPrisma.workout.count.mockResolvedValue(1);

      const result = await service.getUserWorkouts("user-1", {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual(workouts);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("should filter workouts by type", async () => {
      mockPrisma.workout.findMany.mockResolvedValue([mockWorkout]);
      mockPrisma.workout.count.mockResolvedValue(1);

      await service.getUserWorkouts("user-1", {
        page: 1,
        limit: 10,
        type: WorkoutType.STRENGTH,
      });

      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: WorkoutType.STRENGTH,
          }),
        })
      );
    });

    it("should filter by date range", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      mockPrisma.workout.findMany.mockResolvedValue([]);
      mockPrisma.workout.count.mockResolvedValue(0);

      await service.getUserWorkouts("user-1", {
        page: 1,
        limit: 10,
        startDate,
        endDate,
      });

      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });

    it("should sort workouts by duration", async () => {
      mockPrisma.workout.findMany.mockResolvedValue([]);
      mockPrisma.workout.count.mockResolvedValue(0);

      await service.getUserWorkouts("user-1", {
        page: 1,
        limit: 10,
        sortBy: "duration",
        sortOrder: "desc",
      });

      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { duration: "desc" },
        })
      );
    });

    it("should handle empty results", async () => {
      mockPrisma.workout.findMany.mockResolvedValue([]);
      mockPrisma.workout.count.mockResolvedValue(0);

      const result = await service.getUserWorkouts("user-1", {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe("updateWorkout", () => {
    it("should update workout details", async () => {
      const updatedWorkout = { ...mockWorkout, name: "Updated Name" };
      mockPrisma.workout.update.mockResolvedValue(updatedWorkout);

      const result = await service.updateWorkout("workout-1", {
        name: "Updated Name",
      });

      expect(result.name).toBe("Updated Name");
      expect(mockPrisma.workout.update).toHaveBeenCalledWith({
        where: { id: "workout-1" },
        data: { name: "Updated Name" },
      });
    });

    it("should update workout completion status", async () => {
      const completedWorkout = {
        ...mockWorkout,
        isCompleted: true,
        completedAt: new Date(),
      };
      mockPrisma.workout.update.mockResolvedValue(completedWorkout);

      const result = await service.updateWorkout("workout-1", {
        isCompleted: true,
      });

      expect(result.isCompleted).toBe(true);
    });

    it("should throw error for non-existent workout", async () => {
      mockPrisma.workout.update.mockRejectedValue(
        new Error("Record to update not found")
      );

      await expect(
        service.updateWorkout("non-existent", { name: "Test" })
      ).rejects.toThrow("Record to update not found");
    });
  });

  describe("deleteWorkout", () => {
    it("should delete workout and related exercises", async () => {
      mockPrisma.workoutExercise.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.workout.delete.mockResolvedValue(mockWorkout);

      await service.deleteWorkout("workout-1");

      expect(mockPrisma.workoutExercise.deleteMany).toHaveBeenCalledWith({
        where: { workoutId: "workout-1" },
      });
      expect(mockPrisma.workout.delete).toHaveBeenCalledWith({
        where: { id: "workout-1" },
      });
    });

    it("should throw error for non-existent workout", async () => {
      mockPrisma.workout.delete.mockRejectedValue(
        new Error("Record to delete not found")
      );

      await expect(service.deleteWorkout("non-existent")).rejects.toThrow(
        "Record to delete not found"
      );
    });
  });

  describe("getWorkoutStats", () => {
    it("should return workout statistics for user", async () => {
      mockPrisma.workout.count
        .mockResolvedValueOnce(25) // total workouts
        .mockResolvedValueOnce(20) // completed workouts
        .mockResolvedValueOnce(5); // public workouts

      mockPrisma.workout.findMany.mockResolvedValue([
        {
          ...mockWorkout,
          duration: 45,
          caloriesBurned: 350,
          createdAt: new Date("2024-01-15"),
        },
        {
          ...mockWorkout,
          id: "workout-2",
          duration: 60,
          caloriesBurned: 500,
          createdAt: new Date("2024-01-16"),
        },
      ]);

      const stats = await service.getWorkoutStats("user-1");

      expect(stats).toHaveProperty("totalWorkouts");
      expect(stats).toHaveProperty("completedWorkouts");
      expect(stats).toHaveProperty("totalDuration");
      expect(stats).toHaveProperty("totalCaloriesBurned");
      expect(stats).toHaveProperty("averageDuration");
      expect(stats).toHaveProperty("completionRate");
    });

    it("should calculate correct completion rate", async () => {
      mockPrisma.workout.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8);

      mockPrisma.workout.findMany.mockResolvedValue([]);

      const stats = await service.getWorkoutStats("user-1");

      expect(stats.completionRate).toBe(80);
    });

    it("should handle zero workouts", async () => {
      mockPrisma.workout.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      mockPrisma.workout.findMany.mockResolvedValue([]);

      const stats = await service.getWorkoutStats("user-1");

      expect(stats.totalWorkouts).toBe(0);
      expect(stats.totalDuration).toBe(0);
      expect(stats.totalCaloriesBurned).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.completionRate).toBe(0);
    });
  });

  describe("searchWorkouts", () => {
    it("should search workouts by name", async () => {
      mockPrisma.workout.findMany.mockResolvedValue([mockWorkout]);

      const results = await service.searchWorkouts("user-1", "strength");

      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: expect.objectContaining({
                  contains: "strength",
                  mode: "insensitive",
                }),
              }),
            ]),
          }),
        })
      );
    });

    it("should filter public workouts only", async () => {
      mockPrisma.workout.findMany.mockResolvedValue([]);

      await service.searchWorkouts("user-1", "cardio", { publicOnly: true });

      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPublic: true,
          }),
        })
      );
    });
  });

  describe("duplicateWorkout", () => {
    it("should create a copy of workout for user", async () => {
      const duplicatedWorkout = {
        ...mockWorkout,
        id: "workout-dup",
        name: "Morning Strength (Copy)",
        userId: "user-2",
        isCompleted: false,
      };

      mockPrisma.workout.findUnique.mockResolvedValue(mockWorkout);
      mockPrisma.workout.create.mockResolvedValue(duplicatedWorkout);
      mockPrisma.workoutExercise.createMany.mockResolvedValue({ count: 1 });

      const result = await service.duplicateWorkout(
        "workout-1",
        "user-2"
      );

      expect(result.name).toContain("(Copy)");
      expect(result.userId).toBe("user-2");
      expect(result.isCompleted).toBe(false);
    });

    it("should throw error if source workout not found", async () => {
      mockPrisma.workout.findUnique.mockResolvedValue(null);

      await expect(
        service.duplicateWorkout("non-existent", "user-2")
      ).rejects.toThrow("Workout not found");
    });
  });

  describe("getPublicWorkouts", () => {
    it("should return public workouts with pagination", async () => {
      const publicWorkouts = [
        { ...mockWorkout, isPublic: true, userId: "user-2" },
      ];
      mockPrisma.workout.findMany.mockResolvedValue(publicWorkouts);
      mockPrisma.workout.count.mockResolvedValue(1);

      const result = await service.getPublicWorkouts({
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].isPublic).toBe(true);
    });

    it("should filter by difficulty", async () => {
      mockPrisma.workout.findMany.mockResolvedValue([]);
      mockPrisma.workout.count.mockResolvedValue(0);

      await service.getPublicWorkouts({
        page: 1,
        limit: 10,
        difficulty: DifficultyLevel.BEGINNER,
      });

      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            difficulty: DifficultyLevel.BEGINNER,
          }),
        })
      );
    });
  });

  describe("addExerciseToWorkout", () => {
    it("should add exercise to existing workout", async () => {
      const newExercise = {
        id: "we-new",
        workoutId: "workout-1",
        exerciseId: "ex-3",
        sets: 3,
        reps: 12,
        weight: 30,
        restSeconds: 45,
        order: 3,
      };

      mockPrisma.workoutExercise.create.mockResolvedValue(newExercise);

      const result = await service.addExerciseToWorkout("workout-1", {
        exerciseId: "ex-3",
        sets: 3,
        reps: 12,
        weight: 30,
        restSeconds: 45,
      });

      expect(result).toEqual(newExercise);
      expect(mockPrisma.workoutExercise.create).toHaveBeenCalled();
    });

    it("should set correct order for new exercise", async () => {
      mockPrisma.workoutExercise.findMany.mockResolvedValue([
        { order: 1 },
        { order: 2 },
      ]);
      mockPrisma.workoutExercise.create.mockResolvedValue({
        id: "we-new",
        order: 3,
      });

      await service.addExerciseToWorkout("workout-1", {
        exerciseId: "ex-3",
        sets: 3,
        reps: 12,
        weight: 30,
        restSeconds: 45,
      });

      expect(mockPrisma.workoutExercise.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ order: 3 }),
        })
      );
    });
  });

  describe("removeExerciseFromWorkout", () => {
    it("should remove exercise from workout", async () => {
      mockPrisma.workoutExercise.deleteMany.mockResolvedValue({ count: 1 });

      await service.removeExerciseFromWorkout("workout-1", "we-1");

      expect(mockPrisma.workoutExercise.deleteMany).toHaveBeenCalledWith({
        where: {
          id: "we-1",
          workoutId: "workout-1",
        },
      });
    });
  });

  describe("reorderExercises", () => {
    it("should update exercise order", async () => {
      mockPrisma.workoutExercise.findMany.mockResolvedValue([
        { id: "we-1", order: 1 },
        { id: "we-2", order: 2 },
        { id: "we-3", order: 3 },
      ]);

      mockPrisma.$transaction.mockResolvedValue([
        { id: "we-1", order: 2 },
        { id: "we-2", order: 3 },
        { id: "we-3", order: 1 },
      ]);

      const newOrder = ["we-3", "we-1", "we-2"];

      await service.reorderExercises("workout-1", newOrder);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
