import { z } from "zod";
import { type AIClient, getAIClient, type AICompletionResponse } from "./provider";

// ---------------------------------------------------------------------------
// Types & Schemas
// ---------------------------------------------------------------------------

export const FitnessGoalSchema = z.enum([
  "muscle_gain",
  "fat_loss",
  "endurance",
  "strength",
  "powerlifting",
  "bodybuilding",
  "general_fitness",
  "athletic_performance",
  "flexibility",
  "rehabilitation",
]);
export type FitnessGoal = z.infer<typeof FitnessGoalSchema>;

export const ExperienceLevelSchema = z.enum(["beginner", "intermediate", "advanced", "elite"]);
export type ExperienceLevel = z.infer<typeof ExperienceLevelSchema>;

export const EquipmentTypeSchema = z.enum([
  "barbell",
  "dumbbell",
  "kettlebell",
  "cable",
  "machine",
  "bodyweight",
  "resistance_band",
  "pull_up_bar",
  "medicine_ball",
  "foam_roller",
  "suspension_trainer",
  "battle_ropes",
  "sled",
  "landmine",
  "ez_bar",
  "trap_bar",
  "none",
]);
export type EquipmentType = z.infer<typeof EquipmentTypeSchema>;

export const MuscleGroupSchema = z.enum([
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "core",
  "quadriceps",
  "hamstrings",
  "glutes",
  "calves",
  "hip_flexors",
  "traps",
  "rear_delts",
  "lats",
]);
export type MuscleGroup = z.infer<typeof MuscleGroupSchema>;

export const SplitTypeSchema = z.enum([
  "full_body",
  "upper_lower",
  "push_pull_legs",
  "bro_split",
  "total_body",
  "custom",
]);
export type SplitType = z.infer<typeof SplitTypeSchema>;

export const PeriodizationTypeSchema = z.enum([
  "linear",
  "undulating",
  "block",
  "conjugate",
  "auto_regulated",
]);
export type PeriodizationType = z.infer<typeof PeriodizationTypeSchema>;

export const ExerciseSchema = z.object({
  name: z.string(),
  sets: z.number().int().positive(),
  reps: z.string(),
  restSeconds: z.number().int().min(0),
  tempo: z.string().optional(),
  targetMuscles: z.array(MuscleGroupSchema),
  equipment: EquipmentTypeSchema,
  notes: z.string().optional(),
  substitutions: z.array(z.string()).optional(),
  rpe: z.number().min(1).max(10).optional(),
  percentage1RM: z.number().min(0).max(100).optional(),
});
export type Exercise = z.infer<typeof ExerciseSchema>;

export const WorkoutSchema = z.object({
  name: z.string(),
  description: z.string(),
  dayNumber: z.number().int().positive(),
  splitType: SplitTypeSchema,
  exercises: z.array(ExerciseSchema),
  estimatedDurationMinutes: z.number().int().positive(),
  targetMuscles: z.array(MuscleGroupSchema),
  difficulty: z.number().min(1).max(10),
  notes: z.string().optional(),
  warmUp: z.array(z.string()),
  coolDown: z.array(z.string()),
});
export type Workout = z.infer<typeof WorkoutSchema>;

export const WorkoutPlanSchema = z.object({
  name: z.string(),
  description: z.string(),
  goal: FitnessGoalSchema,
  experienceLevel: ExperienceLevelSchema,
  splitType: SplitTypeSchema,
  workoutsPerWeek: z.number().int().min(1).max(7),
  durationWeeks: z.number().int().positive(),
  periodization: PeriodizationTypeSchema,
  weeks: z.array(
    z.object({
      weekNumber: z.number().int().positive(),
      phase: z.string(),
      workouts: z.array(WorkoutSchema),
      deload: z.boolean().default(false),
      volumeMultiplier: z.number().default(1),
      intensityMultiplier: z.number().default(1),
    }),
  ),
  progressionNotes: z.array(z.string()),
  nutritionGuidelines: z.string().optional(),
});
export type WorkoutPlan = z.infer<typeof WorkoutPlanSchema>;

export const GenerateWorkoutRequestSchema = z.object({
  goal: FitnessGoalSchema,
  experienceLevel: ExperienceLevelSchema,
  availableEquipment: z.array(EquipmentTypeSchema).min(1),
  timePerSession: z.number().int().min(15).max(180),
  workoutsPerWeek: z.number().int().min(1).max(7),
  splitType: SplitTypeSchema.optional(),
  targetMuscles: z.array(MuscleGroupSchema).optional(),
  limitations: z.array(z.string()).optional(),
  preferences: z.object({
    compoundFirst: z.boolean().default(true),
    includeCardio: z.boolean().default(false),
    includeCore: z.boolean().default(true),
    includeMobility: z.boolean().default(false),
    preferredRepRange: z.string().optional(),
  }).optional(),
  durationWeeks: z.number().int().min(1).max(52).default(4),
  periodization: PeriodizationTypeSchema.optional(),
});
export type GenerateWorkoutRequest = z.infer<typeof GenerateWorkoutRequestSchema>;

export const ProgressiveOverloadSuggestionSchema = z.object({
  type: z.enum(["weight", "reps", "sets", "tempo", "rpe", "rest"]),
  currentValue: z.string(),
  suggestedValue: z.string(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
});
export type ProgressiveOverloadSuggestion = z.infer<typeof ProgressiveOverloadSuggestionSchema>;

export const DeloadWeekSchema = z.object({
  weekNumber: z.number().int().positive(),
  reason: z.string(),
  volumeReductionPercent: z.number().min(10).max(60),
  intensityReductionPercent: z.number().min(10).max(40),
  modifiedWorkouts: z.array(WorkoutSchema),
  focusAreas: z.array(z.string()),
  recoveryStrategies: z.array(z.string()),
});
export type DeloadWeek = z.infer<typeof DeloadWeekSchema>;

export const PlateauStrategySchema = z.object({
  strategyName: z.string(),
  description: z.string(),
  implementation: z.array(z.string()),
  duration: z.string(),
  expectedOutcome: z.string(),
  riskLevel: z.enum(["low", "medium", "high"]),
  applicableExercises: z.array(z.string()),
});
export type PlateauStrategy = z.infer<typeof PlateauStrategySchema>;

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const WORKOUT_SYSTEM_PROMPT = `You are an elite fitness coach and exercise scientist with 20+ years of experience.
You design evidence-based training programs using current sports science research.

Key principles you follow:
- Progressive overload is the foundation of all training adaptation
- Volume, intensity, and frequency must be balanced for the individual
- Recovery is as important as training stimulus
- Specificity of training for stated goals
- Individual variation in recovery capacity and response to training
- Exercise selection based on biomechanics and muscle activation
- Periodization to prevent overtraining and optimize adaptation

Always output well-structured JSON. Never invent exercise names that don't exist.
Use standard, recognized exercises (barbell bench press, not "chest press deluxe").`;

const OVERLOAD_SYSTEM_PROMPT = `You are an AI strength coach specializing in progressive overload programming.
You analyze training data and recommend specific progression strategies based on:
- Current performance levels
- Training history and consistency
- Recovery indicators
- Individual response patterns
- Scientific evidence for progression rates

Always provide actionable, specific recommendations with clear reasoning.`;

const DELoad_SYSTEM_PROMPT = `You are a recovery and periodization specialist.
You design deload weeks that:
- Allow full systemic recovery
- Maintain neuromuscular adaptations
- Address accumulated fatigue
- Prepare for the next training block
- Include specific recovery modalities

Provide detailed deload protocols with clear volume/intensity prescriptions.`;

const PLATEAU_SYSTEM_PROMPT = `You are a performance突破 specialist.
You identify the root causes of training plateaus and design targeted strategies:
- Weak point analysis
- Training variable manipulation
- Novel stimulus introduction
- Recovery optimization
- Technique refinement
- Periodization adjustments

Always explain the science behind your recommendations.`;

// ---------------------------------------------------------------------------
// Workout Generator
// ---------------------------------------------------------------------------

export class WorkoutGenerator {
  private client: AIClient;

  constructor(client?: AIClient) {
    this.client = client ?? getAIClient();
  }

  async generateWorkoutPlan(request: GenerateWorkoutRequest): Promise<WorkoutPlan> {
    const validated = GenerateWorkoutRequestSchema.parse(request);

    const prompt = `Generate a comprehensive ${validated.durationWeeks}-week training program with these specifications:

**Goal:** ${validated.goal}
**Experience Level:** ${validated.experienceLevel}
**Available Equipment:** ${validated.availableEquipment.join(", ")}
**Time Per Session:** ${validated.timePerSession} minutes
**Workouts Per Week:** ${validated.workoutsPerWeek}
**Split Type:** ${validated.splitType ?? "auto-detect best fit"}
**Target Muscles:** ${validated.targetMuscles?.join(", ") ?? "balanced full body"}
**Limitations:** ${validated.limitations?.join(", ") ?? "none"}
**Periodization:** ${validated.periodization ?? "auto-select optimal"}
**Duration:** ${validated.durationWeeks} weeks

**Preferences:**
${JSON.stringify(validated.preferences ?? {
  compoundFirst: true,
  includeCardio: false,
  includeCore: true,
  includeMobility: false,
}, null, 2)}

Requirements:
1. Each workout must fit within ${validated.timePerSession} minutes
2. All exercises must use available equipment only
3. Include warm-up and cool-down for each session
4. Apply progressive overload across the weeks
5. Include rest days appropriate for recovery
6. Use proper set/rep schemes for the goal:
   - Muscle gain: 3-4 sets × 8-12 reps, 60-90s rest
   - Fat loss: 3-4 sets × 12-15 reps, 30-60s rest
   - Strength: 4-5 sets × 3-6 reps, 3-5min rest
   - Endurance: 2-3 sets × 15-20+ reps, 30-45s rest

Return as a complete WorkoutPlan JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: WORKOUT_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.7,
      maxTokens: 8192,
    });

    return this.parseWorkoutPlan(response);
  }

  async generateFromEquipment(
    equipment: EquipmentType[],
    goal: FitnessGoal,
    experienceLevel: ExperienceLevel,
    timeMinutes: number,
  ): Promise<Workout> {
    const prompt = `Generate a single workout session with these constraints:

**Available Equipment:** ${equipment.join(", ")}
**Goal:** ${goal}
**Experience Level:** ${experienceLevel}
**Time Limit:** ${timeMinutes} minutes

Requirements:
1. Maximize exercise variety given the equipment constraints
2. Include compound movements first, isolation second
3. Provide complete warm-up (5-10 min) and cool-down (5 min)
4. Include tempo prescriptions for key lifts
5. Specify RPE targets for each exercise
6. Include exercise substitutions where applicable

Return as a Workout JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: WORKOUT_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.7,
      maxTokens: 4096,
    });

    return this.parseWorkout(response);
  }

  async generateFromTimeConstraint(
    goal: FitnessGoal,
    minutesAvailable: number,
    equipment: EquipmentType[],
    experienceLevel: ExperienceLevel,
  ): Promise<Workout> {
    const prompt = `Design an optimized ${minutesAvailable}-minute workout for ${goal}.

**Equipment:** ${equipment.join(", ")}
**Experience:** ${experienceLevel}

Prioritize:
1. Most effective exercises for the time available
2. Supersets and circuits to maximize density
3. Minimal setup transitions between exercises
4. Appropriate warm-up scaled to time (shorter warm-up for shorter sessions)
5. Full completion of workout within exact time limit

Return as a Workout JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: WORKOUT_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.7,
      maxTokens: 4096,
    });

    return this.parseWorkout(response);
  }

  async suggestProgressiveOverload(
    exerciseName: string,
    currentSets: number,
    currentReps: string,
    currentWeight: number,
    goal: FitnessGoal,
    trainingHistory: Array<{ date: string; weight: number; reps: number; rpe?: number }>,
  ): Promise<ProgressiveOverloadSuggestion[]> {
    const historyText = trainingHistory.length > 0
      ? trainingHistory
          .slice(-10)
          .map((h) => `  ${h.date}: ${h.weight}kg × ${h.reps} reps (RPE: ${h.rpe ?? "N/A"})`)
          .join("\n")
      : "No history available";

    const prompt = `Analyze this exercise and recommend progressive overload strategies:

**Exercise:** ${exerciseName}
**Current Program:** ${currentSets} sets × ${currentReps} reps @ ${currentWeight}kg
**Goal:** ${goal}
**Recent History:**
${historyText}

Provide 3-5 specific, actionable progression recommendations. Consider:
1. Weight increases (micro-loading)
2. Rep progression within current set/rep scheme
3. Volume manipulation (additional sets)
4. Tempo changes for time under tension
5. Rest period optimization
6. RPE-based autoregulation

For each suggestion include:
- Type of progression
- Current vs suggested values
- Scientific reasoning
- Confidence level (0-1)

Return as an array of ProgressiveOverloadSuggestion JSON objects.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: OVERLOAD_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.6,
      maxTokens: 4096,
    });

    return this.parseProgressiveOverload(response);
  }

  async planDeloadWeek(
    currentPhase: string,
    weeksSinceLastDeload: number,
    averageIntensity: number,
    averageVolume: number,
    fatigueIndicators: string[],
    equipment: EquipmentType[],
  ): Promise<DeloadWeek> {
    const prompt = `Design a deload week protocol:

**Current Training Phase:** ${currentPhase}
**Weeks Since Last Deload:** ${weeksSinceLastDeload}
**Average Intensity:** ${averageIntensity}%
**Average Volume:** ${averageVolume} sets per muscle group per week
**Fatigue Indicators:** ${fatigueIndicators.join(", ")}
**Available Equipment:** ${equipment.join(", ")}

Create a complete deload week with:
1. Reduced volume (30-50% reduction)
2. Reduced intensity (20-40% reduction)
3. Modified exercises (easier variations where appropriate)
4. Focus on movement quality and recovery
5. Include specific recovery modalities
6. Explain the reasoning for each modification

Return as a DeloadWeek JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: DELOAD_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.6,
      maxTokens: 4096,
    });

    return this.parseDeloadWeek(response);
  }

  async breakPlateau(
    exerciseName: string,
    plateauDuration: string,
    currentStats: { weight: number; reps: number; sets: number },
    trainingVariables: {
      volume: number;
      frequency: number;
      intensity: number;
      restPeriods: number;
    },
    goal: FitnessGoal,
    experienceLevel: ExperienceLevel,
    recentChanges: string[],
  ): Promise<PlateauStrategy[]> {
    const prompt = `Analyze and break this training plateau:

**Exercise:** ${exerciseName}
**Plateau Duration:** ${plateauDuration}
**Current Performance:** ${currentStats.weight}kg × ${currentStats.reps} reps × ${currentStats.sets} sets

**Training Variables:**
- Weekly Volume: ${trainingVariables.volume} sets
- Frequency: ${trainingVariables.frequency}x per week
- Intensity: ${trainingVariables.intensity}%
- Rest Periods: ${trainingVariables.restPeriods}s

**Goal:** ${goal}
**Experience:** ${experienceLevel}
**Recent Changes:** ${recentChanges.join("; ") || "None"}

Provide 4-6 targeted strategies to break through this plateau. Each strategy should include:
1. Clear strategy name and description
2. Step-by-step implementation plan
3. Expected duration of the strategy
4. Expected outcome with timeline
5. Risk assessment
6. Which exercises this applies to

Consider:
- Exercise variation and substitution
- Training variable manipulation
- Recovery optimization
- Technique refinement
- Mental approach
- Nutritional factors

Return as an array of PlateauStrategy JSON objects.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: PLATEAU_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.7,
      maxTokens: 6144,
    });

    return this.parsePlateauStrategies(response);
  }

  async generatePeriodization(
    goal: FitnessGoal,
    totalWeeks: number,
    experienceLevel: ExperienceLevel,
    maxFrequency: number,
    equipment: EquipmentType[],
    periodizationType: PeriodizationType,
  ): Promise<WorkoutPlan> {
    const prompt = `Design a complete ${totalWeeks}-week periodized training program:

**Primary Goal:** ${goal}
**Experience Level:** ${experienceLevel}
**Training Frequency:** Up to ${maxFrequency}x per week
**Equipment:** ${equipment.join(", ")}
**Periodization Type:** ${periodizationType}

Design the complete periodization structure:
1. Phase breakdown (accumulation, intensification, realization, deload)
2. Weekly progression within each phase
3. Volume and intensity undulation
4. Exercise selection evolution across phases
5. Specific mesocycle goals
6. Transition between phases
7. Peak/taper if applicable

For each week include:
- Phase designation
- Workout split and exercises
- Volume/intensity multipliers
- Deload indicators

Return as a complete WorkoutPlan JSON object with all weeks detailed.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: WORKOUT_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.7,
      maxTokens: 12288,
    });

    return this.parseWorkoutPlan(response);
  }

  // ---- Private parsing helpers -------------------------------------------

  private parseWorkoutPlan(response: AICompletionResponse): WorkoutPlan {
    try {
      const cleaned = this.extractJSON(response.content);
      return WorkoutPlanSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse workout plan from AI response: ${response.content.slice(0, 200)}`);
    }
  }

  private parseWorkout(response: AICompletionResponse): Workout {
    try {
      const cleaned = this.extractJSON(response.content);
      return WorkoutSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse workout from AI response: ${response.content.slice(0, 200)}`);
    }
  }

  private parseProgressiveOverload(response: AICompletionResponse): ProgressiveOverloadSuggestion[] {
    try {
      const cleaned = this.extractJSON(response.content);
      const parsed = JSON.parse(cleaned);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.map((item: unknown) => ProgressiveOverloadSuggestionSchema.parse(item));
    } catch {
      throw new Error(`Failed to parse progressive overload suggestions: ${response.content.slice(0, 200)}`);
    }
  }

  private parseDeloadWeek(response: AICompletionResponse): DeloadWeek {
    try {
      const cleaned = this.extractJSON(response.content);
      return DeloadWeekSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse deload week: ${response.content.slice(0, 200)}`);
    }
  }

  private parsePlateauStrategies(response: AICompletionResponse): PlateauStrategy[] {
    try {
      const cleaned = this.extractJSON(response.content);
      const parsed = JSON.parse(cleaned);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.map((item: unknown) => PlateauStrategySchema.parse(item));
    } catch {
      throw new Error(`Failed to parse plateau strategies: ${response.content.slice(0, 200)}`);
    }
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

export function getWorkoutGenerator(client?: AIClient): WorkoutGenerator {
  return new WorkoutGenerator(client);
}
