// ─── Log Levels ───────────────────────────────────────

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR",
  [LogLevel.FATAL]: "FATAL",
};

// ─── Log Entry Types ──────────────────────────────────

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  requestId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    statusCode?: number;
  };
  duration?: number;
  service?: string;
}

export interface LoggerOptions {
  level?: LogLevel;
  context?: string;
  service?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  filePath?: string;
  maxFileSize?: number;
  maxFiles?: number;
  redactFields?: string[];
}

// ─── Sensitive Fields to Redact ───────────────────────

const DEFAULT_REDACT_FIELDS = [
  "password",
  "passwordHash",
  "accessToken",
  "refreshToken",
  "secret",
  "apiKey",
  "api_key",
  "token",
  "authorization",
  "creditCard",
  "cardNumber",
  "cvv",
  "ssn",
];

// ─── Logger Class ─────────────────────────────────────

export class Logger {
  private level: LogLevel;
  private context: string;
  private service: string;
  private enableConsole: boolean;
  private enableFile: boolean;
  private redactFields: string[];

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? this.getLogLevelFromEnv();
    this.context = options.context ?? "app";
    this.service = options.service ?? "ai-fitness-platform";
    this.enableConsole = options.enableConsole ?? true;
    this.enableFile = options.enableFile ?? false;
    this.redactFields = options.redactFields ?? DEFAULT_REDACT_FIELDS;
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case "DEBUG":
        return LogLevel.DEBUG;
      case "INFO":
        return LogLevel.INFO;
      case "WARN":
        return LogLevel.WARN;
      case "ERROR":
        return LogLevel.ERROR;
      case "FATAL":
        return LogLevel.FATAL;
      default:
        return process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatEntry(entry: LogEntry): string {
    const base = {
      timestamp: entry.timestamp,
      level: LOG_LEVEL_NAMES[entry.level],
      context: entry.context,
      service: entry.service,
      message: entry.message,
    };

    const extra: Record<string, unknown> = {};

    if (entry.requestId) {
      extra.requestId = entry.requestId;
    }
    if (entry.userId) {
      extra.userId = entry.userId;
    }
    if (entry.metadata) {
      extra.metadata = this.redactSensitive(entry.metadata);
    }
    if (entry.error) {
      extra.error = entry.error;
    }
    if (entry.duration !== undefined) {
      extra.duration = `${entry.duration}ms`;
    }

    return JSON.stringify({ ...base, ...extra });
  }

  private redactSensitive(data: Record<string, unknown>): Record<string, unknown> {
    const redacted = { ...data };

    for (const key of Object.keys(redacted)) {
      if (this.redactFields.includes(key.toLowerCase())) {
        const value = redacted[key];
        if (typeof value === "string") {
          redacted[key] = value.length > 4
            ? `${"*".repeat(value.length - 4)}${value.slice(-4)}`
            : "****";
        } else {
          redacted[key] = "[REDACTED]";
        }
      } else if (
        typeof redacted[key] === "object" &&
        redacted[key] !== null &&
        !Array.isArray(redacted[key])
      ) {
        redacted[key] = this.redactSensitive(
          redacted[key] as Record<string, unknown>,
        );
      }
    }

    return redacted;
  }

  private write(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formatted = this.formatEntry(entry);

    if (this.enableConsole) {
      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(formatted);
          break;
        case LogLevel.INFO:
          console.info(formatted);
          break;
        case LogLevel.WARN:
          console.warn(formatted);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(formatted);
          break;
      }
    }
  }

  private createEntry(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: Error,
    requestId?: string,
    userId?: string,
    duration?: number,
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      service: this.service,
    };

    if (requestId) {
      entry.requestId = requestId;
    }
    if (userId) {
      entry.userId = userId;
    }
    if (metadata && Object.keys(metadata).length > 0) {
      entry.metadata = metadata;
    }
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as Error & { code?: string }).code,
        statusCode: (error as Error & { statusCode?: number }).statusCode,
      };
    }
    if (duration !== undefined) {
      entry.duration = duration;
    }

    return entry;
  }

  // ── Public Methods ──

  debug(
    message: string,
    metadata?: Record<string, unknown>,
    requestId?: string,
    userId?: string,
  ): void {
    this.write(this.createEntry(LogLevel.DEBUG, message, metadata, undefined, requestId, userId));
  }

  info(
    message: string,
    metadata?: Record<string, unknown>,
    requestId?: string,
    userId?: string,
  ): void {
    this.write(this.createEntry(LogLevel.INFO, message, metadata, undefined, requestId, userId));
  }

  warn(
    message: string,
    metadata?: Record<string, unknown>,
    requestId?: string,
    userId?: string,
  ): void {
    this.write(this.createEntry(LogLevel.WARN, message, metadata, undefined, requestId, userId));
  }

  error(
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>,
    requestId?: string,
    userId?: string,
  ): void {
    this.write(this.createEntry(LogLevel.ERROR, message, metadata, error, requestId, userId));
  }

  fatal(
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>,
    requestId?: string,
    userId?: string,
  ): void {
    this.write(this.createEntry(LogLevel.FATAL, message, metadata, error, requestId, userId));
  }

  // ── Specialized Methods ──

  /**
   * Log an API request.
   */
  request(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    requestId?: string,
    userId?: string,
    metadata?: Record<string, unknown>,
  ): void {
    const level = statusCode >= 500 ? LogLevel.ERROR
      : statusCode >= 400 ? LogLevel.WARN
      : LogLevel.INFO;

    this.write(this.createEntry(
      level,
      `${method} ${path} ${statusCode}`,
      { method, path, statusCode, ...metadata },
      undefined,
      requestId,
      userId,
      duration,
    ));
  }

  /**
   * Log a database query.
   */
  query(
    operation: string,
    table: string,
    duration: number,
    requestId?: string,
    metadata?: Record<string, unknown>,
  ): void {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.DEBUG;

    this.write(this.createEntry(
      level,
      `DB ${operation} on ${table}`,
      { operation, table, ...metadata },
      undefined,
      requestId,
      undefined,
      duration,
    ));
  }

  /**
   * Log an authentication event.
   */
  auth(
    event: string,
    userId?: string,
    metadata?: Record<string, unknown>,
    requestId?: string,
  ): void {
    this.write(this.createEntry(
      LogLevel.INFO,
      `Auth: ${event}`,
      { event, ...metadata },
      undefined,
      requestId,
      userId,
    ));
  }

  /**
   * Log a performance metric.
   */
  performance(
    metric: string,
    value: number,
    unit: string = "ms",
    metadata?: Record<string, unknown>,
  ): void {
    this.write(this.createEntry(
      LogLevel.INFO,
      `Perf: ${metric} = ${value}${unit}`,
      { metric, value, unit, ...metadata },
    ));
  }

  /**
   * Log an external service call.
   */
  external(
    service: string,
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, unknown>,
    error?: Error,
  ): void {
    this.write(this.createEntry(
      success ? LogLevel.INFO : LogLevel.ERROR,
      `External: ${service}.${operation} ${success ? "OK" : "FAILED"}`,
      { service, operation, success, ...metadata },
      error,
      undefined,
      undefined,
      duration,
    ));
  }

  /**
   * Create a child logger with a different context.
   */
  child(context: string, extraMetadata?: Record<string, unknown>): Logger {
    const childLogger = new Logger({
      level: this.level,
      context: `${this.context}:${context}`,
      service: this.service,
      enableConsole: this.enableConsole,
      enableFile: this.enableFile,
      redactFields: this.redactFields,
    });

    if (extraMetadata) {
      const originalWrite = childLogger.write.bind(childLogger);
      childLogger.write = (entry: LogEntry) => {
        entry.metadata = { ...extraMetadata, ...entry.metadata };
        originalWrite(entry);
      };
    }

    return childLogger;
  }

  /**
   * Time a function execution and log the duration.
   */
  async time<T>(
    label: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = Math.round(performance.now() - start);
      this.info(`${label} completed`, { ...metadata, duration });
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      this.error(`${label} failed`, error as Error, { ...metadata, duration });
      throw error;
    }
  }

  /**
   * Set the log level dynamically.
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get the current log level.
   */
  getLevel(): LogLevel {
    return this.level;
  }
}

// ─── Default Logger Instance ──────────────────────────

export const logger = new Logger({
  context: "app",
  service: "ai-fitness-platform",
});

// ─── Request-Scoped Logger ────────────────────────────

export function createRequestLogger(
  requestId: string,
  userId?: string,
): Logger {
  return logger.child("request", { requestId, userId });
}

// ─── Module Logger Factory ────────────────────────────

export function createModuleLogger(module: string): Logger {
  return logger.child(module);
}

// ─── Timing Helper ────────────────────────────────────

export function createTimer() {
  const start = performance.now();

  return {
    stop(label?: string): number {
      const duration = Math.round(performance.now() - start);
      if (label) {
        logger.debug(`Timer: ${label}`, { duration });
      }
      return duration;
    },
  };
}

// ─── Structured Error Logger ──────────────────────────

export function logError(
  error: unknown,
  context?: string,
  requestId?: string,
  userId?: string,
): void {
  if (error instanceof Error) {
    logger.error(
      context ?? error.message,
      error,
      {
        name: error.name,
        stack: error.stack,
      },
      requestId,
      userId,
    );
  } else {
    logger.error(
      context ?? "Unknown error",
      new Error(String(error)),
      { raw: error },
      requestId,
      userId,
    );
  }
}

export default logger;
