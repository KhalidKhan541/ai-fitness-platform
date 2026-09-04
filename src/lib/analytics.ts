export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
  timestamp?: string;
  userId?: string;
  sessionId?: string;
}

export interface AnalyticsConfig {
  writeKey?: string;
  endpoint?: string;
  debug?: boolean;
  flushInterval?: number;
  maxQueueSize?: number;
}

export interface UserProperties {
  id?: string;
  email?: string;
  name?: string;
  plan?: string;
  joinedAt?: string;
  [key: string]: unknown;
}

const DEFAULT_CONFIG: AnalyticsConfig = {
  writeKey: process.env.NEXT_PUBLIC_ANALYTICS_KEY || "",
  endpoint: process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT || "https://api.aifitness.app/analytics",
  debug: process.env.NODE_ENV === "development",
  flushInterval: 30000,
  maxQueueSize: 100,
};

let config: AnalyticsConfig = { ...DEFAULT_CONFIG };
let eventQueue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let sessionId: string = "";
let userId: string = "";

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function initAnalytics(userConfig: Partial<AnalyticsConfig> = {}): void {
  config = { ...DEFAULT_CONFIG, ...userConfig };
  sessionId = generateSessionId();
  eventQueue = [];

  if (config.flushInterval && config.flushInterval > 0) {
    flushTimer = setInterval(flush, config.flushInterval);
  }
}

export function setAnalyticsUser(id: string, properties?: UserProperties): void {
  userId = id;
  track("user_identified", { userId: id, ...properties });
}

export function clearAnalyticsUser(): void {
  track("user_logged_out", { userId });
  userId = "";
  sessionId = generateSessionId();
}

export function track(
  event: string,
  properties?: Record<string, unknown>
): void {
  const analyticsEvent: AnalyticsEvent = {
    event,
    properties: {
      ...properties,
      app: "ai-fitness-platform",
      environment: process.env.NODE_ENV,
    },
    timestamp: new Date().toISOString(),
    userId: userId || undefined,
    sessionId,
  };

  if (config.debug) {
    console.log("[Analytics]", event, properties);
  }

  eventQueue.push(analyticsEvent);

  if (eventQueue.length >= (config.maxQueueSize || 100)) {
    flush();
  }
}

export function trackPageView(
  page: string,
  properties?: Record<string, unknown>
): void {
  track("page_viewed", {
    page,
    ...properties,
  });
}

export function trackWorkout(properties: {
  workoutId: string;
  type: string;
  duration: number;
  exercises: number;
  calories?: number;
}): void {
  track("workout_completed", properties);
}

export function trackNutrition(properties: {
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}): void {
  track("meal_logged", properties);
}

export function trackProgress(properties: {
  type: "weight" | "measurement" | "photo";
  value?: number;
  unit?: string;
}): void {
  track("progress_recorded", properties);
}

export function trackGoal(properties: {
  goalId: string;
  type: string;
  action: "created" | "achieved" | "updated";
}): void {
  track("goal_action", properties);
}

export function trackChallenge(properties: {
  challengeId: string;
  action: "joined" | "completed" | "left";
  position?: number;
}): void {
  track("challenge_action", properties);
}

export function trackAchievement(properties: {
  achievementId: string;
  name: string;
  xp: number;
}): void {
  track("achievement_unlocked", properties);
}

export function trackSocial(properties: {
  action: "post_created" | "liked" | "commented" | "shared";
  contentType?: string;
  contentId?: string;
}): void {
  track("social_action", properties);
}

export function trackFeatureUsage(
  feature: string,
  properties?: Record<string, unknown>
): void {
  track("feature_used", { feature, ...properties });
}

export function trackError(
  error: string,
  properties?: Record<string, unknown>
): void {
  track("error_occurred", { error, ...properties });
}

export function trackPerformance(
  metric: string,
  value: number,
  unit: string = "ms"
): void {
  track("performance_metric", { metric, value, unit });
}

export async function flush(): Promise<void> {
  if (eventQueue.length === 0) return;

  const events = [...eventQueue];
  eventQueue = [];

  try {
    await fetch(config.endpoint || DEFAULT_CONFIG.endpoint!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.writeKey}`,
      },
      body: JSON.stringify({ batch: events }),
    });
  } catch {
    eventQueue = [...events, ...eventQueue];
  }
}

export async function shutdown(): Promise<void> {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  await flush();
}

export function getSessionId(): string {
  return sessionId;
}

export function getUserId(): string {
  return userId;
}

export function getQueueSize(): number {
  return eventQueue.length;
}

export function createAnalyticsDashboard(): {
  getEvents: () => AnalyticsEvent[];
  getEventCount: (event: string) => number;
  getEventsByUser: (uid: string) => AnalyticsEvent[];
  getEventsByTimeRange: (start: Date, end: Date) => AnalyticsEvent[];
  getMostTrackedEvents: (limit: number) => Array<{ event: string; count: number }>;
} {
  const allEvents: AnalyticsEvent[] = [];

  const originalTrack = track;
  const proxy = (...args: Parameters<typeof originalTrack>) => {
    originalTrack(...args);
    const lastEvent = eventQueue[eventQueue.length - 1];
    if (lastEvent) allEvents.push(lastEvent);
  };

  return {
    getEvents: () => [...allEvents],
    getEventCount: (event: string) =>
      allEvents.filter((e) => e.event === event).length,
    getEventsByUser: (uid: string) =>
      allEvents.filter((e) => e.userId === uid),
    getEventsByTimeRange: (start: Date, end: Date) =>
      allEvents.filter((e) => {
        const t = new Date(e.timestamp || "");
        return t >= start && t <= end;
      }),
    getMostTrackedEvents: (limit: number = 10) => {
      const counts: Record<string, number> = {};
      for (const e of allEvents) {
        counts[e.event] = (counts[e.event] || 0) + 1;
      }
      return Object.entries(counts)
        .map(([event, count]) => ({ event, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    },
  };
}

export { proxy as trackProxied };
