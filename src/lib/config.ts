import { z } from "zod";

// ─── Environment Schema ───────────────────────────────

const envSchema = z.object({
  // ── App ──
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("APP_URL must be a valid URL")
    .default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("AI Fitness Platform"),

  // ── Database ──
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid PostgreSQL connection string"),
  DATABASE_DIRECT_URL: z
    .string()
    .url("DATABASE_DIRECT_URL must be a valid URL")
    .optional(),

  // ── NextAuth ──
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),

  // ── OAuth Providers ──
  AUTH_GITHUB_ID: z.string().min(1, "GitHub client ID is required"),
  AUTH_GITHUB_SECRET: z.string().min(1, "GitHub client secret is required"),
  AUTH_GOOGLE_ID: z.string().min(1, "Google client ID is required"),
  AUTH_GOOGLE_SECRET: z.string().min(1, "Google client secret is required"),

  // ── Stripe ──
  STRIPE_SECRET_KEY: z.string().startsWith("sk_", "Invalid Stripe secret key"),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_", "Invalid Stripe publishable key"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_", "Invalid Stripe webhook secret"),
  STRIPE_PRO_PRICE_ID: z.string().min(1),
  STRIPE_COACH_PRICE_ID: z.string().min(1),
  STRIPE_ENTERPRISE_PRICE_ID: z.string().min(1),

  // ── AI / LLM ──
  OPENAI_API_KEY: z.string().startsWith("sk-", "Invalid OpenAI API key").optional(),
  AI_MODEL: z.string().default("gpt-4-turbo-preview"),
  AI_MAX_TOKENS: z.coerce.number().int().min(1).max(128000).default(4096),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),

  // ── Redis ──
  REDIS_URL: z.string().url("REDIS_URL must be a valid Redis connection string").optional(),
  REDIS_TOKEN: z.string().optional(),

  // ── Socket.IO ──
  SOCKET_IO_PORT: z.coerce.number().int().min(1024).max(65535).default(3001),

  // ── Email ──
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().email().default("noreply@aifitnessplatform.com"),

  // ── Uploads ──
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().min(1).max(100).default(10),
  UPLOAD_DIR: z.string().default("./public/uploads"),

  // ── Analytics ──
  ANALYTICS_ENABLED: z.coerce.boolean().default(true),
  POSTHOG_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().optional(),

  // ── Monitoring ──
  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "fatal"]).default("info"),

  // ── Feature Flags ──
  FEATURE_AI_TRAINER: z.coerce.boolean().default(true),
  FEATURE_SOCIAL_FEED: z.coerce.boolean().default(true),
  FEATURE_WEARABLE_SYNC: z.coerce.boolean().default(true),
  FEATURE_CHALLENGES: z.coerce.boolean().default(true),
  FEATURE_COACH_MODE: z.coerce.boolean().default(true),

  // ── Rate Limiting ──
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().default(60 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().default(100),
});

// ─── Parse Environment ────────────────────────────────

function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .map((e) => `  ${e.path.join(".")}: ${e.message}`)
        .join("\n");

      console.error("\n❌ Invalid environment variables:\n");
      console.error(missingVars);
      console.error("\n📋 Copy .env.example to .env and fill in the values.\n");

      if (process.env.NODE_ENV === "production") {
        process.exit(1);
      }
    }
    throw error;
  }
}

// ─── Validated Config ─────────────────────────────────

const env = validateEnv();

export const config = {
  // ── App ──
  app: {
    env: env.NODE_ENV,
    url: env.NEXT_PUBLIC_APP_URL,
    name: env.NEXT_PUBLIC_APP_NAME,
    isDev: env.NODE_ENV === "development",
    isProd: env.NODE_ENV === "production",
    isTest: env.NODE_ENV === "test",
  },

  // ── Database ──
  database: {
    url: env.DATABASE_URL,
    directUrl: env.DATABASE_DIRECT_URL,
  },

  // ── Auth ──
  auth: {
    secret: env.NEXTAUTH_SECRET,
    url: env.NEXTAUTH_URL,
    githubClientId: env.AUTH_GITHUB_ID,
    githubClientSecret: env.AUTH_GITHUB_SECRET,
    googleClientId: env.AUTH_GOOGLE_ID,
    googleClientSecret: env.AUTH_GOOGLE_SECRET,
    sessionMaxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // ── Stripe ──
  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    publishableKey: env.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    prices: {
      pro: env.STRIPE_PRO_PRICE_ID,
      coach: env.STRIPE_COACH_PRICE_ID,
      enterprise: env.STRIPE_ENTERPRISE_PRICE_ID,
    },
  },

  // ── AI ──
  ai: {
    apiKey: env.OPENAI_API_KEY,
    model: env.AI_MODEL,
    maxTokens: env.AI_MAX_TOKENS,
    temperature: env.AI_TEMPERATURE,
  },

  // ── Redis ──
  redis: {
    url: env.REDIS_URL,
    token: env.REDIS_TOKEN,
    enabled: !!env.REDIS_URL,
  },

  // ── Socket.IO ──
  socket: {
    port: env.SOCKET_IO_PORT,
  },

  // ── Email ──
  email: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    from: env.EMAIL_FROM,
    enabled: !!env.SMTP_HOST,
  },

  // ── Uploads ──
  upload: {
    maxSizeMB: env.MAX_UPLOAD_SIZE_MB,
    maxSizeBytes: env.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    dir: env.UPLOAD_DIR,
    allowedImageTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    allowedDocumentTypes: ["application/pdf", "text/csv"],
  },

  // ── Analytics ──
  analytics: {
    enabled: env.ANALYTICS_ENABLED,
    posthogKey: env.POSTHOG_KEY,
    posthogHost: env.POSTHOG_HOST,
  },

  // ── Monitoring ──
  monitoring: {
    sentryDsn: env.SENTRY_DSN,
    logLevel: env.LOG_LEVEL,
    enabled: !!env.SENTRY_DSN,
  },

  // ── Feature Flags ──
  features: {
    aiTrainer: env.FEATURE_AI_TRAINER,
    socialFeed: env.FEATURE_SOCIAL_FEED,
    wearableSync: env.FEATURE_WEARABLE_SYNC,
    challenges: env.FEATURE_CHALLENGES,
    coachMode: env.FEATURE_COACH_MODE,
  },

  // ── Rate Limiting ──
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },
} as const;

// ─── Subscription Tiers ───────────────────────────────

export const SUBSCRIPTION_LIMITS = {
  FREE: {
    workoutsPerMonth: 10,
    customExercises: 5,
    goals: 3,
    plans: 1,
    challenges: 2,
    aiMessagesPerDay: 5,
    storageMB: 100,
    socialPostsPerDay: 5,
  },
  PRO: {
    workoutsPerMonth: Infinity,
    customExercises: Infinity,
    goals: Infinity,
    plans: Infinity,
    challenges: Infinity,
    aiMessagesPerDay: 100,
    storageMB: 5000,
    socialPostsPerDay: Infinity,
  },
  COACH: {
    workoutsPerMonth: Infinity,
    customExercises: Infinity,
    goals: Infinity,
    plans: Infinity,
    challenges: Infinity,
    aiMessagesPerDay: Infinity,
    storageMB: 50000,
    socialPostsPerDay: Infinity,
    maxAthletes: 50,
  },
  ENTERPRISE: {
    workoutsPerMonth: Infinity,
    customExercises: Infinity,
    goals: Infinity,
    plans: Infinity,
    challenges: Infinity,
    aiMessagesPerDay: Infinity,
    storageMB: Infinity,
    socialPostsPerDay: Infinity,
    maxAthletes: Infinity,
  },
} as const;

// ─── API Constants ────────────────────────────────────

export const API_CONSTANTS = {
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 20,
  MAX_BULK_OPERATIONS: 100,
  CACHE_TTL_SHORT: 60, // 1 minute
  CACHE_TTL_MEDIUM: 300, // 5 minutes
  CACHE_TTL_LONG: 3600, // 1 hour
  CACHE_TTL_DAY: 86400, // 24 hours
  WEBSOCKET_RECONNECT_DELAY: 3000,
  WEBSOCKET_MAX_RECONNECT_ATTEMPTS: 10,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 1000,
} as const;

// ─── Color Constants ──────────────────────────────────

export const MUSCLE_GROUP_COLORS: Record<string, string> = {
  CHEST: "#ef4444",
  BACK: "#3b82f6",
  SHOULDERS: "#f59e0b",
  BICEPS: "#8b5cf6",
  TRICEPS: "#8b5cf6",
  FOREARMS: "#a855f7",
  ABS: "#ec4899",
  OBLIQUES: "#f472b6",
  QUADRICEPS: "#22c55e",
  HAMSTRINGS: "#16a34a",
  CALVES: "#15803d",
  GLUTES: "#14b8a6",
  TRAPS: "#6366f1",
  LATS: "#0ea5e9",
  FULL_BODY: "#64748b",
  OTHER: "#9ca3af",
};

export const WORKOUT_TYPE_COLORS: Record<string, string> = {
  STRENGTH: "#ef4444",
  CARDIO: "#3b82f6",
  FLEXIBILITY: "#a855f7",
  HIIT: "#f97316",
  CROSSFIT: "#14b8a6",
  YOGA: "#8b5cf6",
  PILATES: "#ec4899",
  SWIMMING: "#06b6d4",
  CYCLING: "#22c55e",
  RUNNING: "#f59e0b",
  WALKING: "#84cc16",
  SPORTS: "#6366f1",
  CUSTOM: "#64748b",
  REST_DAY: "#9ca3af",
};

// ─── Validation Helpers ───────────────────────────────

export function getEnvironmentVariable(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getOptionalEnvironmentVariable(
  key: string,
  defaultValue?: string,
): string | undefined {
  return process.env[key] ?? defaultValue;
}

export function isFeatureEnabled(feature: keyof typeof config.features): boolean {
  return config.features[feature];
}

export default config;
