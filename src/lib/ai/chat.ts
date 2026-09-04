import { z } from "zod";
import { type AIClient, getAIClient, type AICompletionResponse, type ChatMessage } from "./provider";

// ---------------------------------------------------------------------------
// Types & Schemas
// ---------------------------------------------------------------------------

export const ChatContextSchema = z.enum([
  "exercise_qa",
  "nutrition_qa",
  "motivation",
  "form_check",
  "workout_guidance",
  "general_fitness",
  "injury_consultation",
  "program_review",
  "mental_performance",
  "lifestyle_optimization",
]);
export type ChatContext = z.infer<typeof ChatContextSchema>;

export const MessageIntentSchema = z.enum([
  "question",
  "request_advice",
  "report_progress",
  "ask_exercise",
  "ask_nutrition",
  "ask_form",
  "ask_program",
  "need_motivation",
  "report_issue",
  "request_analysis",
  "casual_chat",
  "emergency",
]);
export type MessageIntent = z.infer<typeof MessageIntentSchema>;

export const UserProfileSchema = z.object({
  userId: z.string(),
  name: z.string().optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced", "elite"]).optional(),
  primaryGoal: z.string().optional(),
  currentProgram: z.string().optional(),
  recentWorkouts: z.array(z.object({
    date: z.string(),
    exercise: z.string(),
    sets: z.number(),
    reps: z.number(),
    weight: z.number(),
  })).optional(),
  injuries: z.array(z.string()).optional(),
  preferences: z.object({
    tone: z.enum(["encouraging", "direct", "technical", "casual"]).default("encouraging"),
    detailLevel: z.enum(["brief", "moderate", "detailed"]).default("moderate"),
  }).optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const ChatRequestSchema = z.object({
  message: z.string().min(1),
  context: ChatContextSchema.default("general_fitness"),
  userProfile: UserProfileSchema.optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional(),
  currentWorkout: z.object({
    exercise: z.string(),
    sets: z.number(),
    reps: z.number(),
    weight: z.number(),
    rpe: z.number().optional(),
  }).optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  response: z.string(),
  intent: MessageIntentSchema,
  confidence: z.number().min(0).max(1),
  followUpQuestions: z.array(z.string()),
  actionItems: z.array(z.string()),
  relatedTopics: z.array(z.string()),
  sources: z.array(z.string()).optional(),
  urgency: z.enum(["none", "low", "medium", "high", "emergency"]),
  sentiment: z.enum(["positive", "neutral", "negative", "frustrated", "motivated"]),
  tags: z.array(z.string()),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const WorkoutGuidanceRequestSchema = z.object({
  exercise: z.string(),
  currentSet: z.number().int().positive(),
  currentReps: z.number().int().positive(),
  currentWeight: z.number(),
  rpe: z.number().optional(),
  timeRemaining: z.number().optional(),
  fatigue: z.enum(["fresh", "moderate", "fatigued", "exhausted"]).optional(),
});
export type WorkoutGuidanceRequest = z.infer<typeof WorkoutGuidanceRequestSchema>;

export const ExerciseQARequestSchema = z.object({
  exercise: z.string(),
  question: z.string(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
  context: z.string().optional(),
});
export type ExerciseQARequest = z.infer<typeof ExerciseQARequestSchema>;

export const NutritionQARequestSchema = z.object({
  question: z.string(),
  dietType: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  currentIntake: z.object({
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
  }).optional(),
  goal: z.string().optional(),
});
export type NutritionQARequest = z.infer<typeof NutritionQARequestSchema>;

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const CHAT_SYSTEM_PROMPT_BASE = `You are an elite AI fitness coach and personal trainer. You combine:
- Deep knowledge of exercise science and kinesiology
- Sports nutrition expertise
- Behavioral psychology for motivation
- Injury prevention and rehabilitation awareness
- Mental performance coaching

Your communication style adapts to the user:
- Encouraging: Supportive, celebrating wins, building confidence
- Direct: Clear, no-nonsense, action-oriented
- Technical: Science-based, detailed, evidence-driven
- Casual: Friendly, conversational, approachable

Key behaviors:
1. Always prioritize safety — never recommend dangerous practices
2. Provide evidence-based advice with clear reasoning
3. Be honest about limitations — refer to professionals when needed
4. Remember conversation context and build on previous advice
5. Ask clarifying questions when the request is ambiguous
6. Provide actionable, specific recommendations
7. Adapt to the user's experience level and goals

Emergency protocol: If someone describes symptoms of a medical emergency (chest pain, difficulty breathing, severe injury), immediately advise them to seek emergency medical attention.`;

function buildSystemPrompt(context: ChatContext, profile?: UserProfile): string {
  const tone = profile?.preferences?.tone ?? "encouraging";
  const detail = profile?.preferences?.detailLevel ?? "moderate";
  const level = profile?.experienceLevel ?? "intermediate";

  const contextPrompts: Record<ChatContext, string> = {
    exercise_qa: "Focus on exercise science, biomechanics, and proper technique. Provide clear, evidence-based answers about exercises, muscles, and training principles.",
    nutrition_qa: "Focus on sports nutrition, meal planning, macros, and supplementation. Provide practical, science-based nutritional advice.",
    motivation: "Focus on behavioral psychology, habit formation, and motivational strategies. Be encouraging but realistic. Help the user overcome mental barriers.",
    form_check: "Focus on exercise form, common mistakes, and corrections. Provide specific cues and visualizations for proper technique.",
    workout_guidance: "Focus on real-time coaching during workouts. Provide concise, actionable cues. Be encouraging and help with pacing and effort management.",
    general_fitness: "Provide comprehensive fitness advice covering training, nutrition, recovery, and lifestyle. Adapt to the user's specific needs.",
    injury_consultation: "Focus on injury prevention, rehabilitation exercises, and when to seek professional help. Always err on the side of caution.",
    program_review: "Analyze training programs for effectiveness, balance, and safety. Provide constructive feedback and optimization suggestions.",
    mental_performance: "Focus on mental toughness, visualization, goal setting, and psychological strategies for athletic performance.",
    lifestyle_optimization: "Focus on sleep, stress management, recovery, and lifestyle factors that impact fitness and health.",
  };

  return `${CHAT_SYSTEM_PROMPT_BASE}

**Active Context:** ${contextPrompts[context]}

**User Profile:**
- Experience Level: ${level}
- Tone: ${tone}
- Detail Level: ${detail}
${profile?.name ? `- Name: ${profile.name}` : ""}
${profile?.primaryGoal ? `- Primary Goal: ${profile.primaryGoal}` : ""}
${profile?.currentProgram ? `- Current Program: ${profile.currentProgram}` : ""}
${profile?.injuries?.length ? `- Known Injuries/Limitations: ${profile.injuries.join(", ")}` : ""}`;
}

// ---------------------------------------------------------------------------
// Intent classifier
// ---------------------------------------------------------------------------

function classifyIntent(message: string, context: ChatContext): MessageIntent {
  const lower = message.toLowerCase();

  if (lower.includes("help") && (lower.includes("emergency") || lower.includes("hurt") || lower.includes("pain") || lower.includes("injury"))) {
    return "emergency";
  }

  if (lower.includes("feel") && (lower.includes("motivated") || lower.includes("tired") || lower.includes("uninspired") || lower.includes("lazy"))) {
    return "need_motivation";
  }

  if (lower.includes("how do") || lower.includes("what is") || lower.includes("why does") || lower.includes("can you explain") || lower.includes("tell me about")) {
    if (context === "exercise_qa" || lower.includes("exercise") || lower.includes("workout")) return "ask_exercise";
    if (context === "nutrition_qa" || lower.includes("food") || lower.includes("eat") || lower.includes("diet")) return "ask_nutrition";
    if (lower.includes("form") || lower.includes("technique") || lower.includes("proper")) return "ask_form";
    if (lower.includes("program") || lower.includes("plan") || lower.includes("routine")) return "ask_program";
    return "question";
  }

  if (lower.includes("what should i") || lower.includes("recommend") || lower.includes("suggest") || lower.includes("advice")) {
    return "request_advice";
  }

  if (lower.includes("i did") || lower.includes("i completed") || lower.includes("today i") || lower.includes("finished")) {
    return "report_progress";
  }

  if (lower.includes("hurt") || lower.includes("pain") || lower.includes("injury") || lower.includes("sore")) {
    return "report_issue";
  }

  if (lower.includes("analyze") || lower.includes("review") || lower.includes("assess") || lower.includes("check my")) {
    return "request_analysis";
  }

  return "question";
}

function assessUrgency(message: string): ChatResponse["urgency"] {
  const lower = message.toLowerCase();
  if (lower.includes("emergency") || lower.includes("chest pain") || lower.includes("can't breathe") || lower.includes("severe")) return "emergency";
  if (lower.includes("sharp pain") || lower.includes("pop") || lower.includes("snap") || lower.includes("can't move")) return "high";
  if (lower.includes("pain") || lower.includes("hurt") || lower.includes("injury")) return "medium";
  if (lower.includes("sore") || lower.includes("ache")) return "low";
  return "none";
}

function assessSentiment(message: string): ChatResponse["sentiment"] {
  const lower = message.toLowerCase();
  if (lower.includes("frustrated") || lower.includes("giving up") || lower.includes("hate") || lower.includes("stuck")) return "frustrated";
  if (lower.includes("amazing") || lower.includes("great") || lower.includes("crushed") || lower.includes("pr")) return "motivated";
  if (lower.includes("tired") || lower.includes("unmotivated") || lower.includes("bored")) return "negative";
  if (lower.includes("good") || lower.includes("fine") || lower.includes("okay")) return "positive";
  return "neutral";
}

// ---------------------------------------------------------------------------
// FitnessChat class
// ---------------------------------------------------------------------------

export class FitnessChat {
  private client: AIClient;

  constructor(client?: AIClient) {
    this.client = client ?? getAIClient();
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const validated = ChatRequestSchema.parse(request);
    const intent = classifyIntent(validated.message, validated.context);
    const urgency = assessUrgency(validated.message);
    const sentiment = assessSentiment(validated.message);

    if (urgency === "emergency") {
      return {
        response: "If you are experiencing a medical emergency, please stop what you are doing and call emergency services (911) immediately. Do not attempt to exercise or ignore these symptoms. Your safety is the top priority.",
        intent: "emergency",
        confidence: 1.0,
        followUpQuestions: [],
        actionItems: ["Call emergency services immediately", "Do not exercise until cleared by a medical professional"],
        relatedTopics: [],
        urgency: "emergency",
        sentiment: "neutral",
        tags: ["emergency", "medical"],
      };
    }

    const systemPrompt = buildSystemPrompt(validated.context, validated.userProfile);
    const messages = this.buildConversationMessages(validated, systemPrompt);

    const response = await this.client.complete({
      messages,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 2048,
    });

    return this.parseChatResponse(response, intent, urgency, sentiment, validated.message);
  }

  async answerExerciseQA(request: ExerciseQARequest): Promise<ChatResponse> {
    const validated = ExerciseQARequestSchema.parse(request);

    const prompt = `Exercise Q&A Request:

**Exercise:** ${validated.exercise}
**Question:** ${validated.question}
**Experience Level:** ${validated.experienceLevel}
${validated.context ? `**Additional Context:** ${validated.context}` : ""}

Provide a comprehensive, accurate answer. Include:
1. Direct answer to the question
2. Scientific explanation
3. Practical application
4. Common misconceptions to avoid
5. Related considerations

Adapt the complexity to the ${validated.experienceLevel} level.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: CHAT_SYSTEM_PROMPT_BASE,
      temperature: 0.5,
      maxTokens: 2048,
    });

    return this.parseChatResponse(response, "ask_exercise", "none", "neutral", validated.question);
  }

  async answerNutritionQA(request: NutritionQARequest): Promise<ChatResponse> {
    const validated = NutritionQARequestSchema.parse(request);

    const prompt = `Nutrition Q&A Request:

**Question:** ${validated.question}
${validated.dietType ? `**Diet Type:** ${validated.dietType}` : ""}
${validated.allergies?.length ? `**Allergies:** ${validated.allergies.join(", ")}` : ""}
${validated.goal ? `**Goal:** ${validated.goal}` : ""}
${validated.currentIntake ? `**Current Intake:** ${JSON.stringify(validated.currentIntake)}` : ""}

Provide evidence-based nutritional advice. Include:
1. Direct answer to the question
2. Scientific reasoning
3. Practical recommendations
4. Considerations for the user's specific context
5. When to consult a registered dietitian

Always note that individual nutritional needs vary and professional guidance is recommended for specific dietary plans.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: CHAT_SYSTEM_PROMPT_BASE,
      temperature: 0.5,
      maxTokens: 2048,
    });

    return this.parseChatResponse(response, "ask_nutrition", "none", "neutral", validated.question);
  }

  async provideWorkoutGuidance(request: WorkoutGuidanceRequest): Promise<ChatResponse> {
    const validated = WorkoutGuidanceRequestSchema.parse(request);

    const prompt = `Real-time Workout Guidance:

**Exercise:** ${validated.exercise}
**Current Set:** ${validated.currentSet}
**Reps This Set:** ${validated.currentReps}
**Weight:** ${validated.currentWeight}kg
${validated.rpe ? `**RPE:** ${validated.rpe}` : ""}
${validated.timeRemaining ? `**Time Remaining:** ${validated.timeRemaining} minutes` : ""}
${validated.fatigue ? `**Fatigue Level:** ${validated.fatigue}` : ""}

Provide concise, immediate coaching guidance:
1. Form cues for the current set
2. Pacing and effort management
3. Motivation and encouragement
4. Adjustments based on fatigue level
5. Prep for the next set

Keep responses SHORT and ACTIONABLE — this is real-time coaching.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: buildSystemPrompt("workout_guidance"),
      temperature: 0.6,
      maxTokens: 512,
    });

    return this.parseChatResponse(response, "ask_form", "none", "motivated", validated.exercise);
  }

  async getMotivation(userProfile?: UserProfile, recentContext?: string): Promise<ChatResponse> {
    const prompt = `Provide motivational support:

${userProfile?.name ? `**User:** ${userProfile.name}` : ""}
${userProfile?.primaryGoal ? `**Goal:** ${userProfile.primaryGoal}` : ""}
${userProfile?.experienceLevel ? `**Level:** ${userProfile.experienceLevel}` : ""}
${recentContext ? `**Recent Context:** ${recentContext}` : ""}

Provide personalized motivation that:
1. Acknowledges their current state
2. Provides perspective and encouragement
3. Gives a concrete, small action they can take right now
4. Connects to their bigger goals
5. Is genuine and not preachy

Match the tone to their state — if frustrated, validate and redirect. If motivated, channel that energy.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: buildSystemPrompt("motivation", userProfile),
      temperature: 0.8,
      maxTokens: 1024,
    });

    return this.parseChatResponse(response, "need_motivation", "none", "motivated", recentContext ?? "motivation request");
  }

  async reportInjury(
    symptoms: string,
    userProfile?: UserProfile,
  ): Promise<ChatResponse> {
    const prompt = `Injury/Issue Report:

**Symptoms:** ${symptoms}
${userProfile?.injuries?.length ? `**Injury History:** ${userProfile.injuries.join(", ")}` : ""}

IMPORTANT: Provide responsible guidance:
1. Assess the severity based on described symptoms
2. Recommend immediate actions (RICE, rest, etc.)
3. Indicate when professional medical attention is needed
4. Provide safe modifications if appropriate
5. Do NOT diagnose — describe possible causes
6. Emphasize the importance of professional evaluation

If symptoms suggest a serious injury, strongly recommend seeking medical attention.`;

    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      systemPrompt: buildSystemPrompt("injury_consultation", userProfile),
      temperature: 0.3,
      maxTokens: 1024,
    });

    return this.parseChatResponse(response, "report_issue", "high", "negative", symptoms);
  }

  async streamChat(request: ChatRequest): AsyncGenerator<string> {
    const validated = ChatRequestSchema.parse(request);
    const systemPrompt = buildSystemPrompt(validated.context, validated.userProfile);
    const messages = this.buildConversationMessages(validated, systemPrompt);

    const stream = this.client.stream({
      messages,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 2048,
    });

    for await (const chunk of stream) {
      yield chunk.delta;
    }
  }

  // ---- Private helpers ---------------------------------------------------

  private buildConversationMessages(request: ChatRequest, systemPrompt: string): ChatMessage[] {
    const messages: ChatMessage[] = [];

    if (request.conversationHistory?.length) {
      for (const msg of request.conversationHistory.slice(-10)) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    let userMessage = request.message;

    if (request.currentWorkout) {
      userMessage += `\n\n[Current Workout Context: ${request.currentWorkout.exercise} — Set ${request.currentWorkout.sets}, ${request.currentWorkout.reps} reps @ ${request.currentWorkout.weight}kg${request.currentWorkout.rpe ? `, RPE ${request.currentWorkout.rpe}` : ""}]`;
    }

    messages.push({ role: "user", content: userMessage });
    return messages;
  }

  private parseChatResponse(
    response: AICompletionResponse,
    intent: MessageIntent,
    urgency: ChatResponse["urgency"],
    sentiment: ChatResponse["sentiment"],
    originalMessage: string,
  ): ChatResponse {
    const content = response.content;
    const followUpMatch = content.match(/(?:follow[- ]?up|additional|further|next)[\s:]*([\s\S]*?)(?:\n\n|$)/i);
    const actionMatch = content.match(/(?:action|step|do this|try)[\s:]*([\s\S]*?)(?:\n\n|$)/i);

    const tags: string[] = [intent];
    if (originalMessage.toLowerCase().includes("form")) tags.push("technique");
    if (originalMessage.toLowerCase().includes("diet")) tags.push("nutrition");
    if (originalMessage.toLowerCase().includes("program")) tags.push("programming");

    return {
      response: content,
      intent,
      confidence: Math.min(response.usage.totalTokens > 50 ? 0.85 : 0.6, 0.95),
      followUpQuestions: followUpMatch
        ? followUpMatch[1].split("\n").filter((l) => l.trim().startsWith("-") || l.trim().startsWith("*")).map((l) => l.replace(/^[\s-*]+/, "").trim()).slice(0, 3)
        : [],
      actionItems: actionMatch
        ? actionMatch[1].split("\n").filter((l) => l.trim().startsWith("-") || l.trim().startsWith("*")).map((l) => l.replace(/^[\s-*]+/, "").trim()).slice(0, 3)
        : [],
      relatedTopics: [],
      urgency,
      sentiment,
      tags,
    };
  }
}

// ---------------------------------------------------------------------------
// Convenience factory
// ---------------------------------------------------------------------------

export function getFitnessChat(client?: AIClient): FitnessChat {
  return new FitnessChat(client);
}
