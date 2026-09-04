import { z } from "zod";
import { type AIClient, getAIClient, type AICompletionResponse } from "./provider";

// ---------------------------------------------------------------------------
// Types & Schemas
// ---------------------------------------------------------------------------

export const TrainingGoalSchema = z.enum([
  "powerlifting",
  "bodybuilding",
  "marathon",
  "half_marathon",
  "5k",
  "10k",
  "crossfit",
  "strongman",
  "general_fitness",
  "sport_specific",
  "rehabilitation",
]);
export type TrainingGoal = z.infer<typeof TrainingGoalSchema>;

export const PeriodizationModelSchema = z.enum([
  "linear",
  "undulating_daily",
  "undulating_weekly",
  "block",
  "conjugate",
  "auto_regulated",
  "hybrid",
]);
export type PeriodizationModel = z.infer<typeof PeriodizationModelSchema>;

export const TrainingPhaseSchema = z.enum([
  "anatomical_adaptation",
  "hypertrophy",
  "strength",
  "power",
  "peaking",
  "taper",
  "deload",
  "maintenance",
  "rehabilitation",
  "base_building",
  "build",
  "specialization",
  "competition_prep",
]);
export type TrainingPhase = z.infer<typeof TrainingPhaseSchema>;

export const CompetitionTypeSchema = z.enum([
  "powerlifting_meet",
  "bodybuilding_show",
  "marathon_race",
  "crossfit_competition",
  "strongman_event",
  "triathlon",
  "other",
]);
export type CompetitionType = z.infer<typeof CompetitionTypeSchema>;

export const WeeklyScheduleSchema = z.object({
  day: z.string(),
  phase: TrainingPhaseSchema,
  workoutType: z.string(),
  targetMuscles: z.array(z.string()),
  estimatedDuration: z.number(),
  intensity: z.number().min(0).max(100),
  volume: z.number().int().positive(),
  keyExercise: z.string().optional(),
  notes: z.string().optional(),
});
export type WeeklySchedule = z.infer<typeof WeeklyScheduleSchema>;

export const MesocycleSchema = z.object({
  name: z.string(),
  phase: TrainingPhaseSchema,
  durationWeeks: z.number().int().positive(),
  weeklySchedule: z.array(WeeklyScheduleSchema),
  volumeStart: z.number(),
  volumeEnd: z.number(),
  intensityStart: z.number(),
  intensityEnd: z.number(),
  goals: z.array(z.string()),
  keyExercises: z.array(z.string()),
  benchmarks: z.array(z.string()),
  deloadIncluded: z.boolean(),
});
export type Mesocycle = z.infer<typeof MesocycleSchema>;

export const TrainingPlanSchema = z.object({
  name: z.string(),
  description: z.string(),
  goal: TrainingGoalSchema,
  durationWeeks: z.number().int().positive(),
  periodizationModel: PeriodizationModelSchema,
  mesocycles: z.array(MesocycleSchema),
  weeklyVolume: z.number().int().positive(),
  peakWeek: z.number().int().positive().optional(),
  competitionDate: z.string().optional(),
  prerequisites: z.array(z.string()),
  equipment: z.array(z.string()),
  notes: z.array(z.string()),
});
export type TrainingPlan = z.infer<typeof TrainingPlanSchema>;

export const RehabilitationProgramSchema = z.object({
  name: z.string(),
  injuryType: z.string(),
  severity: z.enum(["mild", "moderate", "severe"]),
  durationWeeks: z.number().int().positive(),
  phases: z.array(
    z.object({
      name: z.string(),
      duration: z.string(),
      goals: z.array(z.string()),
      exercises: z.array(
        z.object({
          name: z.string(),
          sets: z.number(),
          reps: z.string(),
          frequency: z.string(),
          intensity: z.string(),
          notes: z.string(),
        }),
      ),
      restrictions: z.array(z.string()),
      progressCriteria: z.array(z.string()),
    }),
  ),
  returnToSportCriteria: z.array(z.string()),
  medicalDisclaimers: z.array(z.string()),
});
export type RehabilitationProgram = z.infer<typeof RehabilitationProgramSchema>;

export const CompetitionPrepSchema = z.object({
  competitionType: CompetitionTypeSchema,
  competitionDate: string,
  currentLevel: z.string(),
  targetGoal: z.string(),
  weeksOut: z.number(),
  macrocycle: z.object({
    overview: z.string(),
    phases: z.array(z.object({
      name: z.string(),
      weeks: z.string(),
      focus: z.string(),
      volume: z.string(),
      intensity: z.string(),
    })),
  }),
  peakingProtocol: z.object({
    description: z.string(),
    keyLifts: z.array(z.string()),
    taperStrategy: z.string(),
    weightManipulation: z.string().optional(),
    nutritionProtocol: z.string(),
    mentalPreparation: z.array(z.string()),
  }),
  competitionDayPlan: z.object({
    warmUp: z.string(),
    attemptSelection: z.array(z.string()),
    nutrition: z.string(),
    mentalCues: z.array(z.string()),
  }),
  riskFactors: z.array(z.string()),
});
export type CompetitionPrep = z.infer<typeof CompetitionPrepSchema>;

export const AdaptiveAdjustmentSchema = z.object({
  originalPlan: z.string(),
  reason: z.string(),
  adjustments: z.array(
    z.object({
      parameter: z.string(),
      originalValue: z.string(),
      newValue: z.string(),
      reasoning: z.string(),
    }),
  ),
  expectedImpact: z.string(),
  followUpDate: z.string(),
  riskAssessment: z.enum(["low", "medium", "high"]),
});
export type AdaptiveAdjustment = z.infer<typeof AdaptiveAdjustmentSchema>;

export const GenerateTrainingPlanRequestSchema = z.object({
  goal: TrainingGoalSchema,
  durationWeeks: z.number().int().min(2).max(52),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced", "elite"]),
  availableEquipment: z.array(z.string()).min(1),
  trainingDaysPerWeek: z.number().int().min(2).max(7),
  sessionDurationMinutes: z.number().int().min(20).max(240),
  periodizationModel: PeriodizationModelSchema.optional(),
  competitionDate: z.string().optional(),
  injuryHistory: z.array(z.string()).optional(),
  currentMaxes: z
    .object({
      squat: z.number().optional(),
      bench: z.number().optional(),
      deadlift: z.number().optional(),
      overheadPress: z.number().optional(),
    })
    .optional(),
  specificRequirements: z.array(z.string()).optional(),
});
export type GenerateTrainingPlanRequest = z.infer<typeof GenerateTrainingPlanRequestSchema>;

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const TRAINING_PLAN_SYSTEM_PROMPT = `You are a master programming specialist with expertise across all strength and endurance disciplines.
Your programming knowledge encompasses:
- Powerlifting periodization (IPF/IPPA standards)
- Bodybuilding contest prep and off-season
- Marathon/ultramarathon periodization
- CrossFit competition programming
- Strongman event preparation
- Sport-specific athletic development
- Rehabilitation and return-to-sport

Key programming principles:
1. Specificity and transfer of training
2. Progressive overload within recoverable limits
3. Individual variation in recovery capacity
4. Fatigue management and supercompensation
5. Peaking and tapering for competition
6. Minimum effective dose for adaptation
7. Long-term athletic development models

Always provide evidence-based programming with clear rationale.
Consider both short-term and long-term athlete development.`;

const REHAB_SYSTEM_PROMPT = `You are a physiotherapist and strength coach specializing in rehabilitation.
You understand:
- Tissue healing timelines
- Load management during recovery
- Progressive return-to-function protocols
- Return-to-sport testing criteria
- Pain science and modified training
- Common injury mechanisms and prevention

Always include medical disclaimers.
Never prescribe exercises that could aggravate injuries.
Prioritize patient safety and evidence-based practice.`;

const COMPETITION_SYSTEM_PROMPT = `You are a competition preparation coach with proven results.
You understand:
- Attempt selection strategy
- Weight class manipulation
- Peak performance timing
- Mental preparation techniques
- Competition-day logistics
- Nutrition periodization for competition
- Taper protocols for various sports

Provide detailed, actionable competition preparation plans.
Include contingencies and risk mitigation strategies.`;

// ---------------------------------------------------------------------------
// Training Plan Generator
// ---------------------------------------------------------------------------

export class TrainingPlanGenerator {
  private client: AIClient;

  constructor(client?: AIClient) {
    this.client = client ?? getAIClient();
  }

  async generateTrainingPlan(request: GenerateTrainingPlanRequest): Promise<TrainingPlan> {
    const validated = GenerateTrainingPlanRequestSchema.parse(request);

    const prompt = `Design a comprehensive ${validated.durationWeeks}-week training program:

**Goal:** ${validated.goal}
**Experience Level:** ${validated.experienceLevel}
**Available Equipment:** ${validated.availableEquipment.join(", ")}
**Training Days Per Week:** ${validated.trainingDaysPerWeek}
**Session Duration:** ${validated.sessionDurationMinutes} minutes
**Periodization Model:** ${validated.periodizationModel ?? "auto-select optimal"}
**Competition Date:** ${validated.competitionDate ?? "None"}
**Injury History:** ${validated.injuryHistory?.join(", ") || "None"}
**Current Maxes:** ${validated.currentMaxes ? JSON.stringify(validated.currentMaxes) : "Not provided"}
**Specific Requirements:** ${validated.specificRequirements?.join(", ") || "None"}

Requirements:
1. Design complete mesocycle structure for ${validated.durationWeeks} weeks
2. Include all training phases appropriate for the goal
3. Provide weekly schedule with specific workout types
4. Set volume and intensity progressions for each phase
5. Include deload weeks at appropriate intervals
6. Specify key exercises and progression schemes
7. Provide benchmarks for phase advancement
8. Include prerequisites and equipment requirements

For powerlifting: Include squat, bench, deadlift specialization with peaking
For bodybuilding: Include volume progression and contest prep if applicable
For marathon: Include base, build, peak, and taper phases
For general fitness: Include balanced development across all fitness domains

Return as a complete TrainingPlan JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: TRAINING_PLAN_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.7,
      maxTokens: 12288,
    });

    return this.parseTrainingPlan(response);
  }

  async generate4WeekPlan(
    goal: TrainingGoal,
    experienceLevel: string,
    equipment: string[],
    daysPerWeek: number,
  ): Promise<TrainingPlan> {
    const prompt = `Create a focused 4-week training program:

**Goal:** ${goal}
**Experience:** ${experienceLevel}
**Equipment:** ${equipment.join(", ")}
**Days Per Week:** ${daysPerWeek}

4-week plan requirements:
1. Week 1: Foundation/introduction
2. Week 2: Build/intensification
3. Week 3: Peak/overreach
4. Week 4: Deload/recovery

Each week should include:
- Daily workout breakdown
- Volume and intensity specifications
- Progressive overload within the week
- Recovery strategies

Return as a complete TrainingPlan JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: TRAINING_PLAN_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.7,
      maxTokens: 8192,
    });

    return this.parseTrainingPlan(response);
  }

  async generate8WeekPlan(
    goal: TrainingGoal,
    experienceLevel: string,
    equipment: string[],
    daysPerWeek: number,
    currentMaxes?: { squat?: number; bench?: number; deadlift?: number },
  ): Promise<TrainingPlan> {
    const maxesInfo = currentMaxes
      ? `\nCurrent Maxes: Squat ${currentMaxes.squat ?? "N/A"}kg, Bench ${currentMaxes.bench ?? "N/A"}kg, Deadlift ${currentMaxes.deadlift ?? "N/A"}kg`
      : "";

    const prompt = `Design a comprehensive 8-week training program:

**Goal:** ${goal}
**Experience:** ${experienceLevel}
**Equipment:** ${equipment.join(", ")}
**Days Per Week:** ${daysPerWeek}
${maxesInfo}

8-week periodization:
- Weeks 1-2: Anatomical adaptation / volume accumulation
- Weeks 3-4: Hypertrophy / strength foundation
- Weeks 5-6: Strength / intensification
- Weeks 7-8: Peaking / realization with deload

Include:
- Detailed weekly programming
- Exercise selection and substitution options
- Volume load calculations
- RPE/RIR targets
- Benchmark lifts and progressions
- Recovery protocols between sessions

Return as a complete TrainingPlan JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: TRAINING_PLAN_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.7,
      maxTokens: 10240,
    });

    return this.parseTrainingPlan(response);
  }

  async generate12WeekPlan(
    goal: TrainingGoal,
    experienceLevel: string,
    equipment: string[],
    daysPerWeek: number,
    currentMaxes?: { squat?: number; bench?: number; deadlift?: number },
  ): Promise<TrainingPlan> {
    const maxesInfo = currentMaxes
      ? `\nCurrent Maxes: Squat ${currentMaxes.squat ?? "N/A"}kg, Bench ${currentMaxes.bench ?? "N/A"}kg, Deadlift ${currentMaxes.deadlift ?? "N/A"}kg`
      : "";

    const prompt = `Design a comprehensive 12-week training program:

**Goal:** ${goal}
**Experience:** ${experienceLevel}
**Equipment:** ${equipment.join(", ")}
**Days Per Week:** ${daysPerWeek}
${maxesInfo}

12-week periodization structure:
- Weeks 1-3: Accumulation (volume focus, moderate intensity)
- Weeks 4-6: Transmutation (mixed volume/intensity)
- Weeks 7-9: Realization (intensity focus, reduced volume)
- Weeks 10-12: Peaking/competition prep

For each mesocycle:
1. Detailed weekly schedule with workout types
2. Volume and intensity prescriptions
3. Key lifts and accessory work
4. Progression criteria between phases
5. Deload placement and protocol
6. Recovery and mobility integration

Return as a complete TrainingPlan JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: TRAINING_PLAN_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.7,
      maxTokens: 12288,
    });

    return this.parseTrainingPlan(response);
  }

  async designRehabilitationProgram(
    injuryType: string,
    severity: "mild" | "moderate" | "severe",
    affectedArea: string,
    medicalClearance: boolean,
    preInjuryActivity: string,
    goals: string[],
  ): Promise<RehabilitationProgram> {
    const prompt = `Design a rehabilitation program for:

**Injury:** ${injuryType}
**Severity:** ${severity}
**Affected Area:** ${affectedArea}
**Medical Clearance:** ${medicalClearance ? "Yes" : "No - consult physician first"}
**Pre-Injury Activity:** ${preInjuryActivity}
**Goals:** ${goals.join(", ")}

Program requirements:
1. Phase-based progression (acute → sub-acute → functional → return-to-sport)
2. Each phase must have clear goals, exercises, and progression criteria
3. Include:
   - Pain management strategies
   - Mobility restoration exercises
   - Progressive loading protocols
   - Stability and balance training
   - Functional movement integration
   - Sport-specific drills
4. Specify sets, reps, frequency, and intensity for each exercise
5. Include restrictions and contraindications
6. Provide clear criteria for phase advancement
7. Include return-to-sport testing criteria

CRITICAL: Include medical disclaimers and emphasize the importance of professional medical guidance.

Return as a RehabilitationProgram JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: REHAB_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.5,
      maxTokens: 8192,
    });

    return this.parseRehabilitationProgram(response);
  }

  async designCompetitionPrep(
    competitionType: CompetitionType,
    competitionDate: string,
    currentLevel: string,
    targetGoal: string,
    weeksOut: number,
  ): Promise<CompetitionPrep> {
    const prompt = `Design a competition preparation plan:

**Competition:** ${competitionType}
**Date:** ${competitionDate}
**Current Level:** ${currentLevel}
**Target Goal:** ${targetGoal}
**Weeks Out:** ${weeksOut}

Include:
1. Macrocycle overview with phase breakdown
2. Peaking protocol specific to ${competitionType}
3. Taper strategy and timeline
4. Weight manipulation if applicable (cutting/making weight)
5. Nutrition periodization for competition
6. Mental preparation strategies
7. Competition-day plan (warm-up, attempts, nutrition, mental cues)
8. Risk factors and contingencies

For powerlifting: Include attempt selection strategy and weight class considerations
For bodybuilding: Include peak week protocol and posing practice
For marathon: Include long run progression and race day nutrition
For CrossFit: Include skill work and conditioning progression

Return as a CompetitionPrep JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: COMPETITION_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.6,
      maxTokens: 8192,
    });

    return this.parseCompetitionPrep(response);
  }

  async adaptTrainingPlan(
    currentPlan: TrainingPlan,
    recentPerformance: {
      completedWorkouts: number;
      missedWorkouts: number;
      averageRPE: number;
      averageSleep: number;
      stressLevel: number;
      bodyweightTrend: "gaining" | "losing" | "stable";
      motivation: number;
    },
    reason: string,
    goals: string[],
  ): Promise<AdaptiveAdjustment> {
    const prompt = `Adapt this training plan based on recent performance:

**Current Plan:** ${currentPlan.name} - Week ${currentPlan.mesocycles.length} of ${currentPlan.durationWeeks}
**Reason for Adaptation:** ${reason}
**Goals:** ${goals.join(", ")}

**Recent Performance Data:**
- Completed Workouts: ${recentPerformance.completedWorkouts}
- Missed Workouts: ${recentPerformance.missedWorkouts}
- Average RPE: ${recentPerformance.averageRPE}
- Average Sleep: ${recentPerformance.averageSleep} hours
- Stress Level: ${recentPerformance.stressLevel}/10
- Bodyweight Trend: ${recentPerformance.bodyweightTrend}
- Motivation: ${recentPerformance.motivation}/10

Analyze the data and provide:
1. Specific adjustments to training parameters
2. Reasoning based on recovery science
3. Expected impact of changes
4. Follow-up assessment date
5. Risk assessment of modifications

Consider:
- Fatigue management
- Recovery capacity
- Motivation preservation
- Long-term goal alignment
- Individual response patterns

Return as an AdaptiveAdjustment JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: TRAINING_PLAN_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.6,
      maxTokens: 4096,
    });

    return this.parseAdaptiveAdjustment(response);
  }

  // ---- Private parsing helpers -------------------------------------------

  private parseTrainingPlan(response: AICompletionResponse): TrainingPlan {
    try {
      const cleaned = this.extractJSON(response.content);
      return TrainingPlanSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse training plan: ${response.content.slice(0, 200)}`);
    }
  }

  private parseRehabilitationProgram(response: AICompletionResponse): RehabilitationProgram {
    try {
      const cleaned = this.extractJSON(response.content);
      return RehabilitationProgramSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse rehabilitation program: ${response.content.slice(0, 200)}`);
    }
  }

  private parseCompetitionPrep(response: AICompletionResponse): CompetitionPrep {
    try {
      const cleaned = this.extractJSON(response.content);
      return CompetitionPrepSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse competition prep: ${response.content.slice(0, 200)}`);
    }
  }

  private parseAdaptiveAdjustment(response: AICompletionResponse): AdaptiveAdjustment {
    try {
      const cleaned = this.extractJSON(response.content);
      return AdaptiveAdjustmentSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse adaptive adjustment: ${response.content.slice(0, 200)}`);
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

export function getTrainingPlanGenerator(client?: AIClient): TrainingPlanGenerator {
  return new TrainingPlanGenerator(client);
}
