import { z } from "zod";

// ---------------------------------------------------------------------------
// Types & Schemas
// ---------------------------------------------------------------------------

export const AIProviderSchema = z.enum(["openai", "anthropic", "gemini"]);
export type AIProvider = z.infer<typeof AIProviderSchema>;

export const MessageRoleSchema = z.enum(["system", "user", "assistant"]);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const ChatMessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
  name: z.string().optional(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ProviderConfigSchema = z.object({
  openai: z
    .object({
      apiKey: z.string().optional(),
      baseUrl: z.string().optional(),
      defaultModel: z.string().default("gpt-4o"),
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().int().positive().default(4096),
    })
    .optional(),
  anthropic: z
    .object({
      apiKey: z.string().optional(),
      baseUrl: z.string().optional(),
      defaultModel: z.string().default("claude-sonnet-4-20250514"),
      temperature: z.number().min(0).max(1).default(0.7),
      maxTokens: z.number().int().positive().default(4096),
    })
    .optional(),
  gemini: z
    .object({
      apiKey: z.string().optional(),
      baseUrl: z.string().optional(),
      defaultModel: z.string().default("gemini-1.5-pro"),
      temperature: z.number().min(0).max(2).default(0.7),
      maxTokens: z.number().int().positive().default(4096),
    })
    .optional(),
  fallbackOrder: z
    .array(AIProviderSchema)
    .default(["openai", "anthropic", "gemini"]),
});
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export interface AICompletionRequest {
  messages: ChatMessage[];
  provider?: AIProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json";
  systemPrompt?: string;
}

export interface AICompletionResponse {
  content: string;
  provider: AIProvider;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  finishReason: "stop" | "length" | "error";
}

export interface AIStreamChunk {
  delta: string;
  provider: AIProvider;
  model: string;
}

export interface ProviderHealth {
  provider: AIProvider;
  healthy: boolean;
  latencyMs: number;
  lastChecked: Date;
  errorRate: number;
}

// ---------------------------------------------------------------------------
// Provider-specific request/response interfaces
// ---------------------------------------------------------------------------

interface OpenAIMessage {
  role: string;
  content: string;
  name?: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature: number;
  max_tokens: number;
  response_format?: { type: "text" | "json_object" };
}

interface OpenAIResponse {
  choices: { message: { content: string }; finish_reason: string }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AnthropicMessage {
  role: string;
  content: string;
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  temperature: number;
  system?: string;
  messages: AnthropicMessage[];
}

interface AnthropicResponse {
  content: { type: string; text: string }[];
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  stop_reason: string;
}

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  parts: GeminiPart[];
  role: string;
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
    responseMimeType?: string;
  };
  systemInstruction?: { parts: GeminiPart[] };
}

interface GeminiResponse {
  candidates: {
    content: { parts: { text: string }[] };
    finishReason: string;
  }[];
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// ---------------------------------------------------------------------------
// Rate limiter
// ---------------------------------------------------------------------------

class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private lastRefill: number;

  constructor(maxTokens: number, refillRatePerSecond: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRatePerSecond;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      const waitMs = Math.ceil(((1 - this.tokens) / this.refillRate) * 1000);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      this.refill();
    }
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

// ---------------------------------------------------------------------------
// Circuit breaker
// ---------------------------------------------------------------------------

class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: "closed" | "open" | "half-open" = "closed";
  private readonly threshold: number;
  private readonly resetTimeoutMs: number;

  constructor(threshold: number, resetTimeoutMs: number) {
    this.threshold = threshold;
    this.resetTimeoutMs = resetTimeoutMs;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailure > this.resetTimeoutMs) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure(): void {
    this.failures += 1;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = "open";
    }
  }

  getState(): string {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }
}

// ---------------------------------------------------------------------------
// Response parsers
// ---------------------------------------------------------------------------

function parseOpenAIResponse(
  data: OpenAIResponse,
  provider: AIProvider,
  model: string,
  latencyMs: number,
): AICompletionResponse {
  const choice = data.choices[0];
  return {
    content: choice.message.content,
    provider,
    model,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
    latencyMs,
    finishReason: choice.finish_reason === "stop" ? "stop" : choice.finish_reason === "length" ? "length" : "error",
  };
}

function parseAnthropicResponse(
  data: AnthropicResponse,
  provider: AIProvider,
  model: string,
  latencyMs: number,
): AICompletionResponse {
  const textBlock = data.content.find((c) => c.type === "text") ?? data.content[0];
  return {
    content: textBlock?.text ?? "",
    provider,
    model,
    usage: {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens,
    },
    latencyMs,
    finishReason: data.stop_reason === "end_turn" ? "stop" : data.stop_reason === "max_tokens" ? "length" : "error",
  };
}

function parseGeminiResponse(
  data: GeminiResponse,
  provider: AIProvider,
  model: string,
  latencyMs: number,
): AICompletionResponse {
  const candidate = data.candidates[0];
  const text = candidate.content.parts.map((p) => p.text).join("");
  return {
    content: text,
    provider,
    model,
    usage: {
      promptTokens: data.usageMetadata.promptTokenCount,
      completionTokens: data.usageMetadata.candidatesTokenCount,
      totalTokens: data.usageMetadata.totalTokenCount,
    },
    latencyMs,
    finishReason: candidate.finishReason === "STOP" ? "stop" : candidate.finishReason === "MAX_TOKENS" ? "length" : "error",
  };
}

// ---------------------------------------------------------------------------
// Main AI Client
// ---------------------------------------------------------------------------

export class AIClient {
  private config: ProviderConfig;
  private rateLimiters: Map<AIProvider, RateLimiter> = new Map();
  private circuitBreakers: Map<AIProvider, CircuitBreaker> = new Map();
  private healthHistory: Map<AIProvider, ProviderHealth[]> = new Map();

  constructor(config?: Partial<ProviderConfig>) {
    this.config = ProviderConfigSchema.parse({
      openai: config?.openai ?? {
        apiKey: process.env.OPENAI_API_KEY,
        defaultModel: "gpt-4o",
        temperature: 0.7,
        maxTokens: 4096,
      },
      anthropic: config?.anthropic ?? {
        apiKey: process.env.ANTHROPIC_API_KEY,
        defaultModel: "claude-sonnet-4-20250514",
        temperature: 0.7,
        maxTokens: 4096,
      },
      gemini: config?.gemini ?? {
        apiKey: process.env.GEMINI_API_KEY,
        defaultModel: "gemini-1.5-pro",
        temperature: 0.7,
        maxTokens: 4096,
      },
      fallbackOrder: config?.fallbackOrder ?? ["openai", "anthropic", "gemini"],
    });

    const providers = ["openai", "anthropic", "gemini"] as AIProvider[];
    for (const provider of providers) {
      this.rateLimiters.set(provider, new RateLimiter(60, 1));
      this.circuitBreakers.set(provider, new CircuitBreaker(5, 60_000));
      this.healthHistory.set(provider, []);
    }
  }

  // ---- Public API --------------------------------------------------------

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const providers = request.provider
      ? [request.provider, ...this.config.fallbackOrder.filter((p) => p !== request.provider)]
      : this.config.fallbackOrder;

    const errors: Array<{ provider: AIProvider; error: unknown }> = [];

    for (const provider of providers) {
      try {
        return await this.completeWithProvider(provider, request);
      } catch (error) {
        errors.push({ provider, error });
        continue;
      }
    }

    throw new Error(
      `All providers failed: ${errors.map((e) => `${e.provider}: ${String(e.error)}`).join("; ")}`,
    );
  }

  async *stream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    const provider = request.provider ?? this.config.fallbackOrder[0];
    const config = this.getProviderConfig(provider);
    const model = request.model ?? config.defaultModel;

    await this.rateLimiters.get(provider)!.acquire();

    const messages = this.buildMessages(request);
    const startTime = Date.now();

    if (provider === "openai") {
      yield* this.streamOpenAI(messages, model, config, provider, request);
    } else if (provider === "anthropic") {
      yield* this.streamAnthropic(messages, model, config, provider, request);
    } else {
      yield* this.streamGemini(messages, model, config, provider, request);
    }

    void startTime;
  }

  async healthCheck(): Promise<ProviderHealth[]> {
    const results: ProviderHealth[] = [];
    const testMessages: ChatMessage[] = [{ role: "user", content: "Say hello in one word." }];

    for (const provider of this.config.fallbackOrder) {
      const startTime = Date.now();
      let healthy = false;

      try {
        const response = await this.completeWithProvider(provider, {
          messages: testMessages,
          provider,
          maxTokens: 10,
          temperature: 0,
        });
        healthy = response.content.length > 0;
      } catch {
        healthy = false;
      }

      const latencyMs = Date.now() - startTime;
      const health: ProviderHealth = {
        provider,
        healthy,
        latencyMs,
        lastChecked: new Date(),
        errorRate: this.calculateErrorRate(provider),
      };

      results.push(health);
      this.healthHistory.get(provider)!.push(health);
    }

    return results;
  }

  getOptimalProvider(): AIProvider {
    let bestProvider: AIProvider = this.config.fallbackOrder[0];
    let bestScore = -Infinity;

    for (const provider of this.config.fallbackOrder) {
      const history = this.healthHistory.get(provider) ?? [];
      const recent = history.slice(-10);
      if (recent.length === 0) continue;

      const avgLatency = recent.reduce((s, h) => s + h.latencyMs, 0) / recent.length;
      const uptimeRate = recent.filter((h) => h.healthy).length / recent.length;
      const score = uptimeRate * 1000 - avgLatency / 100;

      if (score > bestScore) {
        bestScore = score;
        bestProvider = provider;
      }
    }

    return bestProvider;
  }

  getUsageStats(): {
    totalRequests: number;
    totalTokens: number;
    byProvider: Record<AIProvider, { requests: number; tokens: number; avgLatency: number }>;
  } {
    const stats: {
      totalRequests: number;
      totalTokens: number;
      byProvider: Record<AIProvider, { requests: number; tokens: number; avgLatency: number }>;
    } = {
      totalRequests: 0,
      totalTokens: 0,
      byProvider: {
        openai: { requests: 0, tokens: 0, avgLatency: 0 },
        anthropic: { requests: 0, tokens: 0, avgLatency: 0 },
        gemini: { requests: 0, tokens: 0, avgLatency: 0 },
      },
    };

    for (const provider of ["openai", "anthropic", "gemini"] as AIProvider[]) {
      const history = this.healthHistory.get(provider) ?? [];
      const totalLatency = history.reduce((s, h) => s + h.latencyMs, 0);
      stats.byProvider[provider] = {
        requests: history.length,
        tokens: 0,
        avgLatency: history.length > 0 ? totalLatency / history.length : 0,
      };
      stats.totalRequests += history.length;
    }

    return stats;
  }

  // ---- Private helpers ---------------------------------------------------

  private getProviderConfig(provider: AIProvider) {
    const config = this.config[provider];
    if (!config) {
      throw new Error(`Provider ${provider} is not configured`);
    }
    return config;
  }

  private calculateErrorRate(provider: AIProvider): number {
    const history = this.healthHistory.get(provider) ?? [];
    if (history.length === 0) return 0;
    const recent = history.slice(-20);
    return recent.filter((h) => !h.healthy).length / recent.length;
  }

  private buildMessages(request: AICompletionRequest): ChatMessage[] {
    const messages: ChatMessage[] = [];

    if (request.systemPrompt) {
      messages.push({ role: "system", content: request.systemPrompt });
    }

    for (const msg of request.messages) {
      if (msg.role === "system" && messages.some((m) => m.role === "system")) continue;
      messages.push(msg);
    }

    return messages;
  }

  private async completeWithProvider(
    provider: AIProvider,
    request: AICompletionRequest,
  ): Promise<AICompletionResponse> {
    const config = this.getProviderConfig(provider);
    const model = request.model ?? config.defaultModel;
    const temperature = request.temperature ?? config.temperature;
    const maxTokens = request.maxTokens ?? config.maxTokens;
    const messages = this.buildMessages(request);

    await this.rateLimiters.get(provider)!.acquire();

    return this.circuitBreakers.get(provider)!.execute(async () => {
      const startTime = Date.now();

      if (provider === "openai") {
        return this.callOpenAI(messages, model, temperature, maxTokens, request.responseFormat, startTime);
      } else if (provider === "anthropic") {
        return this.callAnthropic(messages, model, temperature, maxTokens, request.systemPrompt, startTime);
      } else {
        return this.callGemini(messages, model, temperature, maxTokens, request.systemPrompt, startTime);
      }
    });
  }

  private async callOpenAI(
    messages: ChatMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    responseFormat: "text" | "json" | undefined,
    startTime: number,
  ): Promise<AICompletionResponse> {
    const config = this.getProviderConfig("openai");
    const baseUrl = config.baseUrl ?? "https://api.openai.com/v1";

    const body: OpenAIRequest = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content, name: m.name })),
      temperature,
      max_tokens: maxTokens,
    };

    if (responseFormat === "json") {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
    }

    const data: OpenAIResponse = await response.json();
    return parseOpenAIResponse(data, "openai", model, Date.now() - startTime);
  }

  private async callAnthropic(
    messages: ChatMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    systemPrompt: string | undefined,
    startTime: number,
  ): Promise<AICompletionResponse> {
    const config = this.getProviderConfig("anthropic");
    const baseUrl = config.baseUrl ?? "https://api.anthropic.com/v1";

    const nonSystemMessages = messages.filter((m) => m.role !== "system");
    const system = systemPrompt ?? messages.find((m) => m.role === "system")?.content;

    const body: AnthropicRequest = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: nonSystemMessages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    };

    if (system) {
      body.system = system;
    }

    const response = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${errorBody}`);
    }

    const data: AnthropicResponse = await response.json();
    return parseAnthropicResponse(data, "anthropic", model, Date.now() - startTime);
  }

  private async callGemini(
    messages: ChatMessage[],
    model: string,
    temperature: number,
    maxTokens: number,
    systemPrompt: string | undefined,
    startTime: number,
  ): Promise<AICompletionResponse> {
    const config = this.getProviderConfig("gemini");
    const baseUrl = config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";

    const contents: GeminiContent[] = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        parts: [{ text: m.content }],
        role: m.role === "assistant" ? "model" : "user",
      }));

    const body: GeminiRequest = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    };

    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const url = `${baseUrl}/models/${model}:generateContent?key=${config.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorBody}`);
    }

    const data: GeminiResponse = await response.json();
    return parseGeminiResponse(data, "gemini", model, Date.now() - startTime);
  }

  private async *streamOpenAI(
    messages: ChatMessage[],
    model: string,
    config: NonNullable<ProviderConfig["openai"]>,
    provider: AIProvider,
    request: AICompletionRequest,
  ): AsyncGenerator<AIStreamChunk> {
    const baseUrl = config.baseUrl ?? "https://api.openai.com/v1";

    const body: OpenAIRequest & { stream: boolean } = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content, name: m.name })),
      temperature: request.temperature ?? config.temperature,
      max_tokens: request.maxTokens ?? config.maxTokens,
      stream: true,
    };

    if (request.responseFormat === "json") {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI streaming error ${response.status}: ${errorBody}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const parsed = JSON.parse(trimmed.slice(6)) as OpenAIResponse;
          const delta = parsed.choices[0]?.delta;
          if (delta?.content) {
            yield { delta: delta.content, provider, model };
          }
        } catch {
          continue;
        }
      }
    }
  }

  private async *streamAnthropic(
    messages: ChatMessage[],
    model: string,
    config: NonNullable<ProviderConfig["anthropic"]>,
    provider: AIProvider,
    request: AICompletionRequest,
  ): AsyncGenerator<AIStreamChunk> {
    const baseUrl = config.baseUrl ?? "https://api.anthropic.com/v1";
    const nonSystemMessages = messages.filter((m) => m.role !== "system");
    const system = request.systemPrompt ?? messages.find((m) => m.role === "system")?.content;

    const body: AnthropicRequest & { stream: true } = {
      model,
      max_tokens: request.maxTokens ?? config.maxTokens,
      temperature: request.temperature ?? config.temperature,
      messages: nonSystemMessages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
      stream: true,
    };

    if (system) body.system = system;

    const response = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic streaming error ${response.status}: ${errorBody}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        try {
          const parsed = JSON.parse(trimmed.slice(6)) as { type: string; delta?: { text?: string } };
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            yield { delta: parsed.delta.text, provider, model };
          }
        } catch {
          continue;
        }
      }
    }
  }

  private async *streamGemini(
    messages: ChatMessage[],
    model: string,
    config: NonNullable<ProviderConfig["gemini"]>,
    provider: AIProvider,
    request: AICompletionRequest,
  ): AsyncGenerator<AIStreamChunk> {
    const baseUrl = config.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
    const contents: GeminiContent[] = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        parts: [{ text: m.content }],
        role: m.role === "assistant" ? "model" : "user",
      }));

    const body: GeminiRequest & { stream: boolean } = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? config.temperature,
        maxOutputTokens: request.maxTokens ?? config.maxTokens,
      },
      stream: true,
    };

    if (request.systemPrompt) {
      body.systemInstruction = { parts: [{ text: request.systemPrompt }] };
    }

    const url = `${baseUrl}/models/${model}:streamGenerateContent?key=${config.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini streaming error ${response.status}: ${errorBody}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const jsonStart = buffer.indexOf("[");
      const jsonEnd = buffer.lastIndexOf("]");
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        try {
          const chunk = JSON.parse(buffer.slice(jsonStart, jsonEnd + 1)) as GeminiResponse[];
          for (const item of chunk) {
            const text = item.candidates?.[0]?.content?.parts?.map((p) => p.text).join("");
            if (text) {
              yield { delta: text, provider, model };
            }
          }
          buffer = "";
        } catch {
          continue;
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton & factory
// ---------------------------------------------------------------------------

let defaultClient: AIClient | null = null;

export function getAIClient(config?: Partial<ProviderConfig>): AIClient {
  if (!defaultClient) {
    defaultClient = new AIClient(config);
  }
  return defaultClient;
}

export function resetAIClient(): void {
  defaultClient = null;
}
