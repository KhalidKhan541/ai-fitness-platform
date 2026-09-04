import { z } from "zod";
import { type AIClient, getAIClient, type AICompletionResponse } from "./provider";

// ---------------------------------------------------------------------------
// Types & Schemas
// ---------------------------------------------------------------------------

export const MetricTypeSchema = z.enum([
  "weight",
  "body_fat_percent",
  "lean_mass",
  "waist",
  "chest",
  "arms",
  "thighs",
  "calves",
  "shoulders",
  "neck",
  "hip",
  "one_rep_max",
  "reps_at_weight",
  "total_volume",
  "session_rpe",
  "sleep_hours",
  "sleep_quality",
  "energy_level",
  "mood",
  "stress_level",
  "heart_rate_resting",
  "heart_rate_variability",
  "calories_consumed",
  "protein_intake",
  "water_intake",
]);
export type MetricType = z.infer<typeof MetricTypeSchema>;

export const TrendDirectionSchema = z.enum(["improving", "declining", "plateaued", "variable", "insufficient_data"]);
export type TrendDirection = z.infer<typeof TrendDirectionSchema>;

export const GoalStatusSchema = z.enum(["on_track", "ahead", "behind", "stalled", "achieved", "needs_adjustment"]);
export type GoalStatus = z.infer<typeof GoalStatusSchema>;

export const DataPointSchema = z.object({
  date: z.string(),
  value: z.number(),
  notes: z.string().optional(),
  context: z.record(z.string()).optional(),
});
export type DataPoint = z.infer<typeof DataPointSchema>;

export const ConsistencyAnalysisSchema = z.object({
  overallScore: z.number().min(0).max(100),
  workoutFrequency: z.object({
    target: z.number(),
    actual: z.number(),
    consistency: z.number(),
  }),
  nutritionConsistency: z.number().min(0).max(100),
  sleepConsistency: z.number().min(0).max(100),
  hydrationConsistency: z.number().min(0).max(100),
  streaks: z.object({
    currentWorkoutStreak: z.number().int(),
    longestWorkoutStreak: z.number().int(),
    currentNutritionStreak: z.number().int(),
    longestNutritionStreak: z.number().int(),
  }),
  patterns: z.array(z.string()),
  recommendations: z.array(z.string()),
});
export type ConsistencyAnalysis = z.infer<typeof ConsistencyAnalysisSchema>;

export const StrengthProgressionSchema = z.object({
  exercise: z.string(),
  oneRepMaxEstimate: z.number(),
  oneRepMaxTrend: TrendDirectionSchema,
  volumeLoad: z.number(),
  volumeTrend: TrendDirectionSchema,
  estimatedTrue1RM: z.number(),
  strengthLevel: z.enum(["novice", "beginner", "intermediate", "advanced", "elite"]),
  progressionRate: z.number(),
  plateauRisk: z.enum(["low", "medium", "high"]),
  recommendations: z.array(z.string()),
  historicalData: z.array(DataPointSchema),
});
export type StrengthProgression = z.infer<typeof StrengthProgressionSchema>;

export const BodyCompositionTrendSchema = z.object({
  metric: MetricTypeSchema,
  currentValue: z.number(),
  previousValue: z.number().optional(),
  change: z.number(),
  changePercent: z.number(),
  trend: TrendDirectionSchema,
  movingAverage7Day: z.number().optional(),
  movingAverage30Day: z.number().optional(),
  projectedValue: z.number().optional(),
  projectionDate: z.string().optional(),
  healthyRange: z.object({ min: z.number(), max: z.number() }).optional(),
  assessment: z.string(),
});
export type BodyCompositionTrend = z.infer<typeof BodyCompositionTrendSchema>;

export const GoalProgressSchema = z.object({
  goalType: z.string(),
  goalDescription: z.string(),
  startDate: z.string(),
  targetDate: z.string().optional(),
  currentValue: z.number(),
  targetValue: z.number(),
  unit: z.string(),
  progressPercent: z.number(),
  status: GoalStatusSchema,
  trajectory: z.string(),
  daysRemaining: z.number().optional(),
  projectedCompletionDate: z.string().optional(),
  adjustmentNeeded: z.boolean(),
  recommendations: z.array(z.string()),
});
export type GoalProgress = z.infer<typeof GoalProgressSchema>;

export const PlateauDetectionSchema = z.object({
  metric: z.string(),
  plateauDetected: z.boolean(),
  plateauDuration: z.string(),
  plateauStart: z.string().optional(),
  statisticalSignificance: z.number(),
  possibleCauses: z.array(z.string()),
  breakingStrategies: z.array(
    z.object({
      strategy: z.string(),
      description: z.string(),
      expectedDuration: z.string(),
      riskLevel: z.enum(["low", "medium", "high"]),
      priority: z.number().int().positive(),
    }),
  ),
  relatedMetrics: z.array(z.string()),
});
export type PlateauDetection = z.infer<typeof PlateauDetectionSchema>;

export const RecommendationSchema = z.object({
  category: z.enum([
    "training",
    "nutrition",
    "recovery",
    "sleep",
    "stress",
    "hydration",
    "supplementation",
    "technique",
    "mindset",
  ]),
  priority: z.enum(["critical", "high", "medium", "low"]),
  title: z.string(),
  description: z.string(),
  actionItems: z.array(z.string()),
  expectedOutcome: z.string(),
  timeframe: z.string(),
  confidence: z.number().min(0).max(1),
  basedOnData: z.array(z.string()),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const AnalyzeProgressRequestSchema = z.object({
  userId: z.string(),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
  metrics: z.array(MetricTypeSchema),
  workouts: z.array(
    z.object({
      date: z.string(),
      exercise: z.string(),
      sets: z.array(
        z.object({
          weight: z.number(),
          reps: z.number(),
          rpe: z.number().optional(),
        }),
      ),
      durationMinutes: z.number(),
      overallRPE: z.number().optional(),
    }),
  ).optional(),
  bodyMeasurements: z.array(
    z.object({
      date: z.string(),
      weight: z.number().optional(),
      bodyFatPercent: z.number().optional(),
      waist: z.number().optional(),
      chest: z.number().optional(),
      arms: z.number().optional(),
      thighs: z.number().optional(),
    }),
  ).optional(),
  nutritionData: z.array(
    z.object({
      date: z.string(),
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
    }),
  ).optional(),
  sleepData: z.array(
    z.object({
      date: z.string(),
      hours: z.number(),
      quality: z.number().min(1).max(10),
    }),
  ).optional(),
  goals: z.array(
    z.object({
      type: z.string(),
      description: z.string(),
      targetValue: z.number(),
      unit: z.string(),
      startDate: z.string(),
      targetDate: z.string().optional(),
    }),
  ).optional(),
});
export type AnalyzeProgressRequest = z.infer<typeof AnalyzeProgressRequestSchema>;

export const ProgressAnalysisSchema = z.object({
  userId: z.string(),
  analysisDate: z.string(),
  dateRange: z.object({ start: z.string(), end: z.string() }),
  consistency: ConsistencyAnalysisSchema,
  strengthProgressions: z.array(StrengthProgressionSchema),
  bodyCompositionTrends: z.array(BodyCompositionTrendSchema),
  goalProgress: z.array(GoalProgressSchema),
  plateausDetected: z.array(PlateauDetectionSchema),
  recommendations: z.array(RecommendationSchema),
  overallAssessment: z.string(),
  highlights: z.array(z.string()),
  concerns: z.array(z.string()),
  nextReviewDate: z.string(),
});
export type ProgressAnalysis = z.infer<typeof ProgressAnalysisSchema>;

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const PROGRESS_SYSTEM_PROMPT = `You are a data-driven performance analyst specializing in fitness and athletic performance.
Your expertise includes:
- Statistical analysis of training data
- Trend detection and projection
- Plateau identification and root cause analysis
- Goal trajectory assessment
- Evidence-based recommendation generation
- Body composition analysis
- Strength standard assessment

You use:
- Moving averages and trend analysis
- Standard deviation for consistency measurement
- Regression analysis for projections
- Strength standards from peer-reviewed sources
- Established fitness benchmarks

Always provide data-backed insights with clear reasoning.
Quantify everything possible and avoid vague recommendations.`;

const RECOMMENDATION_SYSTEM_PROMPT = `You are an intelligent recommendation engine for fitness optimization.
Your recommendations are:
1. Data-driven (based on actual user data)
2. Prioritized (critical > high > medium > low)
3. Actionable (specific steps, not vague advice)
4. Time-bound (with expected outcomes and timeframes)
5. Evidence-based (supported by research)
6. Personalized (considering individual context)

Consider the interaction between training, nutrition, recovery, and lifestyle factors.
Never recommend drastic changes without clear justification.`;

// ---------------------------------------------------------------------------
// Progress Analyzer
// ---------------------------------------------------------------------------

export class ProgressAnalyzer {
  private client: AIClient;

  constructor(client?: AIClient) {
    this.client = client ?? getAIClient();
  }

  async analyzeProgress(request: AnalyzeProgressRequest): Promise<ProgressAnalysis> {
    const validated = AnalyzeProgressRequestSchema.parse(request);

    const prompt = `Perform a comprehensive progress analysis:

**User:** ${validated.userId}
**Date Range:** ${validated.dateRange.start} to ${validated.dateRange.end}
**Metrics Tracked:** ${validated.metrics.join(", ")}

**Workout Data:** ${validated.workouts ? `${validated.workouts.length} sessions` : "Not provided"}
${validated.workouts?.slice(0, 20).map((w) => `  ${w.date}: ${w.exercise} - ${w.sets.map((s) => `${s.weight}kg×${s.reps}`).join(", ")} (RPE: ${w.overallRPE ?? "N/A"})`).join("\n") || "  No workout data"}

**Body Measurements:** ${validated.bodyMeasurements ? `${validated.bodyMeasurements.length} entries` : "Not provided"}
${validated.bodyMeasurements?.slice(-10).map((m) => `  ${m.date}: Weight ${m.weight ?? "N/A"}kg, BF ${m.bodyFatPercent ?? "N/A"}%, Waist ${m.waist ?? "N/A"}cm`).join("\n") || "  No body measurement data"}

**Nutrition:** ${validated.nutritionData ? `${validated.nutritionData.length} days` : "Not provided"}
${validated.nutritionData?.slice(-10).map((n) => `  ${n.date}: ${n.calories}cal, P${n.protein}g C${n.carbs}g F${n.fat}g`).join("\n") || "  No nutrition data"}

**Sleep:** ${validated.sleepData ? `${validated.sleepData.length} days` : "Not provided"}
${validated.sleepData?.slice(-10).map((s) => `  ${s.date}: ${s.hours}h quality ${s.quality}/10`).join("\n") || "  No sleep data"}

**Goals:** ${validated.goals?.map((g) => `${g.description}: ${g.targetValue}${g.unit} by ${g.targetDate ?? "no deadline"}`).join("; ") || "None set"}

Analyze:
1. Consistency across all tracked metrics
2. Strength progression for key lifts
3. Body composition trends
4. Goal trajectory and likelihood of achievement
5. Plateau detection across all metrics
6. Generate prioritized recommendations

Return as a complete ProgressAnalysis JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: PROGRESS_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.4,
      maxTokens: 12288,
    });

    return this.parseProgressAnalysis(response);
  }

  async analyzeWorkoutConsistency(
    workouts: Array<{ date: string; durationMinutes: number; rpe?: number }>,
    targetFrequency: number,
    dateRange: { start: string; end: string },
  ): Promise<ConsistencyAnalysis> {
    const workoutSummary = workouts.slice(-30).map((w) => `  ${w.date}: ${w.durationMinutes}min (RPE: ${w.rpe ?? "N/A"})`).join("\n");

    const prompt = `Analyze workout consistency:

**Target Frequency:** ${targetFrequency} sessions per week
**Date Range:** ${dateRange.start} to ${dateRange.end}
**Actual Workouts:** ${workouts.length} sessions

**Recent Sessions:**
${workoutSummary || "  No workout data"}

Calculate:
1. Overall consistency score (0-100)
2. Actual vs target workout frequency
3. Workout streaks (current and longest)
4. Patterns (preferred training days, time of day, etc.)
5. Drop-off points and triggers
6. Consistency improvement recommendations

Return as a ConsistencyAnalysis JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: PROGRESS_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.4,
      maxTokens: 4096,
    });

    return this.parseConsistencyAnalysis(response);
  }

  async analyzeStrengthProgression(
    exercise: string,
    historicalData: Array<{ date: string; weight: number; reps: number; rpe?: number }>,
    bodyWeight: number,
    sex: "male" | "female",
    experienceYears: number,
  ): Promise<StrengthProgression> {
    const dataStr = historicalData.slice(-20).map((d) => `  ${d.date}: ${d.weight}kg × ${d.reps} reps (RPE: ${d.rpe ?? "N/A"})`).join("\n");

    const prompt = `Analyze strength progression for ${exercise}:

**Body Weight:** ${bodyWeight}kg
**Sex:** ${sex}
**Training Experience:** ${experienceYears} years

**Historical Data:**
${dataStr}

Analyze:
1. Estimated 1RM and trend over time
2. Volume load progression
3. Strength level classification (novice → elite based on strength standards)
4. Rate of progression
5. Plateau risk assessment
6. Projected future performance
7. Recommendations for continued progression

Use established strength standards (e.g., ExRx,StrengthLevel.com) for classification.

Return as a StrengthProgression JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: PROGRESS_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.4,
      maxTokens: 4096,
    });

    return this.parseStrengthProgression(response);
  }

  async analyzeBodyComposition(
    measurements: Array<{
      date: string;
      weight?: number;
      bodyFatPercent?: number;
      waist?: number;
      chest?: number;
      arms?: number;
      thighs?: number;
    }>,
    height: number,
    sex: "male" | "female",
    age: number,
  ): Promise<BodyCompositionTrend[]> {
    const dataStr = measurements.slice(-15).map((m) =>
      `  ${m.date}: W${m.weight ?? "N/A"}kg BF${m.bodyFatPercent ?? "N/A"}% Waist${m.waist ?? "N/A"}cm`,
    ).join("\n");

    const prompt = `Analyze body composition trends:

**Profile:** ${sex}, ${age} years, ${height}cm

**Measurement History:**
${dataStr}

Analyze each tracked metric:
1. Current value and change from baseline
2. Trend direction with statistical confidence
3. 7-day and 30-day moving averages
4. Rate of change
5. Healthy range comparison
6. Future projection (if trend continues)
7. Assessment of progress

Return as an array of BodyCompositionTrend JSON objects.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: PROGRESS_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.4,
      maxTokens: 4096,
    });

    return this.parseBodyCompositionTrends(response);
  }

  async assessGoalProgress(
    goals: Array<{
      type: string;
      description: string;
      currentValue: number;
      targetValue: number;
      unit: string;
      startDate: string;
      targetDate?: string;
    }>,
    recentTrends: string[],
  ): Promise<GoalProgress[]> {
    const goalsStr = goals.map((g) =>
      `  ${g.description}: Current ${g.currentValue}${g.unit}, Target ${g.targetValue}${g.unit}, Started ${g.startDate}${g.targetDate ? `, Deadline ${g.targetDate}` : ""}`,
    ).join("\n");

    const prompt = `Assess goal progress for:

**Goals:**
${goalsStr}

**Recent Trends:** ${recentTrends.join("; ") || "None provided"}

For each goal, calculate and provide:
1. Progress percentage
2. Status (on_track, ahead, behind, stalled, achieved, needs_adjustment)
3. Trajectory analysis (will goal be met by deadline?)
4. Projected completion date (if not stalled)
5. Days remaining (if deadline set)
6. Whether adjustments are needed
7. Specific recommendations for improvement

Return as an array of GoalProgress JSON objects.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: PROGRESS_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.4,
      maxTokens: 4096,
    });

    return this.parseGoalProgress(response);
  }

  async detectPlateaus(
    metrics: Array<{
      metric: string;
      data: Array<{ date: string; value: number }>;
      threshold: number;
    }>,
  ): Promise<PlateauDetection[]> {
    const metricsStr = metrics.map((m) => {
      const values = m.data.slice(-10).map((d) => `${d.date}: ${d.value}`).join(", ");
      return `  ${m.metric} (threshold: ${m.threshold}%): ${values}`;
    }).join("\n");

    const prompt = `Detect plateaus across these metrics:

**Metrics:**
${metricsStr}

For each metric, analyze:
1. Is a plateau statistically significant?
2. Duration of the plateau
3. When it started
4. Statistical significance level
5. Possible causes (consider related metrics)
6. Breaking strategies (prioritized by effectiveness)
7. Related metrics that might explain the plateau

A plateau is defined as less than ${metrics[0]?.threshold ?? 1}% change over 2+ weeks.

Return as an array of PlateauDetection JSON objects.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: PROGRESS_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.4,
      maxTokens: 6144,
    });

    return this.parsePlateauDetections(response);
  }

  async generateRecommendations(
    analysis: ProgressAnalysis,
    userPreferences: {
      trainingDaysPerWeek: number;
      availableEquipment: string[];
      dietaryRestrictions: string[];
      sleepHours: number;
      stressLevel: number;
      motivationLevel: number;
    },
  ): Promise<Recommendation[]> {
    const prompt = `Based on this progress analysis, generate prioritized recommendations:

**Analysis Summary:**
- Consistency Score: ${analysis.consistency.overallScore}/100
- Strength Plateaus: ${analysis.plateausDetected.filter((p) => p.plateauDetected).length}
- Goal Status: ${analysis.goalProgress.map((g) => `${g.goalDescription}: ${g.status}`).join(", ")}

**User Preferences:**
- Training Days: ${userPreferences.trainingDaysPerWeek}/week
- Equipment: ${userPreferences.availableEquipment.join(", ")}
- Dietary Restrictions: ${userPreferences.dietaryRestrictions.join(", ") || "None"}
- Average Sleep: ${userPreferences.sleepHours} hours
- Stress Level: ${userPreferences.stressLevel}/10
- Motivation: ${userPreferences.motivationLevel}/10

Generate 5-8 prioritized recommendations covering:
1. Training adjustments
2. Nutrition optimization
3. Recovery enhancement
4. Sleep improvement
5. Stress management
6. Hydration optimization
7. Supplementation (if needed)
8. Technique/mindset improvements

For each recommendation provide:
- Category and priority
- Specific action items
- Expected outcome
- Timeframe for results
- Confidence level
- Data points that informed this recommendation

Return as an array of Recommendation JSON objects.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: RECOMMENDATION_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.5,
      maxTokens: 6144,
    });

    return this.parseRecommendations(response);
  }

  // ---- Private parsing helpers -------------------------------------------

  private parseProgressAnalysis(response: AICompletionResponse): ProgressAnalysis {
    try {
      const cleaned = this.extractJSON(response.content);
      return ProgressAnalysisSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse progress analysis: ${response.content.slice(0, 200)}`);
    }
  }

  private parseConsistencyAnalysis(response: AICompletionResponse): ConsistencyAnalysis {
    try {
      const cleaned = this.extractJSON(response.content);
      return ConsistencyAnalysisSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse consistency analysis: ${response.content.slice(0, 200)}`);
    }
  }

  private parseStrengthProgression(response: AICompletionResponse): StrengthProgression {
    try {
      const cleaned = this.extractJSON(response.content);
      return StrengthProgressionSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse strength progression: ${response.content.slice(0, 200)}`);
    }
  }

  private parseBodyCompositionTrends(response: AICompletionResponse): BodyCompositionTrend[] {
    try {
      const cleaned = this.extractJSON(response.content);
      const parsed = JSON.parse(cleaned);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.map((item: unknown) => BodyCompositionTrendSchema.parse(item));
    } catch {
      throw new Error(`Failed to parse body composition trends: ${response.content.slice(0, 200)}`);
    }
  }

  private parseGoalProgress(response: AICompletionResponse): GoalProgress[] {
    try {
      const cleaned = this.extractJSON(response.content);
      const parsed = JSON.parse(cleaned);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.map((item: unknown) => GoalProgressSchema.parse(item));
    } catch {
      throw new Error(`Failed to parse goal progress: ${response.content.slice(0, 200)}`);
    }
  }

  private parsePlateauDetections(response: AICompletionResponse): PlateauDetection[] {
    try {
      const cleaned = this.extractJSON(response.content);
      const parsed = JSON.parse(cleaned);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.map((item: unknown) => PlateauDetectionSchema.parse(item));
    } catch {
      throw new Error(`Failed to parse plateau detections: ${response.content.slice(0, 200)}`);
    }
  }

  private parseRecommendations(response: AICompletionResponse): Recommendation[] {
    try {
      const cleaned = this.extractJSON(response.content);
      const parsed = JSON.parse(cleaned);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.map((item: unknown) => RecommendationSchema.parse(item));
    } catch {
      throw new Error(`Failed to parse recommendations: ${response.content.slice(0, 200)}`);
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

export function getProgressAnalyzer(client?: AIClient): ProgressAnalyzer {
  return new ProgressAnalyzer(client);
}
