import { z } from "zod";
import { type AIClient, getAIClient, type AICompletionResponse } from "./provider";

// ---------------------------------------------------------------------------
// Types & Schemas
// ---------------------------------------------------------------------------

export const DietTypeSchema = z.enum([
  "standard",
  "keto",
  "vegan",
  "vegetarian",
  "paleo",
  "mediterranean",
  "whole30",
  "carnivore",
  "pescatarian",
  "dash",
  "fodmap",
  "custom",
]);
export type DietType = z.infer<typeof DietTypeSchema>;

export const ActivityLevelSchema = z.enum([
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
  "extremely_active",
]);
export type ActivityLevel = z.infer<typeof ActivityLevelSchema>;

export const SexSchema = z.enum(["male", "female", "other"]);
export type Sex = z.infer<typeof SexSchema>;

export const FitnessGoalNutritionSchema = z.enum([
  "muscle_gain",
  "fat_loss",
  "maintenance",
  "performance",
  "recomposition",
]);
export type FitnessGoalNutrition = z.infer<typeof FitnessGoalNutritionSchema>;

export const AllergenSchema = z.enum([
  "gluten",
  "dairy",
  "nuts",
  "soy",
  "eggs",
  "shellfish",
  "fish",
  "sesame",
  "sulfites",
  "nightshades",
]);
export type Allergen = z.infer<typeof AllergenSchema>;

export const MacroSplitSchema = z.object({
  protein: z.number().min(0).max(100),
  carbs: z.number().min(0).max(100),
  fat: z.number().min(0).max(100),
  fiber: z.number().min(0).max(100).optional(),
});
export type MacroSplit = z.infer<typeof MacroSplitSchema>;

export const CalorieResultSchema = z.object({
  bmr: z.number(),
  tdee: z.number(),
  targetCalories: z.number(),
  macroSplit: MacroSplitSchema,
  proteinGrams: z.number(),
  carbGrams: z.number(),
  fatGrams: z.number(),
  fiberGrams: z.number(),
  calorieDeficit: z.number().optional(),
  calorieSurplus: z.number().optional(),
  reasoning: z.string(),
});
export type CalorieResult = z.infer<typeof CalorieResultSchema>;

export const MealSchema = z.object({
  name: z.string(),
  time: z.string(),
  foods: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
      fiber: z.number().optional(),
      notes: z.string().optional(),
    }),
  ),
  totalCalories: z.number(),
  totalProtein: z.number(),
  totalCarbs: z.number(),
  totalFat: z.number(),
  preparationTime: z.string().optional(),
  instructions: z.array(z.string()).optional(),
});
export type Meal = z.infer<typeof MealSchema>;

export const MealPlanSchema = z.object({
  name: z.string(),
  dietType: DietTypeSchema,
  dailyCalories: z.number(),
  dailyProtein: z.number(),
  dailyCarbs: z.number(),
  dailyFat: z.number(),
  meals: z.array(MealSchema),
  hydrationLiters: z.number(),
  supplementNotes: z.array(z.string()),
  groceryList: z.array(z.string()),
  mealPrepTips: z.array(z.string()),
  notes: z.string().optional(),
});
export type MealPlan = z.infer<typeof MealPlanSchema>;

export const FoodSubstitutionSchema = z.object({
  originalFood: z.string(),
  substituteFood: z.string(),
  reason: z.string(),
  quantityAdjustment: z.string(),
  macroDifference: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }),
  allergenSafe: z.boolean(),
  tasteImpact: z.enum(["minimal", "moderate", "significant"]),
});
export type FoodSubstitution = z.infer<typeof FoodSubstitutionSchema>;

export const SupplementSchema = z.object({
  name: z.string(),
  dosage: z.string(),
  timing: z.string(),
  purpose: z.string(),
  evidenceLevel: z.enum(["strong", "moderate", "weak", "anecdotal"]),
  priority: z.enum(["essential", "recommended", "optional"]),
  contraindications: z.array(z.string()),
  cost: z.enum(["low", "medium", "high"]),
});
export type Supplement = z.infer<typeof SupplementSchema>;

export const HydrationPlanSchema = z.object({
  dailyLiters: z.number(),
  dailyOunces: z.number(),
  schedule: z.array(
    z.object({
      time: z.string(),
      amount: z.string(),
      type: z.enum(["water", "electrolyte", "sports_drink", "herbal_tea"]),
      notes: z.string().optional(),
    }),
  ),
  preWorkout: z.string(),
  duringWorkout: z.string(),
  postWorkout: z.string(),
  signsOfDehydration: z.array(z.string()),
  electrolyteGuidelines: z.string(),
  adjustmentsForClimate: z.string(),
});
export type HydrationPlan = z.infer<typeof HydrationPlanSchema>;

export const CalculateNutritionRequestSchema = z.object({
  weight: z.number().positive(),
  height: z.number().positive(),
  age: z.number().int().min(14).max(120),
  sex: SexSchema,
  activityLevel: ActivityLevelSchema,
  goal: FitnessGoalNutritionSchema,
  dietType: DietTypeSchema.default("standard"),
  allergens: z.array(AllergenSchema).default([]),
  bodyFatPercent: z.number().min(3).max(60).optional(),
  leanMass: z.number().positive().optional(),
  metabolicConditions: z.array(z.string()).optional(),
});
export type CalculateNutritionRequest = z.infer<typeof CalculateNutritionRequestSchema>;

export const GenerateMealPlanRequestSchema = z.object({
  calories: z.number().positive(),
  protein: z.number().positive(),
  carbs: z.number().positive(),
  fat: z.number().positive(),
  dietType: DietTypeSchema,
  allergens: z.array(AllergenSchema).default([]),
  mealsPerDay: z.number().int().min(2).max(8).default(4),
  prepTimeMinutes: z.number().int().min(0).max(120).default(30),
  cuisinePreferences: z.array(z.string()).default([]),
  budgetLevel: z.enum(["low", "medium", "high"]).default("medium"),
  cookingSkill: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
});
export type GenerateMealPlanRequest = z.infer<typeof GenerateMealPlanRequestSchema>;

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const NUTRITION_SYSTEM_PROMPT = `You are a registered dietitian and sports nutritionist with expertise in:
- Metabolic rate calculations and energy balance
- Macronutrient periodization for athletic performance
- Micronutrient optimization for health and recovery
- Evidence-based supplement recommendations
- Diet-specific meal planning (keto, vegan, paleo, etc.)
- Allergen management and food substitution

You follow current nutritional science and guidelines from:
- Academy of Nutrition and Dietetics
- International Society of Sports Nutrition (ISSN)
- American College of Sports Medicine (ACSM)

Always provide accurate, evidence-based nutritional advice.
Never recommend dangerous caloric restrictions or extreme diets without medical supervision.`;

const MEAL_SYSTEM_PROMPT = `You are a culinary nutrition expert who creates practical, delicious meal plans.
You balance:
- Macronutrient targets
- Micronutrient density
- Practical preparation
- Taste and satisfaction
- Budget considerations
- Allergen safety

All meals should be realistic for home cooking.
Provide clear, step-by-step instructions.
Include ingredient quantities in standard measurements.`;

const HYDRATION_SYSTEM_PROMPT = `You are a hydration science specialist.
You understand:
- Fluid balance and thermoregulation
- Electrolyte management
- Exercise-specific hydration needs
- Climate and altitude adjustments
- Hyponatremia prevention
- Performance impacts of dehydration

Always provide personalized hydration recommendations based on individual factors.`;

// ---------------------------------------------------------------------------
// Nutrition Advisor
// ---------------------------------------------------------------------------

export class NutritionAdvisor {
  private client: AIClient;

  constructor(client?: AIClient) {
    this.client = client ?? getAIClient();
  }

  async calculateNutrition(request: CalculateNutritionRequest): Promise<CalorieResult> {
    const validated = CalculateNutritionRequestSchema.parse(request);

    const prompt = `Calculate comprehensive nutrition targets for this individual:

**Body Stats:**
- Weight: ${validated.weight} kg
- Height: ${validated.height} cm
- Age: ${validated.age} years
- Sex: ${validated.sex}
- Body Fat: ${validated.bodyFatPercent ?? "Unknown"}%
- Lean Mass: ${validated.leanMass ?? "Calculate from body fat"} kg

**Activity & Goals:**
- Activity Level: ${validated.activityLevel}
- Primary Goal: ${validated.goal}
- Diet Type: ${validated.dietType}
- Allergens: ${validated.allergens.join(", ") || "None"}
- Metabolic Conditions: ${validated.metabolicConditions?.join(", ") || "None"}

Requirements:
1. Calculate BMR using Katch-McArdle if body fat known, otherwise Mifflin-St Jeor
2. Calculate TDEE using appropriate activity multiplier
3. Set target calories based on goal (deficit/surplus/maintenance)
4. Calculate optimal macro split for the goal
5. Provide specific gram targets for protein, carbs, fat, fiber
6. Explain your reasoning for each calculation
7. Account for any metabolic conditions in recommendations

Return as a CalorieResult JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: NUTRITION_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.3,
      maxTokens: 4096,
    });

    return this.parseCalorieResult(response);
  }

  async generateMealPlan(request: GenerateMealPlanRequest): Promise<MealPlan> {
    const validated = GenerateMealPlanRequestSchema.parse(request);

    const prompt = `Create a detailed daily meal plan:

**Daily Targets:**
- Calories: ${validated.calories}
- Protein: ${validated.protein}g
- Carbs: ${validated.carbs}g
- Fat: ${validated.fat}g

**Preferences:**
- Diet Type: ${validated.dietType}
- Allergens to Avoid: ${validated.allergens.join(", ") || "None"}
- Meals Per Day: ${validated.mealsPerDay}
- Max Prep Time: ${validated.prepTimeMinutes} minutes per meal
- Cuisine Preferences: ${validated.cuisinePreferences.join(", ") || "Any"}
- Budget: ${validated.budgetLevel}
- Cooking Skill: ${validated.cookingSkill}

Requirements:
1. Create ${validated.mealsPerDay} distinct meals
2. Distribute macros across meals appropriately
3. Include complete ingredient lists with quantities
4. Provide step-by-step preparation instructions
5. Stay within prep time constraints
6. Ensure all allergens are avoided
7. Include practical grocery list
8. Provide meal prep tips for efficiency

Return as a MealPlan JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: MEAL_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.7,
      maxTokens: 8192,
    });

    return this.parseMealPlan(response);
  }

  async suggestFoodSubstitutions(
    food: string,
    reason: string,
    dietType: DietType,
    allergens: Allergen[],
    macros: { calories: number; protein: number; carbs: number; fat: number },
  ): Promise<FoodSubstitution[]> {
    const prompt = `Suggest food substitutions for:

**Original Food:** ${food}
**Reason for substitution:** ${reason}
**Diet Type:** ${dietType}
**Allergens to Avoid:** ${allergens.join(", ") || "None"}
**Current Macros (per serving):**
- Calories: ${macros.calories}
- Protein: ${macros.protein}g
- Carbs: ${macros.carbs}g
- Fat: ${macros.fat}g

Provide 3-5 substitutions that:
1. Match or approximate the macro profile
2. Are safe for the diet type and allergen restrictions
3. Have minimal taste impact
4. Are practically available
5. Include quantity adjustments needed

For each substitution include the macro difference from the original.

Return as an array of FoodSubstitution JSON objects.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: NUTRITION_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.6,
      maxTokens: 4096,
    });

    return this.parseFoodSubstitutions(response);
  }

  async generateDietSpecificPlan(
    dietType: DietType,
    calories: number,
    goals: string[],
    restrictions: string[],
    experienceLevel: string,
  ): Promise<MealPlan> {
    const prompt = `Create a specialized ${dietType} diet plan:

**Target Calories:** ${calories}
**Goals:** ${goals.join(", ")}
**Restrictions:** ${restrictions.join(", ") || "None"}
**Diet Experience Level:** ${experienceLevel}

Requirements specific to ${dietType}:
${this.getDietSpecificRequirements(dietType)}

Include:
1. Complete meal plan for the day
2. ${dietType}-specific food guidelines
3. Common pitfalls to avoid
4. Nutrient considerations for this diet
5. Supplement recommendations specific to ${dietType}
6. Grocery shopping guide

Return as a MealPlan JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: NUTRITION_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.7,
      maxTokens: 8192,
    });

    return this.parseMealPlan(response);
  }

  async recommendSupplements(
    goal: FitnessGoalNutrition,
    dietType: DietType,
    age: number,
    sex: Sex,
    activityLevel: ActivityLevel,
    existingSupplements: string[],
    medicalConditions: string[],
    budget: "low" | "medium" | "high",
  ): Promise<Supplement[]> {
    const prompt = `Recommend supplements for this individual:

**Profile:**
- Age: ${age}, Sex: ${sex}
- Activity Level: ${activityLevel}
- Goal: ${goal}
- Diet Type: ${dietType}
- Budget: ${budget}

**Current Supplements:** ${existingSupplements.join(", ") || "None"}
**Medical Conditions:** ${medicalConditions.join(", ") || "None"}

Requirements:
1. Prioritize supplements with strong scientific evidence
2. Consider diet-specific nutritional gaps
3. Account for age and sex-specific needs
4. Stay within budget constraints
5. Note any contraindications with medical conditions
6. Provide specific dosing and timing recommendations
7. Categorize by priority (essential/recommended/optional)

Return as an array of Supplement JSON objects.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: NUTRITION_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.5,
      maxTokens: 4096,
    });

    return this.parseSupplements(response);
  }

  async createHydrationPlan(
    weight: number,
    activityLevel: ActivityLevel,
    climate: "hot" | "temperate" | "cold",
    exerciseMinutes: number,
    exerciseIntensity: "low" | "moderate" | "high",
    medicalConditions: string[],
  ): Promise<HydrationPlan> {
    const prompt = `Create a personalized hydration plan:

**Profile:**
- Weight: ${weight} kg
- Activity Level: ${activityLevel}
- Climate: ${climate}
- Exercise: ${exerciseMinutes} minutes at ${exerciseIntensity} intensity
- Medical Conditions: ${medicalConditions.join(", ") || "None"}

Requirements:
1. Calculate baseline daily fluid needs
2. Adjust for exercise, climate, and activity level
3. Create a time-based drinking schedule
4. Include pre/during/post workout hydration
5. Provide electrolyte guidelines
6. Address signs of dehydration to watch for
7. Include climate-specific adjustments

Return as a HydrationPlan JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: HYDRATION_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.4,
      maxTokens: 4096,
    });

    return this.parseHydrationPlan(response);
  }

  // ---- Private parsing helpers -------------------------------------------

  private parseCalorieResult(response: AICompletionResponse): CalorieResult {
    try {
      const cleaned = this.extractJSON(response.content);
      return CalorieResultSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse calorie result: ${response.content.slice(0, 200)}`);
    }
  }

  private parseMealPlan(response: AICompletionResponse): MealPlan {
    try {
      const cleaned = this.extractJSON(response.content);
      return MealPlanSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse meal plan: ${response.content.slice0(200)}`);
    }
  }

  private parseFoodSubstitutions(response: AICompletionResponse): FoodSubstitution[] {
    try {
      const cleaned = this.extractJSON(response.content);
      const parsed = JSON.parse(cleaned);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.map((item: unknown) => FoodSubstitutionSchema.parse(item));
    } catch {
      throw new Error(`Failed to parse food substitutions: ${response.content.slice(0, 200)}`);
    }
  }

  private parseSupplements(response: AICompletionResponse): Supplement[] {
    try {
      const cleaned = this.extractJSON(response.content);
      const parsed = JSON.parse(cleaned);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.map((item: unknown) => SupplementSchema.parse(item));
    } catch {
      throw new Error(`Failed to parse supplements: ${response.content.slice(0, 200)}`);
    }
  }

  private parseHydrationPlan(response: AICompletionResponse): HydrationPlan {
    try {
      const cleaned = this.extractJSON(response.content);
      return HydrationPlanSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse hydration plan: ${response.content.slice(0, 200)}`);
    }
  }

  private getDietSpecificRequirements(dietType: DietType): string {
    const requirements: Record<DietType, string> = {
      keto: "- Ensure adequate fat intake (70-75% of calories)\n- Monitor protein to prevent muscle loss\n- Include electrolyte-rich foods\n- Address fiber intake concerns\n- Provide keto-friendly meal prep ideas",
      vegan: "- Ensure complete protein combinations\n- Include B12, iron, zinc, omega-3 considerations\n- Address calcium and vitamin D\n- Plant-based protein prioritization\n- Avoid common vegan nutritional pitfalls",
      paleo: "- Focus on whole, unprocessed foods\n- Include organ meats for micronutrients\n- Address calcium without dairy\n- Seasonal and local food emphasis\n- PracticalPaleo meal planning",
      vegetarian: "- Complete protein combining\n- Iron absorption optimization\n- B12 supplementation guidance\n- Dairy alternatives if needed\n- Balanced plant-based nutrition",
      mediterranean: "- Olive oil as primary fat source\n- Fish and seafood emphasis\n- Whole grain inclusion\n- Legume and nut focus\n- Wine moderation guidelines",
      whole30: "- Elimination protocol compliance\n- Reintroduction planning\n- Whole food emphasis\n- Reading ingredient labels\n- Dining out strategies",
      carnivore: "- Nutrient density from animal foods\n- Organ meat inclusion\n- Electrolyte management\n- Fiber alternatives\n- Long-term sustainability",
      pescatarian: "- Omega-3 optimization\n- Mercury-safe fish choices\n- Plant protein complementation\n- B12 from seafood\n- Sustainable sourcing",
      dash: "- Sodium reduction strategies\n- Potassium-rich foods\n- Calcium and magnesium focus\n- Whole grain emphasis\n- Lean protein sources",
      fodmap: "- Low FODMAP food lists\n- Portion sizes for trigger foods\n- Reintroduction phases\n- Meal planning on elimination\n- Eating out strategies",
      standard: "- Balanced macronutrient approach\n- Whole food emphasis\n- Portion control\n- Meal timing optimization\n- Sustainable eating habits",
      custom: "- Tailored to individual needs\n- Flexible macro approach\n- Personal preference emphasis\n- Progressive adjustment\n- Long-term adherence focus",
    };
    return requirements[dietType] ?? requirements.standard;
  }

  private extractJSON(text: string): string {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return jsonMatch[1].trim();

    const firstBrace = text.indexOf("{");
    const firstBracket = text.indexOf("[");
    const start = firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)
      ? firstBrace
      : firstBracket;

    if (start !== -1) {
      return text.slice(start).trim();
    }

    return text.trim();
  }
}

// ---------------------------------------------------------------------------
// Convenience factory
// ---------------------------------------------------------------------------

export function getNutritionAdvisor(client?: AIClient): NutritionAdvisor {
  return new NutritionAdvisor(client);
}
