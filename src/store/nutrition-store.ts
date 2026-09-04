import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  Meal,
  MealFood,
  Food,
  NutritionGoal,
  DailyNutrition,
  NutritionSummary,
  WaterIntake,
  MealType,
} from "@/types";

interface NutritionState {
  meals: Meal[];
  waterIntakes: WaterIntake[];
  nutritionGoal: NutritionGoal | null;
  selectedDate: string;
  isLogging: boolean;

  setSelectedDate: (date: string) => void;
  addMeal: (meal: Partial<Meal>) => void;
  updateMeal: (mealId: string, updates: Partial<Meal>) => void;
  removeMeal: (mealId: string) => void;
  addFoodToMeal: (mealId: string, food: Food, quantity: number) => void;
  removeFoodFromMeal: (mealId: string, foodId: string) => void;
  updateFoodInMeal: (
    mealId: string,
    foodId: string,
    updates: Partial<MealFood>
  ) => void;

  setNutritionGoal: (goal: NutritionGoal) => void;
  updateNutritionGoal: (updates: Partial<NutritionGoal>) => void;

  addWaterIntake: (amount: number, unit: "ml" | "oz" | "cups") => void;
  removeWaterIntake: (id: string) => void;
  getWaterIntake: () => number;

  getDailyNutrition: () => DailyNutrition;
  getMealsByType: (type: MealType) => Meal[];
  getMealSummary: (mealId: string) => NutritionSummary;
  getWeeklyAverage: () => NutritionSummary;

  setIsLogging: (isLogging: boolean) => void;
  clearDay: (date: string) => void;
}

const calculateMealTotals = (foods: MealFood[]) => {
  return foods.reduce(
    (acc, food) => ({
      calories: acc.calories + food.calories,
      protein: acc.protein + food.protein,
      carbs: acc.carbs + food.carbs,
      fat: acc.fat + food.fat,
      fiber: acc.fiber + food.fiber,
      sugar: acc.sugar + food.sugar,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
  );
};

const createSummary = (
  consumed: { calories: number; protein: number; carbs: number; fat: number; fiber: number },
  goal: { calories: number; protein: number; carbs: number; fat: number; fiber: number }
): NutritionSummary => {
  const makeEntry = (c: number, g: number) => ({
    consumed: Math.round(c),
    goal: g,
    remaining: Math.max(0, g - Math.round(c)),
    percentage: g > 0 ? Math.min(100, Math.round((c / g) * 100)) : 0,
  });

  return {
    calories: makeEntry(consumed.calories, goal.calories),
    protein: makeEntry(consumed.protein, goal.protein),
    carbs: makeEntry(consumed.carbs, goal.carbs),
    fat: makeEntry(consumed.fat, goal.fat),
    fiber: makeEntry(consumed.fiber, goal.fiber),
  };
};

const defaultGoal: NutritionGoal = {
  id: "default",
  userId: "",
  calories: 2000,
  protein: 150,
  carbs: 250,
  fat: 65,
  fiber: 30,
  water: 3000,
  startDate: new Date().toISOString(),
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const useNutritionStore = create<NutritionState>()(
  persist(
    immer((set, get) => ({
      meals: [],
      waterIntakes: [],
      nutritionGoal: defaultGoal,
      selectedDate: new Date().toISOString().split("T")[0],
      isLogging: false,

      setSelectedDate: (date) =>
        set((state) => {
          state.selectedDate = date;
        }),

      addMeal: (mealData) =>
        set((state) => {
          const newMeal: Meal = {
            id: `meal_${Date.now()}`,
            userId: "",
            name: mealData.name || "Meal",
            type: mealData.type || "lunch",
            date: mealData.date || state.selectedDate,
            time: mealData.time || new Date().toTimeString().slice(0, 5),
            foods: [],
            totalCalories: 0,
            totalProtein: 0,
            totalCarbs: 0,
            totalFat: 0,
            totalFiber: 0,
            totalSugar: 0,
            notes: mealData.notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          state.meals.push(newMeal);
        }),

      updateMeal: (mealId, updates) =>
        set((state) => {
          const meal = state.meals.find((m) => m.id === mealId);
          if (meal) {
            Object.assign(meal, updates, {
              updatedAt: new Date().toISOString(),
            });
          }
        }),

      removeMeal: (mealId) =>
        set((state) => {
          state.meals = state.meals.filter((m) => m.id !== mealId);
        }),

      addFoodToMeal: (mealId, food, quantity) =>
        set((state) => {
          const meal = state.meals.find((m) => m.id === mealId);
          if (!meal) return;

          const ratio = quantity / food.servingSize;
          const newFood: MealFood = {
            id: `mf_${Date.now()}`,
            mealId,
            foodId: food.id,
            food,
            servingSize: food.servingSize,
            servingUnit: food.servingUnit,
            quantity,
            calories: Math.round(food.calories * ratio),
            protein: Math.round(food.protein * ratio * 10) / 10,
            carbs: Math.round(food.carbs * ratio * 10) / 10,
            fat: Math.round(food.fat * ratio * 10) / 10,
            fiber: Math.round(food.fiber * ratio * 10) / 10,
            sugar: Math.round(food.sugar * ratio * 10) / 10,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          meal.foods.push(newFood);
          const totals = calculateMealTotals(meal.foods);
          Object.assign(meal, {
            totalCalories: totals.calories,
            totalProtein: totals.protein,
            totalCarbs: totals.carbs,
            totalFat: totals.fat,
            totalFiber: totals.fiber,
            totalSugar: totals.sugar,
            updatedAt: new Date().toISOString(),
          });
        }),

      removeFoodFromMeal: (mealId, foodId) =>
        set((state) => {
          const meal = state.meals.find((m) => m.id === mealId);
          if (!meal) return;
          meal.foods = meal.foods.filter((f) => f.id !== foodId);
          const totals = calculateMealTotals(meal.foods);
          Object.assign(meal, {
            totalCalories: totals.calories,
            totalProtein: totals.protein,
            totalCarbs: totals.carbs,
            totalFat: totals.fat,
            totalFiber: totals.fiber,
            totalSugar: totals.sugar,
            updatedAt: new Date().toISOString(),
          });
        }),

      updateFoodInMeal: (mealId, foodId, updates) =>
        set((state) => {
          const meal = state.meals.find((m) => m.id === mealId);
          if (!meal) return;
          const food = meal.foods.find((f) => f.id === foodId);
          if (!food) return;
          Object.assign(food, updates, {
            updatedAt: new Date().toISOString(),
          });
          const totals = calculateMealTotals(meal.foods);
          Object.assign(meal, {
            totalCalories: totals.calories,
            totalProtein: totals.protein,
            totalCarbs: totals.carbs,
            totalFat: totals.fat,
            totalFiber: totals.fiber,
            totalSugar: totals.sugar,
            updatedAt: new Date().toISOString(),
          });
        }),

      setNutritionGoal: (goal) =>
        set((state) => {
          state.nutritionGoal = goal;
        }),

      updateNutritionGoal: (updates) =>
        set((state) => {
          if (state.nutritionGoal) {
            Object.assign(state.nutritionGoal, updates, {
              updatedAt: new Date().toISOString(),
            });
          }
        }),

      addWaterIntake: (amount, unit) =>
        set((state) => {
          const waterIntake: WaterIntake = {
            id: `water_${Date.now()}`,
            userId: "",
            amount,
            unit,
            date: state.selectedDate,
            time: new Date().toTimeString().slice(0, 5),
            createdAt: new Date().toISOString(),
          };
          state.waterIntakes.push(waterIntake);
        }),

      removeWaterIntake: (id) =>
        set((state) => {
          state.waterIntakes = state.waterIntakes.filter((w) => w.id !== id);
        }),

      getWaterIntake: () => {
        const { waterIntakes, selectedDate } = get();
        return waterIntakes
          .filter((w) => w.date === selectedDate)
          .reduce((total, w) => {
            if (w.unit === "ml") return total + w.amount;
            if (w.unit === "oz") return total + w.amount * 29.5735;
            return total + w.amount * 240;
          }, 0);
      },

      getDailyNutrition: () => {
        const { meals, selectedDate, nutritionGoal, waterIntakes } = get();
        const dayMeals = meals.filter((m) => m.date === selectedDate);
        const goal = nutritionGoal || defaultGoal;

        const totals = dayMeals.reduce(
          (acc, meal) => ({
            calories: acc.calories + meal.totalCalories,
            protein: acc.protein + meal.totalProtein,
            carbs: acc.carbs + meal.totalCarbs,
            fat: acc.fat + meal.totalFat,
            fiber: acc.fiber + meal.totalFiber,
            sugar: acc.sugar + meal.totalSugar,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
        );

        const water = waterIntakes
          .filter((w) => w.date === selectedDate)
          .reduce((total, w) => {
            if (w.unit === "ml") return total + w.amount;
            if (w.unit === "oz") return total + w.amount * 29.5735;
            return total + w.amount * 240;
          }, 0);

        return {
          date: selectedDate,
          meals: dayMeals,
          totalCalories: totals.calories,
          totalProtein: totals.protein,
          totalCarbs: totals.carbs,
          totalFat: totals.fat,
          totalFiber: totals.fiber,
          totalSugar: totals.sugar,
          waterIntake: water,
          goal,
          summary: createSummary(totals, goal),
        };
      },

      getMealsByType: (type) => {
        const { meals, selectedDate } = get();
        return meals.filter((m) => m.date === selectedDate && m.type === type);
      },

      getMealSummary: (mealId) => {
        const { meals, nutritionGoal } = get();
        const meal = meals.find((m) => m.id === mealId);
        const goal = nutritionGoal || defaultGoal;

        if (!meal) {
          return createSummary(
            { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
            goal
          );
        }

        return createSummary(
          {
            calories: meal.totalCalories,
            protein: meal.totalProtein,
            carbs: meal.totalCarbs,
            fat: meal.totalFat,
            fiber: meal.totalFiber,
          },
          goal
        );
      },

      getWeeklyAverage: () => {
        const { meals, nutritionGoal } = get();
        const goal = nutritionGoal || defaultGoal;
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const weekMeals = meals.filter((m) => {
          const mealDate = new Date(m.date);
          return mealDate >= weekAgo && mealDate <= now;
        });

        const totals = weekMeals.reduce(
          (acc, meal) => ({
            calories: acc.calories + meal.totalCalories,
            protein: acc.protein + meal.totalProtein,
            carbs: acc.carbs + meal.totalCarbs,
            fat: acc.fat + meal.totalFat,
            fiber: acc.fiber + meal.totalFiber,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
        );

        const days = 7;
        return createSummary(
          {
            calories: totals.calories / days,
            protein: totals.protein / days,
            carbs: totals.carbs / days,
            fat: totals.fat / days,
            fiber: totals.fiber / days,
          },
          goal
        );
      },

      setIsLogging: (isLogging) =>
        set((state) => {
          state.isLogging = isLogging;
        }),

      clearDay: (date) =>
        set((state) => {
          state.meals = state.meals.filter((m) => m.date !== date);
          state.waterIntakes = state.waterIntakes.filter((w) => w.date !== date);
        }),
    })),
    {
      name: "aifitness-nutrition",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
      partialize: (state) => ({
        meals: state.meals.slice(-200),
        waterIntakes: state.waterIntakes.slice(-200),
        nutritionGoal: state.nutritionGoal,
        selectedDate: state.selectedDate,
      }),
    }
  )
);
