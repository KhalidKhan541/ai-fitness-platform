type MetricValue = number;

interface MetricEntry {
  name: string;
  value: MetricValue;
  tags?: Record<string, string>;
  timestamp: Date;
}

interface TimerEntry {
  name: string;
  startTime: number;
  tags?: Record<string, string>;
}

class MonitoringService {
  private metrics: MetricEntry[] = [];
  private timers: Map<string, TimerEntry> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window === "undefined") {
      this.startFlushInterval();
    }
  }

  private startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000);
  }

  private flush() {
    if (this.metrics.length === 0) return;
    const batch = [...this.metrics];
    this.metrics = [];

    console.info("[Metrics]", JSON.stringify(batch));
  }

  increment(name: string, value: number = 1, tags?: Record<string, string>) {
    this.metrics.push({
      name,
      value,
      tags,
      timestamp: new Date(),
    });
  }

  gauge(name: string, value: MetricValue, tags?: Record<string, string>) {
    this.metrics.push({
      name,
      value,
      tags,
      timestamp: new Date(),
    });
  }

  histogram(name: string, value: MetricValue, tags?: Record<string, string>) {
    this.metrics.push({
      name,
      value,
      tags,
      timestamp: new Date(),
    });
  }

  startTimer(name: string, tags?: Record<string, string>) {
    this.timers.set(name, {
      name,
      startTime: performance.now(),
      tags,
    });
  }

  endTimer(name: string): number {
    const timer = this.timers.get(name);
    if (!timer) return 0;

    const duration = performance.now() - timer.startTime;
    this.timers.delete(name);

    this.histogram(`${name}.duration_ms`, duration, timer.tags);

    return duration;
  }

  recordError(error: Error, context?: Record<string, any>) {
    this.increment("errors.total", 1, {
      error_type: error.name,
      error_message: error.message.slice(0, 200),
      ...context,
    });

    console.error("[Error]", error.message, context);
  }

  recordRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number
  ) {
    this.histogram("http.request.duration_ms", duration, {
      method,
      path,
      status_code: statusCode.toString(),
    });

    this.increment("http.request.total", 1, {
      method,
      path,
      status_code: statusCode.toString(),
    });

    if (statusCode >= 400) {
      this.increment("http.errors.total", 1, {
        method,
        path,
        status_code: statusCode.toString(),
      });
    }
  }

  recordDatabaseQuery(query: string, duration: number, success: boolean) {
    this.histogram("db.query.duration_ms", duration, {
      query: query.slice(0, 100),
      success: success.toString(),
    });

    if (!success) {
      this.increment("db.query.errors", 1);
    }
  }

  recordAIRequest(
    model: string,
    duration: number,
    tokens: number,
    success: boolean
  ) {
    this.histogram("ai.request.duration_ms", duration, {
      model,
      success: success.toString(),
    });

    this.histogram("ai.tokens.used", tokens, { model });

    if (!success) {
      this.increment("ai.request.errors", 1, { model });
    }
  }

  recordBusinessMetric(name: string, value: number, metadata?: Record<string, any>) {
    this.gauge(`business.${name}`, value, metadata);
  }

  getMetrics(): MetricEntry[] {
    return [...this.metrics];
  }

  getTimerDurations(): Record<string, number> {
    const durations: Record<string, number> = {};
    for (const [name, timer] of this.timers) {
      durations[name] = performance.now() - timer.startTime;
    }
    return durations;
  }

  clear() {
    this.metrics = [];
    this.timers.clear();
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }
}

export const monitoring = new MonitoringService();

export function trackRequest(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const startTime = performance.now();
    const method = req.method;
    const url = new URL(req.url);
    const path = url.pathname;

    try {
      const response = await handler(req);
      const duration = performance.now() - startTime;

      monitoring.recordRequest(method, path, response.status, duration);

      return response;
    } catch (error) {
      const duration = performance.now() - startTime;
      monitoring.recordRequest(method, path, 500, duration);
      monitoring.recordError(error as Error, { method, path });

      throw error;
    }
  };
}
