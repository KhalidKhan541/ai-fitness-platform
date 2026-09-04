import { z } from "zod";
import { type AIClient, getAIClient, type AICompletionResponse } from "./provider";

// ---------------------------------------------------------------------------
// Types & Schemas
// ---------------------------------------------------------------------------

export const InjuryRiskLevelSchema = z.enum(["very_low", "low", "moderate", "high", "very_high"]);
export type InjuryRiskLevel = z.infer<typeof InjuryRiskLevelSchema>;

export const RecoveryStatusSchema = z.enum(["fully_recovered", "mostly_recovered", "partially_recovered", "needs_rest", "overtrained"]);
export type RecoveryStatus = z.infer<typeof RecoveryStatusSchema>;

export const SleepQualitySchema = z.enum(["excellent", "good", "fair", "poor", "very_poor"]);
export type SleepQuality = z.infer<typeof SleepQualitySchema>;

export const StressLevelSchema = z.enum(["minimal", "low", "moderate", "high", "severe"]);
export type StressLevel = z.infer<typeof StressLevelSchema>;

export const InjuryRiskAssessmentSchema = z.object({
  overallRisk: InjuryRiskLevelSchema,
  riskScore: z.number().min(0).max(100),
  riskFactors: z.array(z.object({
    factor: z.string(),
    severity: z.enum(["low", "medium", "high"]),
    contribution: z.number().min(0).max(1),
    mitigation: z.string(),
  })),
  bodyRegionRisks: z.array(z.object({
    region: z.string(),
    risk: InjuryRiskLevelSchema,
    score: z.number(),
    factors: z.array(z.string()),
    preventionStrategies: z.array(z.string()),
  })),
  trainingRecommendations: z.array(z.string()),
  monitoringPlan: z.array(z.string()),
  warningSigns: z.array(z.string()),
  whenToSeekProfessionalHelp: z.array(z.string()),
  reassessmentDate: z.string(),
});
export type InjuryRiskAssessment = z.infer<typeof InjuryRiskAssessmentSchema>;

export const RecoveryRecommendationSchema = z.object({
  currentStatus: RecoveryStatusSchema,
  recoveryScore: z.number().min(0).max(100),
  domains: z.array(z.object({
    name: z.string(),
    score: z.number().min(0).max(100),
    status: z.string(),
    recommendations: z.array(z.string()),
    priority: z.enum(["critical", "high", "medium", "low"]),
  })),
  immediateActions: z.array(z.string()),
  shortTermActions: z.array(z.string()),
  longTermStrategies: z.array(z.string()),
  recoveryModalities: z.array(z.object({
    modality: z.string(),
    evidenceLevel: z.enum(["strong", "moderate", "weak"]),
    timing: z.string(),
    duration: z.string(),
    instructions: z.string(),
  })),
  nextTrainingRecommendation: z.string(),
  estimatedRecoveryTime: z.string(),
});
export type RecoveryRecommendation = z.infer<typeof RecoveryRecommendationSchema>;

export const SleepOptimizationSchema = z.object({
  currentQuality: SleepQualitySchema,
  sleepScore: z.number().min(0).max(100),
  analysis: z.object({
    duration: z.object({
      current: z.number(),
      recommended: z.number(),
      assessment: z.string(),
    }),
    quality: z.object({
      deepSleep: z.string(),
      remSleep: z.string(),
      lightSleep: z.string(),
      disruptions: z.string(),
    }),
    timing: z.object({
      bedTime: z.string(),
      wakeTime: z.string(),
      consistency: z.string(),
      circadianAlignment: z.string(),
    }),
    environment: z.object({
      temperature: z.string(),
      light: z.string(),
      noise: z.string(),
      mattress: z.string(),
    }),
    habits: z.array(z.object({
      habit: z.string(),
      impact: z.enum(["positive", "neutral", "negative"]),
      recommendation: z.string(),
    })),
  }),
  optimizationStrategies: z.array(z.object({
    category: z.string(),
    strategy: z.string(),
    expectedImpact: z.string(),
    implementation: z.array(z.string()),
    timeframe: z.string(),
  })),
  supplementRecommendations: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    timing: z.string(),
    evidence: z.string(),
    priority: z.enum(["essential", "recommended", "optional"]),
  })),
  sleepHygieneProtocol: z.array(z.string()),
  trackingMetrics: z.array(z.string()),
});
export type SleepOptimization = z.infer<typeof SleepOptimizationSchema>;

export const StressManagementSchema = z.object({
  currentLevel: StressLevelSchema,
  stressScore: z.number().min(0).max(100),
  stressors: z.array(z.object({
    source: z.string(),
    intensity: z.number().min(0).max(10),
    controllability: z.enum(["controllable", "partially_controllable", "uncontrollable"]),
    mitigation: z.string(),
  })),
  physiologicalMarkers: z.object({
    restingHeartRate: z.string(),
    heartRateVariability: z.string(),
    sleepQuality: z.string(),
    appetite: z.string(),
    energy: z.string(),
    mood: z.string(),
  }),
  copingStrategies: z.array(z.object({
    strategy: z.string(),
    category: z.enum(["immediate", "short_term", "long_term"]),
    evidenceLevel: z.enum(["strong", "moderate", "weak"]),
    instructions: z.string(),
    duration: z.string(),
  })),
  trainingModifications: z.array(z.string()),
  lifestyleRecommendations: z.array(z.string()),
  whenToSeekHelp: z.array(z.string()),
  recoveryPlan: z.object({
    daily: z.array(z.string()),
    weekly: z.array(z.string()),
    monthly: z.array(z.string()),
  }),
});
export type StressManagement = z.infer<typeof StressManagementSchema>;

export const PerformancePredictionSchema = z.object({
  metric: z.string(),
  currentValue: z.number(),
  projectedValues: z.array(z.object({
    timeframe: z.string(),
    predictedValue: z.number(),
    confidence: z.number().min(0).max(1),
    factors: z.array(z.string()),
  })),
  improvementPotential: z.object({
    optimistic: z.number(),
    realistic: z.number(),
    conservative: z.number(),
    limitingFactors: z.array(z.string()),
  }),
  trainingRecommendations: z.array(z.string()),
  nutritionRecommendations: z.array(z.string()),
  recoveryRecommendations: z.array(z.string()),
  timeline: z.string(),
  confidence: z.number().min(0).max(1),
  methodology: z.string(),
});
export type PerformancePrediction = z.infer<typeof PerformancePredictionSchema>;

export const AnalyzeHealthRequestSchema = z.object({
  userId: z.string(),
  timeframe: z.object({ start: z.string(), end: z.string() }),
  trainingData: z.object({
    totalSessions: z.number(),
    averageIntensity: z.number(),
    averageDuration: z.number(),
    volumeLoad: z.number(),
    rpeAverage: z.number(),
    missedSessions: z.number(),
    sessionTypes: z.array(z.string()),
  }).optional(),
  bodyData: z.object({
    weight: z.number().optional(),
    restingHR: z.number().optional(),
    hrv: z.number().optional(),
    bodyFat: z.number().optional(),
    bloodPressure: z.string().optional(),
  }).optional(),
  sleepData: z.object({
    averageHours: z.number(),
    averageQuality: z.number().min(1).max(10),
    disruptions: z.number().optional(),
    consistency: z.number().min(0).max(100),
  }).optional(),
  nutritionData: z.object({
    averageCalories: z.number(),
    averageProtein: z.number(),
    hydration: z.number(),
    consistency: z.number().min(0).max(100),
  }).optional(),
  lifestyleData: z.object({
    stressLevel: z.number().min(1).max(10),
    workHours: z.number(),
    commuteHours: z.number().optional(),
    socialSupport: z.number().min(1).max(10).optional(),
  }).optional(),
  injuryHistory: z.array(z.string()).optional(),
  medicalConditions: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
});
export type AnalyzeHealthRequest = z.infer<typeof AnalyzeHealthRequestSchema>;

export const HealthAnalysisSchema = z.object({
  userId: z.string(),
  analysisDate: z.string(),
  injuryRisk: InjuryRiskAssessmentSchema,
  recovery: RecoveryRecommendationSchema,
  sleep: SleepOptimizationSchema,
  stress: StressManagementSchema,
  performancePredictions: z.array(PerformancePredictionSchema),
  overallHealthScore: z.number().min(0).max(100),
  healthBreakdown: z.object({
    training: z.number().min(0).max(100),
    recovery: z.number().min(0).max(100),
    nutrition: z.number().min(0).max(100),
    sleep: z.number().min(0).max(100),
    stress: z.number().min(0).max(100),
    lifestyle: z.number().min(0).max(100),
  }),
  criticalAlerts: z.array(z.string()),
  actionPlan: z.array(z.object({
    priority: z.number().int().positive(),
    action: z.string(),
    category: z.string(),
    timeframe: z.string(),
    expectedOutcome: z.string(),
  })),
  nextReviewDate: z.string(),
});
export type HealthAnalysis = z.infer<typeof HealthAnalysisSchema>;

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const ANALYTICS_SYSTEM_PROMPT = `You are a sports science analyst specializing in health optimization for athletes.
Your expertise includes:
- Injury risk assessment using biomechanical and training load data
- Recovery science (sleep, nutrition, stress management)
- Performance prediction using validated models
- Sleep optimization based on chronobiology
- Stress physiology and management
- Holistic health analysis

You use evidence-based approaches from:
- Sports medicine research
- Sleep science literature
- Stress physiology
- Training load monitoring
- Injury epidemiology

Always provide:
- Risk assessments with clear reasoning
- Actionable recommendations
- Monitoring strategies
- Clear criteria for when to seek professional help
- Evidence levels for all recommendations`;

// ---------------------------------------------------------------------------
// AI Analytics
// ---------------------------------------------------------------------------

export class AIAnalytics {
  private client: AIClient;

  constructor(client?: AIClient) {
    this.client = client ?? getAIClient();
  }

  async analyzeHealth(request: AnalyzeHealthRequest): Promise<HealthAnalysis> {
    const validated = AnalyzeHealthRequestSchema.parse(request);

    const prompt = `Perform comprehensive health analysis:

**User:** ${validated.userId}
**Analysis Period:** ${validated.timeframe.start} to ${validated.timeframe.end}

**Training Data:** ${JSON.stringify(validated.trainingData ?? {}, null, 2)}
**Body Data:** ${JSON.stringify(validated.bodyData ?? {}, null, 2)}
**Sleep Data:** ${JSON.stringify(validated.sleepData ?? {}, null, 2)}
**Nutrition Data:** ${JSON.stringify(validated.nutritionData ?? {}, null, 2)}
**Lifestyle Data:** ${JSON.stringify(validated.lifestyleData ?? {}, null, 2)}
**Injury History:** ${validated.injuryHistory?.join(", ") || "None"}
**Medical Conditions:** ${validated.medicalConditions?.join(", ") || "None"}
**Goals:** ${validated.goals?.join(", ") || "Not specified"}

Perform:
1. Injury risk assessment across all body regions
2. Recovery status evaluation
3. Sleep quality analysis and optimization
4. Stress assessment and management plan
5. Performance predictions for key metrics
6. Overall health score calculation
7. Prioritized action plan with timeline

Return as a complete HealthAnalysis JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: ANALYTICS_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.4,
      maxTokens: 12288,
    });

    return this.parseHealthAnalysis(response);
  }

  async assessInjuryRisk(
    trainingLoad: {
      weeklyVolume: number;
      intensity: number;
      frequency: number;
      acuteChronicRatio: number;
      recentChanges: string[];
    },
    bodyData: {
      weight: number;
      previousInjuries: string[];
      movementLimitations: string[];
      age: number;
    },
    lifestyleFactors: {
      sleepHours: number;
      stressLevel: number;
      nutritionQuality: number;
    },
  ): Promise<InjuryRiskAssessment> {
    const prompt = `Assess injury risk based on:

**Training Load:**
- Weekly Volume: ${trainingLoad.weeklyVolume} sets
- Average Intensity: ${trainingLoad.intensity}%
- Frequency: ${trainingLoad.frequency}x/week
- Acute:Chronic Ratio: ${trainingLoad.acuteChronicRatio}
- Recent Changes: ${trainingLoad.recentChanges.join("; ") || "None"}

**Body Profile:**
- Weight: ${bodyData.weight}kg
- Age: ${bodyData.age}
- Previous Injuries: ${bodyData.previousInjuries.join(", ") || "None"}
- Movement Limitations: ${bodyData.movementLimitations.join(", ") || "None"}

**Lifestyle:**
- Sleep: ${lifestyleFactors.sleepHours} hours
- Stress: ${lifestyleFactors.stressLevel}/10
- Nutrition Quality: ${lifestyleFactors.nutritionQuality}/10

Provide:
1. Overall injury risk score and level
2. Risk factor analysis with contributions
3. Body region-specific risk assessment
4. Training recommendations to reduce risk
5. Monitoring plan
6. Warning signs to watch for
7. When to seek professional help

Return as an InjuryRiskAssessment JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: ANALYTICS_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.4,
      maxTokens: 6144,
    });

    return this.parseInjuryRisk(response);
  }

  async getRecoveryRecommendations(
    trainingLoad: { intensity: number; volume: number; soreness: number },
    sleepData: { hours: number; quality: number },
    nutritionData: { calories: number; protein: number; hydration: number },
    stressLevel: number,
    daysSinceLastRest: number,
    recentPerformance: { trend: "improving" | "stable" | "declining"; rpe: number },
  ): Promise<RecoveryRecommendation> {
    const prompt = `Provide recovery recommendations:

**Training State:**
- Intensity: ${trainingLoad.intensity}%
- Volume: ${trainingLoad.volume} sets
- Soreness: ${trainingLoad.soreness}/10

**Recovery Metrics:**
- Sleep: ${sleepData.hours} hours, quality ${sleepData.quality}/10
- Nutrition: ${nutritionData.calories}cal, ${nutritionData.protein}g protein, ${nutritionData.hydration}L water
- Stress: ${stressLevel}/10
- Days Since Rest: ${daysSinceLastRest}

**Performance:**
- Trend: ${recentPerformance.trend}
- Average RPE: ${recentPerformance.rpe}

Provide:
1. Current recovery status assessment
2. Domain-specific scores and recommendations
3. Immediate recovery actions
4. Short-term recovery plan
5. Long-term recovery strategies
6. Recovery modality recommendations
7. Next training recommendation
8. Estimated recovery time

Return as a RecoveryRecommendation JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: ANALYTICS_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.4,
      maxTokens: 6144,
    });

    return this.parseRecoveryRecommendation(response);
  }

  async optimizeSleep(
    currentSleep: {
      hours: number;
      quality: number;
      bedTime: string;
      wakeTime: string;
      disruptions: number;
      screenTime: number;
      caffeine: string;
      exercise: string;
    },
    goals: string[],
    lifestyle: { workSchedule: string; stressLevel: number },
  ): Promise<SleepOptimization> {
    const prompt = `Optimize sleep for better recovery:

**Current Sleep:**
- Duration: ${currentSleep.hours} hours
- Quality: ${currentSleep.quality}/10
- Bedtime: ${currentSleep.bedTime}
- Wake Time: ${currentSleep.wakeTime}
- Night Disruptions: ${currentSleep.disruptions}
- Evening Screen Time: ${currentSleep.screenTime} min
- Caffeine: ${currentSleep.caffeine}
- Exercise Timing: ${currentSleep.exercise}

**Lifestyle:**
- Work Schedule: ${lifestyle.workSchedule}
- Stress Level: ${lifestyle.stressLevel}/10

**Goals:** ${goals.join(", ") || "Better recovery and performance"}

Provide:
1. Sleep quality analysis (duration, timing, environment, habits)
2. Optimization strategies by category
3. Sleep hygiene protocol
4. Supplement recommendations with evidence levels
5. Tracking metrics for improvement
6. Expected timeline for improvement

Return as a SleepOptimization JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: ANALYTICS_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.4,
      maxTokens: 6144,
    });

    return this.parseSleepOptimization(response);
  }

  async manageStress(
    stressors: Array<{ source: string; intensity: number; controllability: "controllable" | "partially_controllable" | "uncontrollable" }>,
    physiologicalMarkers: {
      restingHR: number;
      hrv: number;
      sleepQuality: number;
      appetite: number;
      energy: number;
    },
    trainingImpact: {
      performance: "improving" | "stable" | "declining";
      motivation: number;
      adherence: number;
    },
    lifestyle: { workHours: number; socialSupport: number; copingMechanisms: string[] },
  ): Promise<StressManagement> {
    const prompt = `Provide stress management plan:

**Stressors:**
${stressors.map((s) => `  - ${s.source}: Intensity ${s.intensity}/10, ${s.controllability}`).join("\n")}

**Physiological Markers:**
- Resting HR: ${physiologicalMarkers.restingHR} bpm
- HRV: ${physiologicalMarkers.hrv}
- Sleep Quality: ${physiologicalMarkers.sleepQuality}/10
- Appetite: ${physiologicalMarkers.appetite}/10
- Energy: ${physiologicalMarkers.energy}/10

**Training Impact:**
- Performance: ${trainingImpact.performance}
- Motivation: ${trainingImpact.motivation}/10
- Adherence: ${trainingImpact.adherence}%

**Lifestyle:**
- Work Hours: ${lifestyle.workHours}/week
- Social Support: ${lifestyle.socialSupport}/10
- Current Coping: ${lifestyle.copingMechanisms.join(", ") || "None reported"}

Provide:
1. Stress assessment with score
2. Stressor analysis with controllability
3. Physiological impact assessment
4. Coping strategies (immediate, short-term, long-term)
5. Training modifications
6. Lifestyle recommendations
7. Daily/weekly/monthly recovery plan
8. When to seek professional help

Return as a StressManagement JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: ANALYTICS_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.4,
      maxTokens: 6144,
    });

    return this.parseStressManagement(response);
  }

  async predictPerformance(
    metric: string,
    currentValue: number,
    historicalData: Array<{ date: string; value: number }>,
    trainingPlan: { upcomingPhase: string; duration: string; focus: string },
    nutritionQuality: number,
    sleepQuality: number,
  ): Promise<PerformancePrediction> {
    const dataStr = historicalData.slice(-15).map((d) => `  ${d.date}: ${d.value}`).join("\n");

    const prompt = `Predict performance for ${metric}:

**Current Value:** ${currentValue}
**Historical Data:**
${dataStr}

**Upcoming Training:**
- Phase: ${trainingPlan.upcomingPhase}
- Duration: ${trainingPlan.duration}
- Focus: ${trainingPlan.focus}

**Recovery Quality:**
- Nutrition: ${nutritionQuality}/10
- Sleep: ${sleepQuality}/10

Provide:
1. Current assessment
2. Projected values at 4, 8, 12, and 26 weeks
3. Confidence intervals for each projection
4. Improvement potential (optimistic, realistic, conservative)
5. Limiting factors
6. Training, nutrition, and recovery recommendations to maximize improvement
7. Timeline to potential milestones
8. Methodology explanation

Return as a PerformancePrediction JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: ANALYTICS_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.4,
      maxTokens: 4096,
    });

    return this.parsePerformancePrediction(response);
  }

  // ---- Private parsing helpers -------------------------------------------

  private parseHealthAnalysis(response: AICompletionResponse): HealthAnalysis {
    try {
      const cleaned = this.extractJSON(response.content);
      return HealthAnalysisSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse health analysis: ${response.content.slice(0, 200)}`);
    }
  }

  private parseInjuryRisk(response: AICompletionResponse): InjuryRiskAssessment {
    try {
      const cleaned = this.extractJSON(response.content);
      return InjuryRiskAssessmentSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse injury risk assessment: ${response.content.slice(0, 200)}`);
    }
  }

  private parseRecoveryRecommendation(response: AICompletionResponse): RecoveryRecommendation {
    try {
      const cleaned = this.extractJSON(response.content);
      return RecoveryRecommendationSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse recovery recommendation: ${response.content.slice(0, 200)}`);
    }
  }

  private parseSleepOptimization(response: AICompletionResponse): SleepOptimization {
    try {
      const cleaned = this.extractJSON(response.content);
      return SleepOptimizationSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse sleep optimization: ${response.content.slice(0, 200)}`);
    }
  }

  private parseStressManagement(response: AICompletionResponse): StressManagement {
    try {
      const cleaned = this.extractJSON(response.content);
      return StressManagementSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse stress management: ${response.content.slice(0, 200)}`);
    }
  }

  private parsePerformancePrediction(response: AICompletionResponse): PerformancePrediction {
    try {
      const cleaned = this.extractJSON(response.content);
      return PerformancePredictionSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse performance prediction: ${response.content.slice(0, 200)}`);
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

export function getAIAnalytics(client?: AIClient): AIAnalytics {
  return new AIAnalytics(client);
}
