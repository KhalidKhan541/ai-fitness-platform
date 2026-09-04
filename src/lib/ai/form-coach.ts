import { z } from "zod";
import { type AIClient, getAIClient, type AICompletionResponse } from "./provider";

// ---------------------------------------------------------------------------
// Types & Schemas
// ---------------------------------------------------------------------------

export const ExerciseCategorySchema = z.enum([
  "compound_push",
  "compound_pull",
  "squat_pattern",
  "hinge_pattern",
  "isolation",
  "core",
  "cardio",
  "mobility",
  "olympic",
  "carry",
  "bodyweight",
]);
export type ExerciseCategory = z.infer<typeof ExerciseCategorySchema>;

export const DifficultyLevelSchema = z.enum(["beginner", "intermediate", "advanced"]);
export type DifficultyLevel = z.infer<typeof DifficultyLevelSchema>;

export const TempoNotationSchema = z.object({
  eccentric: z.number().int().min(0).max(10),
  pauseBottom: z.number().int().min(0).max(10),
  concentric: z.number().int().min(0).max(10),
  pauseTop: z.number().int().min(0).max(10),
});
export type TempoNotation = z.infer<typeof TempoNotationSchema>;

export const FormTipSchema = z.object({
  cue: z.string(),
  description: z.string(),
  bodyPart: z.string(),
  priority: z.enum(["critical", "important", "helpful"]),
  commonMistake: z.string(),
  correction: z.string(),
  visualCue: z.string().optional(),
});
export type FormTip = z.infer<typeof FormTipSchema>;

export const CommonMistakeSchema = z.object({
  mistake: z.string(),
  consequence: z.string(),
  correction: z.string(),
  drillsToFix: z.array(z.string()),
  severity: z.enum(["high", "medium", "low"]),
});
export type CommonMistake = z.infer<typeof CommonMistakeSchema>;

export const BreathingPatternSchema = z.object({
  phase: z.string(),
  action: z.string(),
  cue: z.string(),
  timing: z.string(),
  notes: z.string().optional(),
});
export type BreathingPattern = z.infer<typeof BreathingPatternSchema>;

export const RangeOfMotionSchema = z.object({
  joint: z.string(),
  startPosition: z.string(),
  endPosition: z.string(),
  cue: z.string(),
  commonLimitations: z.array(z.string()),
  mobilityDrills: z.array(z.string()),
  modificationForLimitedROM: z.string(),
});
export type RangeOfMotion = z.infer<typeof RangeOfMotionSchema>;

export const WarmUpProtocolSchema = z.object({
  duration: z.string(),
  phases: z.array(
    z.object({
      name: z.string(),
      duration: z.string(),
      exercises: z.array(
        z.object({
          name: z.string(),
          duration: z.string(),
          instructions: z.string(),
        }),
      ),
    }),
  ),
  notes: z.array(z.string()),
});
export type WarmUpProtocol = z.infer<typeof WarmUpProtocolSchema>;

export const CoolDownProtocolSchema = z.object({
  duration: z.string(),
  phases: z.array(
    z.object({
      name: z.string(),
      duration: z.string(),
      stretches: z.array(
        z.object({
          muscle: z.string(),
          duration: z.string(),
          instructions: z.string(),
        }),
      ),
    }),
  ),
  recoveryTips: z.array(z.string()),
});
export type CoolDownProtocol = z.infer<typeof CoolDownProtocolSchema>;

export const ExerciseFormAnalysisSchema = z.object({
  exerciseName: z.string(),
  category: ExerciseCategorySchema,
  difficulty: DifficultyLevelSchema,
  setupCues: z.array(z.string()),
  executionCues: z.array(z.string()),
  breathingPattern: z.array(BreathingPatternSchema),
  tempo: TempoNotationSchema,
  rangeOfMotion: z.array(RangeOfMotionSchema),
  commonMistakes: z.array(CommonMistakeSchema),
  formTips: z.array(FormTipSchema),
  modifications: z.object({
    easier: z.array(z.string()),
    harder: z.array(z.string()),
    alternatives: z.array(z.string()),
  }),
  musclesWorked: z.object({
    primary: z.array(z.string()),
    secondary: z.array(z.string()),
    stabilizers: z.array(z.string()),
  }),
  safetyNotes: z.array(z.string()),
  warmUp: WarmUpProtocolSchema,
  coolDown: CoolDownProtocolSchema,
});
export type ExerciseFormAnalysis = z.infer<typeof ExerciseFormAnalysisSchema>;

export const VideoAnalysisRequestSchema = z.object({
  exerciseName: z.string(),
  observations: z.string(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
  reportedIssues: z.array(z.string()).optional(),
});
export type VideoAnalysisRequest = z.infer<typeof VideoAnalysisRequestSchema>;

export const FormCorrectionSchema = z.object({
  issue: z.string(),
  currentForm: z.string(),
  idealForm: z.string(),
  riskLevel: z.enum(["high", "medium", "low"]),
  correctionSteps: z.array(z.string()),
  drills: z.array(z.string()),
  cues: z.array(z.string()),
  timeline: z.string(),
});
export type FormCorrection = z.infer<typeof FormCorrectionSchema>;

export const CustomCoachingRequestSchema = z.object({
  exerciseName: z.string(),
  specificQuestions: z.array(z.string()),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
  limitations: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
});
export type CustomCoachingRequest = z.infer<typeof CustomCoachingRequestSchema>;

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const FORM_COACH_SYSTEM_PROMPT = `You are a world-class strength coach and movement specialist with certifications:
- CSCS (Certified Strength and Conditioning Specialist)
- FMS (Functional Movement Screen) certified
- Precision Nutrition certified
- USAW Sports Performance Coach

Your expertise covers:
1. Biomechanics and kinesiology
2. Motor learning and skill acquisition
3. Corrective exercise programming
4. Injury prevention and rehabilitation
5. Performance optimization

You provide:
- Evidence-based form cues rooted in biomechanics
- Progressive skill development pathways
- Individualized modifications for all levels
- Clear, actionable coaching instructions
- Safety-first approach with risk assessment

Always prioritize movement quality over load or volume.
Never encourage lifting through pain or ignoring injury signals.`;

const CORRECTION_SYSTEM_PROMPT = `You are a corrective exercise specialist focused on identifying and fixing movement dysfunctions.
You analyze:
- Joint positioning and alignment
- Muscle activation patterns
- Compensatory movement strategies
- Mobility and stability deficits
- Loading mechanics

You provide:
- Root cause analysis of form breakdowns
- Progressive corrective strategies
- Self-assessment tools
- Exercise substitutions when needed
- Clear before/after comparisons`;

// ---------------------------------------------------------------------------
// Form Coach
// ---------------------------------------------------------------------------

export class FormCoach {
  private client: AIClient;

  constructor(client?: AIClient) {
    this.client = client ?? getAIClient();
  }

  async analyzeExercise(
    exerciseName: string,
    experienceLevel: DifficultyLevel,
    specificConcerns?: string[],
  ): Promise<ExerciseFormAnalysis> {
    const prompt = `Provide a comprehensive form analysis for: ${exerciseName}

**Experience Level:** ${experienceLevel}
**Specific Concerns:** ${specificConcerns?.join(", ") || "General form review"}

Provide complete analysis including:
1. Step-by-step setup instructions
2. Execution cues for each phase
3. Breathing pattern prescription
4. Tempo recommendation with notation (eccentric-pauseBottom-concentric-pauseTop)
5. Full range of motion description with common limitations
6. Top 5 common mistakes and corrections
7. Key form tips prioritized by importance
8. Easier/harder modifications
9. Primary, secondary, and stabilizer muscles
10. Safety notes and contraindications
11. Complete warm-up protocol (5-10 minutes)
12. Complete cool-down protocol (5-10 minutes)

Return as an ExerciseFormAnalysis JSON object.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: FORM_COACH_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.5,
      maxTokens: 8192,
    });

    return this.parseFormAnalysis(response);
  }

  async getCommonMistakes(
    exerciseName: string,
    experienceLevel: DifficultyLevel,
  ): Promise<CommonMistake[]> {
    const prompt = `Identify the most common mistakes for ${exerciseName} at the ${experienceLevel} level.

For each mistake provide:
1. Clear description of what goes wrong
2. Why it happens (biomechanical cause)
3. Potential injury risk and consequences
4. Step-by-step correction protocol
5. Specific drills to fix the issue
6. Severity rating (high/medium/low)

Focus on the top 5-7 most impactful mistakes.
Return as an array of CommonMistake JSON objects.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: FORM_COACH_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.5,
      maxTokens: 4096,
    });

    return this.parseCommonMistakes(response);
  }

  async getBreathingPattern(
    exerciseName: string,
    intensity: "light" | "moderate" | "heavy" | "max_effort",
  ): Promise<BreathingPattern[]> {
    const prompt = `Design the optimal breathing pattern for ${exerciseName} at ${intensity} intensity.

Include:
1. Breathing for each phase of the movement
2. Bracing techniques (Valsalva vs. controlled breathing)
3. Timing cues that sync with movement
4. Common breathing errors
5. Performance benefits of proper breathing
6. Special considerations for different fitness levels

Provide specific, actionable breathing instructions.
Return as an array of BreathingPattern JSON objects.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: FORM_COACH_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.4,
      maxTokens: 4096,
    });

    return this.parseBreathingPatterns(response);
  }

  async getRangeOfMotionGuidance(
    exerciseName: string,
    experienceLevel: DifficultyLevel,
    mobilityLimitations: string[],
  ): Promise<RangeOfMotion[]> {
    const prompt = `Provide range of motion guidance for ${exerciseName}:

**Experience Level:** ${experienceLevel}
**Known Limitations:** ${mobilityLimitations.join(", ") || "None reported"}

For each relevant joint:
1. Describe ideal start and end positions
2. Provide clear positional cues
3. Identify common ROM limitations
4. Suggest mobility drills to improve ROM
5. Provide modifications for limited ROM
6. Explain how ROM affects muscle activation

Return as an array of RangeOfMotion JSON objects.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: FORM_COACH_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.5,
      maxTokens: 4096,
    });

    return this.parseRangeOfMotion(response);
  }

  async getTempoRecommendation(
    exerciseName: string,
    goal: "strength" | "hypertrophy" | "endurance" | "power" | "rehabilitation",
    experienceLevel: DifficultyLevel,
  ): Promise<TempoNotation & { reasoning: string }> {
    const prompt = `Recommend the optimal tempo for ${exerciseName}:

**Training Goal:** ${goal}
**Experience Level:** ${experienceLevel}

Provide:
1. Specific tempo notation (eccentric-pauseBottom-concentric-pauseTop)
2. Scientific reasoning for each phase duration
3. How tempo affects the training stimulus
4. Common tempo mistakes
5. How to progress tempo over time
6. Special considerations for each goal type

Return as a JSON object with eccentric, pauseBottom, concentric, pauseTop (integers) and reasoning (string).`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: FORM_COACH_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.4,
      maxTokens: 2048,
    });

    return this.parseTempoRecommendation(response);
  }

  async analyzeVideoFeedback(
    request: VideoAnalysisRequest,
  ): Promise<FormCorrection[]> {
    const validated = VideoAnalysisRequestSchema.parse(request);

    const prompt = `Analyze this form observation for ${validated.exerciseName}:

**Observed Form:** ${validated.observations}
**Experience Level:** ${validated.experienceLevel}
**Reported Issues:** ${validated.reportedIssues?.join(", ") || "None reported"}

Note: This is a text-based analysis. Based on the description provided, identify:
1. Likely form issues based on the observations
2. Risk assessment for each identified issue
3. Root cause analysis
4. Step-by-step correction protocol
5. Specific drills and cues to fix the issues
6. Timeline for expected improvement

If the description is ambiguous, address the most common issues for this exercise.

Return as an array of FormCorrection JSON objects.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: CORRECTION_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.5,
      maxTokens: 4096,
    });

    return this.parseFormCorrections(response);
  }

  async getCustomCoaching(
    request: CustomCoachingRequest,
  ): Promise<{
    exerciseName: string;
    answers: Array<{ question: string; answer: string }>;
    actionItems: string[];
    resources: string[];
  }> {
    const validated = CustomCoachingRequestSchema.parse(request);

    const prompt = `Provide expert coaching for ${validated.exerciseName}:

**Experience Level:** ${validated.experienceLevel}
**Limitations:** ${validated.limitations?.join(", ") || "None"}
**Goals:** ${validated goals?.join(", ") || "General improvement"}

Answer these specific questions:
${validated.specificQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

For each question provide:
1. Clear, detailed answer
2. Supporting evidence or reasoning
3. Practical application tips
4. Common misconceptions to avoid

Also provide:
- Top 3 action items for immediate improvement
- Recommended resources for further learning

Return as a JSON object with exerciseName, answers (array of {question, answer}), actionItems, and resources.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: FORM_COACH_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.6,
      maxTokens: 6144,
    });

    return this.parseCustomCoaching(response);
  }

  async generateProgressiveSkillPlan(
    exerciseName: string,
    currentSkillLevel: DifficultyLevel,
    targetSkillLevel: DifficultyLevel,
    timelineWeeks: number,
  ): Promise<{
    exerciseName: string;
    currentLevel: DifficultyLevel;
    targetLevel: DifficultyLevel;
    phases: Array<{
      phase: string;
      duration: string;
      goals: string[];
      exercises: string[];
      benchmarks: string[];
      progressionCriteria: string;
    }>;
    totalWeeks: number;
  }> {
    const prompt = `Create a progressive skill development plan for ${exerciseName}:

**Current Level:** ${currentSkillLevel}
**Target Level:** ${targetSkillLevel}
**Timeline:** ${timelineWeeks} weeks

Design a phased approach that:
1. Identifies specific skill gaps between levels
2. Creates progressive skill milestones
3. Provides drill progressions for each phase
4. Sets measurable benchmarks for advancement
5. Includes regression strategies if plateaus occur
6. Addresses mobility/stability prerequisites

Return as a JSON object with exerciseName, currentLevel, targetLevel, phases (array), and totalWeeks.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: FORM_COACH_SYSTEM_PROMPT,
      responseFormat: "json",
      temperature: 0.6,
      maxTokens: 6144,
    });

    return this.parseProgressiveSkillPlan(response);
  }

  // ---- Private parsing helpers -------------------------------------------

  private parseFormAnalysis(response: AICompletionResponse): ExerciseFormAnalysis {
    try {
      const cleaned = this.extractJSON(response.content);
      return ExerciseFormAnalysisSchema.parse(JSON.parse(cleaned));
    } catch {
      throw new Error(`Failed to parse form analysis: ${response.content.slice(0, 200)}`);
    }
  }

  private parseCommonMistakes(response: AICompletionResponse): CommonMistake[] {
    try {
      const cleaned = this.extractJSON(response.content);
      const parsed = JSON.parse(cleaned);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.map((item: unknown) => CommonMistakeSchema.parse(item));
    } catch {
      throw new Error(`Failed to parse common mistakes: ${response.content.slice(0, 200)}`);
    }
  }

  private parseBreathingPatterns(response: AICompletionResponse): BreathingPattern[] {
    try {
      const cleaned = this.extractJSON(response.content);
      const parsed = JSON.parse(cleaned);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.map((item: unknown) => BreathingPatternSchema.parse(item));
    } catch {
      throw new Error(`Failed to parse breathing patterns: ${response.content.slice(0, 200)}`);
    }
  }

  private parseRangeOfMotion(response: AICompletionResponse): RangeOfMotion[] {
    try {
      const cleaned = this.extractJSON(response.content);
      const parsed = JSON.parse(cleaned);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.map((item: unknown) => RangeOfMotionSchema.parse(item));
    } catch {
      throw new Error(`Failed to parse range of motion: ${response.content.slice(0, 200)}`);
    }
  }

  private parseTempoRecommendation(response: AICompletionResponse): TempoNotation & { reasoning: string } {
    try {
      const cleaned = this.extractJSON(response.content);
      const parsed = JSON.parse(cleaned);
      return {
        eccentric: parsed.eccentric ?? 3,
        pauseBottom: parsed.pauseBottom ?? 0,
        concentric: parsed.concentric ?? 1,
        pauseTop: parsed.pauseTop ?? 0,
        reasoning: parsed.reasoning ?? "",
      };
    } catch {
      throw new Error(`Failed to parse tempo recommendation: ${response.content.slice(0, 200)}`);
    }
  }

  private parseFormCorrections(response: AICompletionResponse): FormCorrection[] {
    try {
      const cleaned = this.extractJSON(response.content);
      const parsed = JSON.parse(cleaned);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      return arr.map((item: unknown) => FormCorrectionSchema.parse(item));
    } catch {
      throw new Error(`Failed to parse form corrections: ${response.content.slice(0, 200)}`);
    }
  }

  private parseCustomCoaching(response: AICompletionResponse): {
    exerciseName: string;
    answers: Array<{ question: string; answer: string }>;
    actionItems: string[];
    resources: string[];
  } {
    try {
      const cleaned = this.extractJSON(response.content);
      const parsed = JSON.parse(cleaned) as Record<string, unknown>;
      return {
        exerciseName: (parsed.exerciseName as string) ?? "",
        answers: Array.isArray(parsed.answers)
          ? (parsed.answers as Array<{ question: string; answer: string }>)
          : [],
        actionItems: Array.isArray(parsed.actionItems)
          ? (parsed.actionItems as string[])
          : [],
        resources: Array.isArray(parsed.resources)
          ? (parsed.resources as string[])
          : [],
      };
    } catch {
      throw new Error(`Failed to parse custom coaching: ${response.content.slice(0, 200)}`);
    }
  }

  private parseProgressiveSkillPlan(response: AICompletionResponse): {
    exerciseName: string;
    currentLevel: DifficultyLevel;
    targetLevel: DifficultyLevel;
    phases: Array<{
      phase: string;
      duration: string;
      goals: string[];
      exercises: string[];
      benchmarks: string[];
      progressionCriteria: string;
    }>;
    totalWeeks: number;
  } {
    try {
      const cleaned = this.extractJSON(response.content);
      const parsed = JSON.parse(cleaned) as Record<string, unknown>;
      return {
        exerciseName: (parsed.exerciseName as string) ?? "",
        currentLevel: (parsed.currentLevel as DifficultyLevel) ?? "beginner",
        targetLevel: (parsed.targetLevel as DifficultyLevel) ?? "intermediate",
        phases: Array.isArray(parsed.phases)
          ? (parsed.phases as Array<{
              phase: string;
              duration: string;
              goals: string[];
              exercises: string[];
              benchmarks: string[];
              progressionCriteria: string;
            }>)
          : [],
        totalWeeks: (parsed.totalWeeks as number) ?? 0,
      };
    } catch {
      throw new Error(`Failed to parse progressive skill plan: ${response.content.slice(0, 200)}`);
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

export function getFormCoach(client?: AIClient): FormCoach {
  return new FormCoach(client);
}
