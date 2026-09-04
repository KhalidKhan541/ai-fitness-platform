import {
  WorkoutGenerator,
  WorkoutType,
  DifficultyLevel,
  FitnessLevel,
} from "@/lib/ai/workout-generator";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    exercise: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    workout: {
      create: jest.fn(),
    },
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
                  name: "AI Generated Workout",
                  exercises: [
                    {
                      exerciseId: "ex-1",
                      sets: 3,
                      reps: 10,
                      weight: null,
                      restSeconds: 60,
                      notes: "Focus on form",
                    },
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

describe("WorkoutGenerator", () => {
  let generator: WorkoutGenerator;

  const mockExercises = [
    {
      id: "ex-1",
      name: "Barbell Bench Press",
      muscleGroup: "CHEST",
      equipment: "Barbell",
      difficulty: "INTERMEDIATE",
      instructions: "Lie on bench, press barbell up",
    },
    {
      id: "ex-2",
      name: "Incline Dumbbell Press",
      muscleGroup: "CHEST",
      equipment: "Dumbbell",
      difficulty: "INTERMEDIATE",
      instructions: "Press dumbbells on incline bench",
    },
    {
      id: "ex-3",
      name: "Barbell Squat",
      muscleGroup: "LEGS",
      equipment: "Barbell",
      difficulty: "ADVANCED",
      instructions: "Squat with barbell on back",
    },
    {
      id: "ex-4",
      name: "Deadlift",
      muscleGroup: "BACK",
      equipment: "Barbell",
      difficulty: "ADVANCED",
      instructions: "Lift barbell from ground",
    },
    {
      id: "ex-5",
      name: "Pull-ups",
      muscleGroup: "BACK",
      equipment: "Bodyweight",
      difficulty: "INTERMEDIATE",
      instructions: "Hang from bar and pull up",
    },
  ];

  const mockUserProfile = {
    id: "user-1",
    fitnessLevel: FitnessLevel.INTERMEDIATE,
    weight: 75,
    height: 180,
    age: 30,
    injuries: [],
    preferences: {
      workoutDuration: 45,
      preferredEquipment: ["Barbell", "Dumbbell"],
      avoidExercises: [],
    },
    workoutHistory: [
      { exerciseId: "ex-1", lastPerformed: new Date("2024-01-10") },
      { exerciseId: "ex-2", lastPerformed: new Date("2024-01-12") },
    ],
  };

  beforeEach(() => {
    generator = new WorkoutGenerator();
    jest.clearAllMocks();
  });

  describe("generateWorkout", () => {
    it("should generate a workout based on user profile", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);
      mockPrisma.exercise.findMany.mockResolvedValue(mockExercises);

      const result = await generator.generateWorkout({
        userId: "user-1",
        type: WorkoutType.STRENGTH,
        duration: 45,
        difficulty: DifficultyLevel.INTERMEDIATE,
        targetMuscleGroups: ["CHEST", "BACK"],
      });

      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("exercises");
      expect(result).toHaveProperty("estimatedDuration");
      expect(result).toHaveProperty("estimatedCalories");
      expect(result.exercises.length).toBeGreaterThan(0);
    });

    it("should respect user injuries", async () => {
      const userWithInjuries = {
        ...mockUserProfile,
        injuries: ["Lower back", "Knee"],
      };

      mockPrisma.user.findUnique.mockResolvedValue(userWithInjuries);
      mockPrisma.exercise.findMany.mockResolvedValue(mockExercises);

      const result = await generator.generateWorkout({
        userId: "user-1",
        type: WorkoutType.STRENGTH,
        duration: 45,
        difficulty: DifficultyLevel.INTERMEDIATE,
      });

      const hasBackExercise = result.exercises.some(
        (e) => e.notes?.toLowerCase().includes("back")
      );

      expect(hasBackExercise).toBe(false);
    });

    it("should respect equipment preferences", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);
      mockPrisma.exercise.findMany.mockResolvedValue(mockExercises);

      await generator.generateWorkout({
        userId: "user-1",
        type: WorkoutType.STRENGTH,
        duration: 45,
        difficulty: DifficultyLevel.INTERMEDIATE,
        availableEquipment: ["Dumbbell"],
      });

      expect(mockPrisma.exercise.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            equipment: { in: ["Dumbbell"] },
          }),
        })
      );
    });

    it("should avoid recently performed exercises", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);
      mockPrisma.exercise.findMany.mockResolvedValue(mockExercises);

      await generator.generateWorkout({
        userId: "user-1",
        type: WorkoutType.STRENGTH,
        duration: 45,
        difficulty: DifficultyLevel.INTERMEDIATE,
        avoidRecentDays: 3,
      });

      expect(mockPrisma.exercise.findMany).toHaveBeenCalled();
    });

    it("should generate warm-up and cool-down", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);
      mockPrisma.exercise.findMany.mockResolvedValue(mockExercises);

      const result = await generator.generateWorkout({
        userId: "user-1",
        type: WorkoutType.STRENGTH,
        duration: 45,
        difficulty: DifficultyLevel.INTERMEDIATE,
        includeWarmup: true,
        includeCooldown: true,
      });

      expect(result).toHaveProperty("warmup");
      expect(result).toHaveProperty("cooldown");
      expect(result.warmup).toBeInstanceOf(Array);
      expect(result.cooldown).toBeInstanceOf(Array);
    });

    it("should calculate estimated calories", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);
      mockPrisma.exercise.findMany.mockResolvedValue(mockExercises);

      const result = await generator.generateWorkout({
        userId: "user-1",
        type: WorkoutType.STRENGTH,
        duration: 45,
        difficulty: DifficultyLevel.INTERMEDIATE,
      });

      expect(result.estimatedCalories).toBeGreaterThan(0);
    });

    it("should handle no exercises found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);
      mockPrisma.exercise.findMany.mockResolvedValue([]);

      await expect(
        generator.generateWorkout({
          userId: "user-1",
          type: WorkoutType.STRENGTH,
          duration: 45,
          difficulty: DifficultyLevel.INTERMEDIATE,
          targetMuscleGroups: ["OBSOLETE"],
        })
      ).rejects.toThrow("No exercises found matching criteria");
    });

    it("should handle user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        generator.generateWorkout({
          userId: "non-existent",
          type: WorkoutType.STRENGTH,
          duration: 45,
          difficulty: DifficultyLevel.INTERMEDIATE,
        })
      ).rejects.toThrow("User not found");
    });
  });

  describe("generateVariation", () => {
    it("should generate workout variation", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);
      mockPrisma.exercise.findMany.mockResolvedValue(mockExercises);

      const result = await generator.generateVariation({
        userId: "user-1",
        baseWorkoutType: WorkoutType.STRENGTH,
        variationLevel: "moderate",
      });

      expect(result).toHaveProperty("exercises");
      expect(result.exercises.length).toBeGreaterThan(0);
    });

    it("should increase variation level", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);
      mockPrisma.exercise.findMany.mockResolvedValue(mockExercises);

      const moderate = await generator.generateVariation({
        userId: "user-1",
        baseWorkoutType: WorkoutType.STRENGTH,
        variationLevel: "moderate",
      });

      jest.clearAllMocks();
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);
      mockPrisma.exercise.findMany.mockResolvedValue(mockExercises);

      const high = await generator.generateVariation({
        userId: "user-1",
        baseWorkoutType: WorkoutType.STRENGTH,
        variationLevel: "high",
      });

      expect(high).toHaveProperty("exercises");
    });
  });

  describe("adjustDifficulty", () => {
    it("should increase sets for advanced users", () => {
      const result = generator.adjustDifficulty({
        exercises: [
          { exerciseId: "ex-1", sets: 3, reps: 10, weight: 50 },
        ],
        currentDifficulty: DifficultyLevel.BEGINNER,
        targetDifficulty: DifficultyLevel.ADVANCED,
      });

      expect(result.exercises[0].sets).toBeGreaterThan(3);
    });

    it("should decrease sets for beginners", () => {
      const result = generator.adjustDifficulty({
        exercises: [
          { exerciseId: "ex-1", sets: 5, reps: 12, weight: 60 },
        ],
        currentDifficulty: DifficultyLevel.ADVANCED,
        targetDifficulty: DifficultyLevel.BEGINNER,
      });

      expect(result.exercises[0].sets).toBeLessThan(5);
    });

    it("should adjust rest times", () => {
      const result = generator.adjustDifficulty({
        exercises: [
          { exerciseId: "ex-1", sets: 3, reps: 10, weight: 50, restSeconds: 60 },
        ],
        currentDifficulty: DifficultyLevel.BEGINNER,
        targetDifficulty: DifficultyLevel.ADVANCED,
      });

      expect(result.exercises[0].restSeconds).toBeLessThan(60);
    });

    it("should handle same difficulty", () => {
      const result = generator.adjustDifficulty({
        exercises: [
          { exerciseId: "ex-1", sets: 3, reps: 10, weight: 50, restSeconds: 60 },
        ],
        currentDifficulty: DifficultyLevel.INTERMEDIATE,
        targetDifficulty: DifficultyLevel.INTERMEDIATE,
      });

      expect(result.exercises[0].sets).toBe(3);
      expect(result.exercises[0].restSeconds).toBe(60);
    });
  });

  describe("calculateWorkoutMetrics", () => {
    it("should calculate total volume", () => {
      const result = generator.calculateWorkoutMetrics({
        exercises: [
          { sets: 3, reps: 10, weight: 100 },
          { sets: 4, reps: 8, weight: 80 },
        ],
        userWeight: 75,
      });

      expect(result.totalVolume).toBe(300 + 320);
    });

    it("should calculate estimated duration", () => {
      const result = generator.calculateWorkoutMetrics({
        exercises: [
          { sets: 3, reps: 10, weight: 100, restSeconds: 60 },
          { sets: 4, reps: 8, weight: 80, restSeconds: 90 },
        ],
        userWeight: 75,
      });

      expect(result.estimatedDuration).toBeGreaterThan(0);
    });

    it("should calculate intensity score", () => {
      const result = generator.calculateWorkoutMetrics({
        exercises: [
          { sets: 5, reps: 5, weight: 150, restSeconds: 180 },
        ],
        userWeight: 75,
      });

      expect(result.intensityScore).toBeGreaterThan(0);
      expect(result.intensityScore).toBeLessThanOrEqual(100);
    });

    it("should estimate calories burned", () => {
      const result = generator.calculateWorkoutMetrics({
        exercises: [
          { sets: 3, reps: 10, weight: 100, restSeconds: 60 },
        ],
        userWeight: 75,
      });

      expect(result.estimatedCalories).toBeGreaterThan(0);
    });
  });

  describe("getExerciseRecommendations", () => {
    it("should recommend exercises based on weak areas", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUserProfile,
        weakMuscleGroups: ["LEGS", "SHOULDERS"],
      });

      mockPrisma.exercise.findMany.mockResolvedValue(mockExercises);

      const recommendations = await generator.getExerciseRecommendations(
        "user-1"
      );

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it("should prioritize exercises not recently performed", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);
      mockPrisma.exercise.findMany.mockResolvedValue(mockExercises);

      const recommendations = await generator.getExerciseRecommendations(
        "user-1"
      );

      expect(recommendations).toBeDefined();
    });
  });

  describe("createWorkoutTemplate", () => {
    it("should save workout as template", async () => {
      mockPrisma.workout.create.mockResolvedValue({
        id: "workout-1",
        name: "Custom Template",
        isTemplate: true,
      });

      const result = await generator.saveAsTemplate({
        userId: "user-1",
        name: "Custom Template",
        exercises: [
          { exerciseId: "ex-1", sets: 3, reps: 10, weight: 50 },
        ],
        type: WorkoutType.STRENGTH,
        difficulty: DifficultyLevel.INTERMEDIATE,
      });

      expect(result).toHaveProperty("id");
      expect(mockPrisma.workout.create).toHaveBeenCalled();
    });
  });

  describe("generateProgressiveOverload", () => {
    it("should suggest progressive overload", () => {
      const history = [
        { date: new Date("2024-01-01"), sets: 3, reps: 10, weight: 80 },
        { date: new Date("2024-01-08"), sets: 3, reps: 10, weight: 82.5 },
        { date: new Date("2024-01-15"), sets: 3, reps: 10, weight: 85 },
      ];

      const suggestion = generator.suggestProgressiveOverload(history);

      expect(suggestion).toHaveProperty("recommendedWeight");
      expect(suggestion).toHaveProperty("recommendedReps");
      expect(suggestion).toHaveProperty("reasoning");
      expect(suggestion.recommendedWeight).toBeGreaterThan(85);
    });

    it("should suggest deload if plateau detected", () => {
      const history = [
        { date: new Date("2024-01-01"), sets: 3, reps: 10, weight: 80 },
        { date: new Date("2024-01-08"), sets: 3, reps: 10, weight: 80 },
        { date: new Date("2024-01-15"), sets: 3, reps: 10, weight: 80 },
      ];

      const suggestion = generator.suggestProgressiveOverload(history);

      expect(suggestion).toHaveProperty("isDeload");
      expect(suggestion.isDeload).toBe(true);
    });

    it("should handle empty history", () => {
      const suggestion = generator.suggestProgressiveOverload([]);

      expect(suggestion).toHaveProperty("recommendedWeight");
      expect(suggestion.reasoning).toContain("No history");
    });
  });
});
