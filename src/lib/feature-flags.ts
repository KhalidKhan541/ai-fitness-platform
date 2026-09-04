export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  rolloutPercentage?: number;
  allowedUsers?: string[];
  allowedPlans?: string[];
  startDate?: string;
  endDate?: string;
  variants?: FeatureVariant[];
  metadata?: Record<string, unknown>;
}

export interface FeatureVariant {
  id: string;
  name: string;
  weight: number;
  payload?: Record<string, unknown>;
}

export interface FeatureFlagContext {
  userId?: string;
  plan?: string;
  environment?: string;
  attributes?: Record<string, unknown>;
}

const DEFAULT_FLAGS: Record<string, FeatureFlag> = {
  "ai-workout-generation": {
    key: "ai-workout-generation",
    enabled: true,
    description: "AI-powered workout generation",
    allowedPlans: ["pro_monthly", "pro_yearly", "elite_monthly", "elite_yearly"],
  },
  "nutrition-tracking": {
    key: "nutrition-tracking",
    enabled: true,
    description: "Nutrition and meal tracking",
  },
  "social-feed": {
    key: "social-feed",
    enabled: true,
    description: "Social feed and community features",
  },
  "challenges": {
    key: "challenges",
    enabled: true,
    description: "Fitness challenges and competitions",
  },
  "advanced-analytics": {
    key: "advanced-analytics",
    enabled: true,
    description: "Advanced analytics and insights",
    allowedPlans: ["pro_monthly", "pro_yearly", "elite_monthly", "elite_yearly"],
  },
  "video-form-analysis": {
    key: "video-form-analysis",
    enabled: false,
    description: "AI video form analysis",
    allowedPlans: ["elite_monthly", "elite_yearly"],
    rolloutPercentage: 50,
  },
  "personal-ai-coach": {
    key: "personal-ai-coach",
    enabled: false,
    description: "Personal AI coaching assistant",
    allowedPlans: ["elite_monthly", "elite_yearly"],
  },
  "dark-mode": {
    key: "dark-mode",
    enabled: true,
    description: "Dark mode theme",
  },
  "beta-features": {
    key: "beta-features",
    enabled: false,
    description: "Beta feature access",
    rolloutPercentage: 10,
  },
  "maintenance-mode": {
    key: "maintenance-mode",
    enabled: false,
    description: "Maintenance mode toggle",
  },
};

let featureFlags: Record<string, FeatureFlag> = { ...DEFAULT_FLAGS };
let flagOverrides: Record<string, boolean> = {};

export function initFeatureFlags(
  remoteFlags?: Record<string, Partial<FeatureFlag>>
): void {
  featureFlags = { ...DEFAULT_FLAGS };
  if (remoteFlags) {
    for (const [key, flag] of Object.entries(remoteFlags)) {
      featureFlags[key] = {
        ...featureFlags[key],
        ...flag,
        key,
      };
    }
  }
  loadOverrides();
}

function loadOverrides(): void {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("feature_flag_overrides");
      if (stored) {
        flagOverrides = JSON.parse(stored);
      }
    }
  } catch {
    flagOverrides = {};
  }
}

function saveOverrides(): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "feature_flag_overrides",
        JSON.stringify(flagOverrides)
      );
    }
  } catch {
    // silent fail
  }
}

export function isFeatureEnabled(
  key: string,
  context?: FeatureFlagContext
): boolean {
  if (key in flagOverrides) {
    return flagOverrides[key];
  }

  const flag = featureFlags[key];
  if (!flag) return false;

  if (!flag.enabled) return false;

  if (flag.startDate && new Date(flag.startDate) > new Date()) return false;
  if (flag.endDate && new Date(flag.endDate) < new Date()) return false;

  if (flag.allowedPlans && flag.allowedPlans.length > 0) {
    if (!context?.plan || !flag.allowedPlans.includes(context.plan)) {
      return false;
    }
  }

  if (flag.allowedUsers && flag.allowedUsers.length > 0) {
    if (!context?.userId || !flag.allowedUsers.includes(context.userId)) {
      return false;
    }
  }

  if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
    const identifier = context?.userId || "anonymous";
    const hash = simpleHash(identifier + key);
    const percentage = (hash % 100) + 1;
    if (percentage > flag.rolloutPercentage) return false;
  }

  return true;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getFeatureVariant(
  key: string,
  context?: FeatureFlagContext
): FeatureVariant | null {
  if (!isFeatureEnabled(key, context)) return null;

  const flag = featureFlags[key];
  if (!flag?.variants || flag.variants.length === 0) return null;

  const identifier = context?.userId || "anonymous";
  const hash = simpleHash(identifier + key + "variant");
  const totalWeight = flag.variants.reduce((sum, v) => sum + v.weight, 0);
  let target = (hash % totalWeight);

  for (const variant of flag.variants) {
    target -= variant.weight;
    if (target <= 0) return variant;
  }

  return flag.variants[0];
}

export function getFeatureFlags(
  context?: FeatureFlagContext
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const key of Object.keys(featureFlags)) {
    result[key] = isFeatureEnabled(key, context);
  }
  return result;
}

export function getAllFeatureFlags(): FeatureFlag[] {
  return Object.values(featureFlags);
}

export function setFeatureFlagOverride(key: string, enabled: boolean): void {
  flagOverrides[key] = enabled;
  saveOverrides();
}

export function clearFeatureFlagOverride(key: string): void {
  delete flagOverrides[key];
  saveOverrides();
}

export function clearAllOverrides(): void {
  flagOverrides = {};
  saveOverrides();
}

export function getFlagOverrides(): Record<string, boolean> {
  return { ...flagOverrides };
}

export function trackFeatureFlagImpression(
  key: string,
  context?: FeatureFlagContext
): void {
  const enabled = isFeatureEnabled(key, context);
  const variant = getFeatureVariant(key, context);

  if (typeof window !== "undefined") {
    const event = new CustomEvent("feature-flag-impression", {
      detail: {
        key,
        enabled,
        variant: variant?.id,
        userId: context?.userId,
        timestamp: new Date().toISOString(),
      },
    });
    window.dispatchEvent(event);
  }
}

export function createFeatureFlagMiddleware() {
  return {
    check: (key: string, context?: FeatureFlagContext) =>
      isFeatureEnabled(key, context),
    getVariant: (key: string, context?: FeatureFlagContext) =>
      getFeatureVariant(key, context),
    setOverride: setFeatureFlagOverride,
    clearOverride: clearFeatureFlagOverride,
    getAll: (context?: FeatureFlagContext) => getFeatureFlags(context),
  };
}

export function exportFeatureFlags(): Record<string, FeatureFlag> {
  return { ...featureFlags };
}

export function importFeatureFlags(flags: Record<string, FeatureFlag>): void {
  featureFlags = { ...flags };
}
