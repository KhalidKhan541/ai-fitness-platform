import {
  validateEmail,
  validatePassword,
  validateWorkoutInput,
  validateNutritionInput,
  validateGoalInput,
  validateBodyMeasurement,
  validateRecipeInput,
  validateChallengeInput,
  validateProfileUpdate,
  validateSearchQuery,
  validatePagination,
  validateDateRange,
  validateMacros,
  validateWeight,
  validateHeight,
  validateAge,
} from "@/lib/validators";

describe("Validators", () => {
  describe("validateEmail", () => {
    it("should accept valid emails", () => {
      expect(validateEmail("user@example.com").isValid).toBe(true);
      expect(validateEmail("test.user@domain.co").isValid).toBe(true);
      expect(validateEmail("user+tag@gmail.com").isValid).toBe(true);
    });

    it("should reject invalid emails", () => {
      expect(validateEmail("").isValid).toBe(false);
      expect(validateEmail("not-an-email").isValid).toBe(false);
      expect(validateEmail("@domain.com").isValid).toBe(false);
      expect(validateEmail("user@").isValid).toBe(false);
      expect(validateEmail("user@.com").isValid).toBe(false);
    });

    it("should trim whitespace", () => {
      expect(validateEmail("  user@example.com  ").isValid).toBe(true);
    });
  });

  describe("validatePassword", () => {
    it("should accept strong passwords", () => {
      expect(validatePassword("StrongP@ss1").isValid).toBe(true);
      expect(validatePassword("MyP@ssw0rd!").isValid).toBe(true);
    });

    it("should require minimum length", () => {
      const result = validatePassword("Ab1!");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Password must be at least 8 characters");
    });

    it("should require uppercase letter", () => {
      const result = validatePassword("lowercase1!");
      expect(result.isValid).toBe(false);
    });

    it("should require lowercase letter", () => {
      const result = validatePassword("UPPERCASE1!");
      expect(result.isValid).toBe(false);
    });

    it("should require number", () => {
      const result = validatePassword("NoNumber!");
      expect(result.isValid).toBe(false);
    });

    it("should require special character", () => {
      const result = validatePassword("NoSpecial1");
      expect(result.isValid).toBe(false);
    });
  });

  describe("validateWorkoutInput", () => {
    it("should accept valid workout input", () => {
      const result = validateWorkoutInput({
        name: "Morning Strength",
        type: "STRENGTH",
        duration: 45,
        exercises: [
          { exerciseId: "ex-1", sets: 3, reps: 10, weight: 50 },
        ],
      });

      expect(result.isValid).toBe(true);
    });

    it("should require workout name", () => {
      const result = validateWorkoutInput({
        name: "",
        type: "STRENGTH",
        duration: 45,
        exercises: [],
      });

      expect(result.isValid).toBe(false);
    });

    it("should validate duration range", () => {
      expect(
        validateWorkoutInput({
          name: "Test",
          type: "STRENGTH",
          duration: -5,
          exercises: [],
        }).isValid
      ).toBe(false);

      expect(
        validateWorkoutInput({
          name: "Test",
          type: "STRENGTH",
          duration: 600,
          exercises: [],
        }).isValid
      ).toBe(false);
    });

    it("should validate exercise data", () => {
      const result = validateWorkoutInput({
        name: "Test",
        type: "STRENGTH",
        duration: 30,
        exercises: [
          { exerciseId: "", sets: 0, reps: -1, weight: -10 },
        ],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should accept valid exercise data", () => {
      const result = validateWorkoutInput({
        name: "Test",
        type: "STRENGTH",
        duration: 30,
        exercises: [
          { exerciseId: "ex-1", sets: 3, reps: 10, weight: 50, restSeconds: 60 },
        ],
      });

      expect(result.isValid).toBe(true);
    });
  });

  describe("validateNutritionInput", () => {
    it("should accept valid nutrition input", () => {
      const result = validateNutritionInput({
        foodId: "food-1",
        mealType: "LUNCH",
        quantity: 200,
        unit: "g",
      });

      expect(result.isValid).toBe(true);
    });

    it("should require food ID or custom food data", () => {
      const result = validateNutritionInput({
        mealType: "LUNCH",
        quantity: 200,
        unit: "g",
      });

      expect(result.isValid).toBe(false);
    });

    it("should validate quantity is positive", () => {
      const result = validateNutritionInput({
        foodId: "food-1",
        mealType: "LUNCH",
        quantity: -100,
        unit: "g",
      });

      expect(result.isValid).toBe(false);
    });

    it("should accept custom food data", () => {
      const result = validateNutritionInput({
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
      });

      expect(result.isValid).toBe(true);
    });

    it("should validate custom food calories", () => {
      const result = validateNutritionInput({
        customFood: {
          name: "Invalid",
          calories: -50,
          protein: 10,
          carbs: 10,
          fat: 10,
        },
        mealType: "SNACK",
        quantity: 1,
        unit: "serving",
      });

      expect(result.isValid).toBe(false);
    });
  });

  describe("validateGoalInput", () => {
    it("should accept valid goal input", () => {
      const result = validateGoalInput({
        type: "WEIGHT_LOSS",
        title: "Lose 10kg",
        targetValue: 65,
        startValue: 75,
        unit: "kg",
        targetDate: new Date("2024-12-31"),
      });

      expect(result.isValid).toBe(true);
    });

    it("should require title", () => {
      const result = validateGoalInput({
        type: "WEIGHT_LOSS",
        title: "",
        targetValue: 65,
        startValue: 75,
        unit: "kg",
        targetDate: new Date("2024-12-31"),
      });

      expect(result.isValid).toBe(false);
    });

    it("should validate target date is future", () => {
      const result = validateGoalInput({
        type: "WEIGHT_LOSS",
        title: "Past Goal",
        targetValue: 65,
        startValue: 75,
        unit: "kg",
        targetDate: new Date("2020-01-01"),
      });

      expect(result.isValid).toBe(false);
    });

    it("should validate weight loss direction", () => {
      const result = validateGoalInput({
        type: "WEIGHT_LOSS",
        title: "Wrong Direction",
        targetValue: 85,
        startValue: 75,
        unit: "kg",
        targetDate: new Date("2024-12-31"),
      });

      expect(result.isValid).toBe(false);
    });

    it("should validate weight gain direction", () => {
      const result = validateGoalInput({
        type: "WEIGHT_GAIN",
        title: "Wrong Direction",
        targetValue: 65,
        startValue: 75,
        unit: "kg",
        targetDate: new Date("2024-12-31"),
      });

      expect(result.isValid).toBe(false);
    });
  });

  describe("validateBodyMeasurement", () => {
    it("should accept valid measurements", () => {
      const result = validateBodyMeasurement({
        chest: 100,
        waist: 80,
        hips: 95,
        bodyFat: 18.5,
      });

      expect(result.isValid).toBe(true);
    });

    it("should validate measurement ranges", () => {
      expect(
        validateBodyMeasurement({ chest: -10 }).isValid
      ).toBe(false);

      expect(
        validateBodyMeasurement({ chest: 300 }).isValid
      ).toBe(false);
    });

    it("should validate body fat percentage", () => {
      expect(
        validateBodyMeasurement({ bodyFat: -5 }).isValid
      ).toBe(false);

      expect(
        validateBodyMeasurement({ bodyFat: 50 }).isValid
      ).toBe(false);
    });

    it("should accept partial measurements", () => {
      const result = validateBodyMeasurement({ chest: 100 });

      expect(result.isValid).toBe(true);
    });
  });

  describe("validateRecipeInput", () => {
    it("should accept valid recipe input", () => {
      const result = validateRecipeInput({
        name: "Protein Shake",
        ingredients: [
          { name: "Whey Protein", amount: 30, unit: "g" },
          { name: "Banana", amount: 1, unit: "medium" },
        ],
        instructions: ["Blend all ingredients"],
        servings: 1,
      });

      expect(result.isValid).toBe(true);
    });

    it("should require recipe name", () => {
      const result = validateRecipeInput({
        name: "",
        ingredients: [],
        instructions: ["Step 1"],
        servings: 1,
      });

      expect(result.isValid).toBe(false);
    });

    it("should require at least one ingredient", () => {
      const result = validateRecipeInput({
        name: "Empty Recipe",
        ingredients: [],
        instructions: ["Step 1"],
        servings: 1,
      });

      expect(result.isValid).toBe(false);
    });

    it("should validate servings count", () => {
      const result = validateRecipeInput({
        name: "Recipe",
        ingredients: [{ name: "Flour", amount: 100, unit: "g" }],
        instructions: ["Mix"],
        servings: 0,
      });

      expect(result.isValid).toBe(false);
    });
  });

  describe("validateChallengeInput", () => {
    it("should accept valid challenge input", () => {
      const result = validateChallengeInput({
        title: "30-Day Push-up Challenge",
        type: "REPETITION",
        targetValue: 1000,
        startDate: new Date("2024-02-01"),
        endDate: new Date("2024-03-01"),
      });

      expect(result.isValid).toBe(true);
    });

    it("should require title", () => {
      const result = validateChallengeInput({
        title: "",
        type: "REPETITION",
        targetValue: 100,
        startDate: new Date("2024-02-01"),
        endDate: new Date("2024-03-01"),
      });

      expect(result.isValid).toBe(false);
    });

    it("should validate date range", () => {
      const result = validateChallengeInput({
        title: "Bad Dates",
        type: "REPETITION",
        targetValue: 100,
        startDate: new Date("2024-03-01"),
        endDate: new Date("2024-02-01"),
      });

      expect(result.isValid).toBe(false);
    });

    it("should validate max duration", () => {
      const result = validateChallengeInput({
        title: "Too Long",
        type: "REPETITION",
        targetValue: 100,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2025-01-01"),
      });

      expect(result.isValid).toBe(false);
    });
  });

  describe("validateProfileUpdate", () => {
    it("should accept valid profile update", () => {
      const result = validateProfileUpdate({
        name: "John Doe",
        weight: 75,
        height: 180,
        age: 30,
        gender: "male",
      });

      expect(result.isValid).toBe(true);
    });

    it("should validate name length", () => {
      expect(
        validateProfileUpdate({ name: "" }).isValid
      ).toBe(false);

      expect(
        validateProfileUpdate({ name: "x".repeat(101) }).isValid
      ).toBe(false);
    });

    it("should validate weight range", () => {
      expect(validateProfileUpdate({ weight: 20 }).isValid).toBe(false);
      expect(validateProfileUpdate({ weight: 300 }).isValid).toBe(false);
    });

    it("should validate height range", () => {
      expect(validateProfileUpdate({ height: 100 }).isValid).toBe(false);
      expect(validateProfileUpdate({ height: 250 }).isValid).toBe(false);
    });

    it("should validate age range", () => {
      expect(validateProfileUpdate({ age: 12 }).isValid).toBe(false);
      expect(validateProfileUpdate({ age: 120 }).isValid).toBe(false);
    });
  });

  describe("validateSearchQuery", () => {
    it("should accept valid search query", () => {
      expect(validateSearchQuery("chicken breast").isValid).toBe(true);
    });

    it("should reject empty query", () => {
      expect(validateSearchQuery("").isValid).toBe(false);
    });

    it("should reject very long queries", () => {
      expect(validateSearchQuery("x".repeat(201)).isValid).toBe(false);
    });

    it("should trim whitespace", () => {
      expect(validateSearchQuery("  hello  ").isValid).toBe(true);
    });
  });

  describe("validatePagination", () => {
    it("should accept valid pagination", () => {
      const result = validatePagination({ page: 1, limit: 10 });
      expect(result.isValid).toBe(true);
    });

    it("should default to page 1", () => {
      const result = validatePagination({});
      expect(result.data.page).toBe(1);
    });

    it("should default limit to 20", () => {
      const result = validatePagination({});
      expect(result.data.limit).toBe(20);
    });

    it("should cap limit at 100", () => {
      const result = validatePagination({ limit: 200 });
      expect(result.data.limit).toBe(100);
    });

    it("should reject negative page", () => {
      expect(validatePagination({ page: -1 }).isValid).toBe(false);
    });
  });

  describe("validateDateRange", () => {
    it("should accept valid date range", () => {
      const result = validateDateRange({
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
      });

      expect(result.isValid).toBe(true);
    });

    it("should reject end before start", () => {
      const result = validateDateRange({
        startDate: new Date("2024-01-31"),
        endDate: new Date("2024-01-01"),
      });

      expect(result.isValid).toBe(false);
    });
  });

  describe("validateMacros", () => {
    it("should accept valid macros", () => {
      const result = validateMacros({
        protein: 150,
        carbs: 200,
        fat: 67,
        calories: 2000,
      });

      expect(result.isValid).toBe(true);
    });

    it("should validate calorie-macro consistency", () => {
      const result = validateMacros({
        protein: 300,
        carbs: 300,
        fat: 300,
        calories: 500,
      });

      expect(result.isValid).toBe(false);
    });

    it("should accept zero values", () => {
      const result = validateMacros({
        protein: 0,
        carbs: 0,
        fat: 0,
        calories: 0,
      });

      expect(result.isValid).toBe(true);
    });
  });

  describe("validateWeight", () => {
    it("should accept valid weights", () => {
      expect(validateWeight(75).isValid).toBe(true);
      expect(validateWeight(30).isValid).toBe(true);
      expect(validateWeight(200).isValid).toBe(true);
    });

    it("should reject invalid weights", () => {
      expect(validateWeight(20).isValid).toBe(false);
      expect(validateWeight(300).isValid).toBe(false);
      expect(validateWeight(-5).isValid).toBe(false);
    });
  });

  describe("validateHeight", () => {
    it("should accept valid heights", () => {
      expect(validateHeight(170).isValid).toBe(true);
      expect(validateHeight(150).isValid).toBe(true);
      expect(validateHeight(200).isValid).toBe(true);
    });

    it("should reject invalid heights", () => {
      expect(validateHeight(100).isValid).toBe(false);
      expect(validateHeight(250).isValid).toBe(false);
    });
  });

  describe("validateAge", () => {
    it("should accept valid ages", () => {
      expect(validateAge(18).isValid).toBe(true);
      expect(validateAge(50).isValid).toBe(true);
      expect(validateAge(100).isValid).toBe(true);
    });

    it("should reject invalid ages", () => {
      expect(validateAge(12).isValid).toBe(false);
      expect(validateAge(120).isValid).toBe(false);
    });
  });
});
