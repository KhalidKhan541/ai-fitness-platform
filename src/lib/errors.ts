// ─── Base Error ───────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    isOperational: boolean = true,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      isOperational: this.isOperational,
      details: this.details,
    };
  }
}

// ─── Client Errors (4xx) ──────────────────────────────

export class BadRequestError extends AppError {
  constructor(message: string = "Bad request", details?: Record<string, unknown>) {
    super(message, 400, "BAD_REQUEST", true, details);
  }
}

export class ValidationError extends AppError {
  public readonly fieldErrors: Record<string, string[]>;

  constructor(
    message: string = "Validation failed",
    fieldErrors: Record<string, string[]> = {},
  ) {
    super(message, 400, "VALIDATION_ERROR", true, { fieldErrors });
    this.fieldErrors = fieldErrors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      fieldErrors: this.fieldErrors,
    };
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "UNAUTHORIZED", true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, "FORBIDDEN", true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource", id?: string) {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(message, 404, "NOT_FOUND", true, { resource, id });
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists", details?: Record<string, unknown>) {
    super(message, 409, "CONFLICT", true, details);
  }
}

export class GoneError extends AppError {
  constructor(message: string = "Resource no longer available") {
    super(message, 410, "GONE", true);
  }
}

export class TooManyRequestsError extends AppError {
  public readonly retryAfter: number;

  constructor(message: string = "Too many requests", retryAfter: number = 60) {
    super(message, 429, "TOO_MANY_REQUESTS", true, { retryAfter });
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

// ─── Server Errors (5xx) ──────────────────────────────

export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error", details?: Record<string, unknown>) {
    super(message, 500, "INTERNAL_ERROR", false, details);
  }
}

export class NotImplementedError extends AppError {
  constructor(feature: string = "This feature") {
    super(`${feature} is not yet implemented`, 501, "NOT_IMPLEMENTED", true);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string = "Service", retryAfter: number = 30) {
    super(`${service} is temporarily unavailable`, 503, "SERVICE_UNAVAILABLE", true, {
      service,
      retryAfter,
    });
    this.retryAfter = retryAfter;
  }
}

export class GatewayTimeoutError extends AppError {
  constructor(service: string = "Service") {
    super(`${service} request timed out`, 504, "GATEWAY_TIMEOUT", true, { service });
  }
}

// ─── Database Errors ──────────────────────────────────

export class DatabaseError extends AppError {
  constructor(message: string = "Database operation failed", details?: Record<string, unknown>) {
    super(message, 500, "DATABASE_ERROR", false, details);
  }
}

export class DatabaseConnectionError extends DatabaseError {
  constructor(details?: Record<string, unknown>) {
    super("Failed to connect to database", details);
    this.code = "DATABASE_CONNECTION_ERROR";
  }
}

export class QueryError extends DatabaseError {
  public readonly query?: string;

  constructor(message: string = "Query failed", query?: string) {
    super(message, { query });
    this.code = "QUERY_ERROR";
    this.query = query;
  }
}

// ─── External Service Errors ──────────────────────────

export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(service: string, message: string = "External service error", details?: Record<string, unknown>) {
    super(`${service}: ${message}`, 502, "EXTERNAL_SERVICE_ERROR", true, { service, ...details });
    this.service = service;
  }
}

export class StripeError extends ExternalServiceError {
  public readonly stripeCode?: string;

  constructor(message: string = "Payment processing failed", stripeCode?: string, details?: Record<string, unknown>) {
    super("Stripe", message, { stripeCode, ...details });
    this.code = "STRIPE_ERROR";
    this.stripeCode = stripeCode;
  }
}

export class OAuthError extends ExternalServiceError {
  public readonly provider: string;

  constructor(provider: string, message: string = "OAuth authentication failed") {
    super(provider, message);
    this.code = "OAUTH_ERROR";
    this.provider = provider;
  }
}

export class AIModelError extends ExternalServiceError {
  constructor(model: string = "AI model", message: string = "AI model request failed") {
    super("AI", `${model}: ${message}`);
    this.code = "AI_MODEL_ERROR";
  }
}

// ─── File Errors ──────────────────────────────────────

export class FileError extends AppError {
  constructor(message: string = "File operation failed", details?: Record<string, unknown>) {
    super(message, 500, "FILE_ERROR", true, details);
  }
}

export class FileTooLargeError extends FileError {
  public readonly maxSize: number;
  public readonly actualSize: number;

  constructor(maxSize: number, actualSize: number) {
    super(`File size ${actualSize} exceeds maximum ${maxSize} bytes`);
    this.code = "FILE_TOO_LARGE";
    this.maxSize = maxSize;
    this.actualSize = actualSize;
  }
}

export class InvalidFileTypeError extends FileError {
  public readonly allowedTypes: string[];
  public readonly actualType: string;

  constructor(allowedTypes: string[], actualType: string) {
    super(`File type '${actualType}' is not allowed. Allowed: ${allowedTypes.join(", ")}`);
    this.code = "INVALID_FILE_TYPE";
    this.allowedTypes = allowedTypes;
    this.actualType = actualType;
  }
}

// ─── Business Logic Errors ────────────────────────────

export class WorkoutError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, "WORKOUT_ERROR", true, details);
  }
}

export class NutritionError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, "NUTRITION_ERROR", true, details);
  }
}

export class GoalError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, "GOAL_ERROR", true, details);
  }
}

export class PlanError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, "PLAN_ERROR", true, details);
  }
}

export class ChallengeError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, "CHALLENGE_ERROR", true, details);
  }
}

export class SubscriptionError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 402, "SUBSCRIPTION_ERROR", true, details);
  }
}

export class PremiumRequiredError extends SubscriptionError {
  constructor(feature: string = "This feature") {
    super(`${feature} requires a premium subscription`, {
      requiredTier: "PRO",
      upgradeUrl: "/settings/subscription",
    });
    this.code = "PREMIUM_REQUIRED";
  }
}

export class RateLimitError extends TooManyRequestsError {
  public readonly action: string;

  constructor(action: string, retryAfter: number = 60) {
    super(`Rate limit exceeded for '${action}'. Try again in ${retryAfter} seconds.`, retryAfter);
    this.code = "RATE_LIMIT_EXCEEDED";
    this.action = action;
  }
}

// ─── Error Type Guards ────────────────────────────────

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

export function isForbiddenError(error: unknown): error is ForbiddenError {
  return error instanceof ForbiddenError;
}

export function isConflictError(error: unknown): error is ConflictError {
  return error instanceof ConflictError;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isPremiumRequiredError(error: unknown): error is PremiumRequiredError {
  return error instanceof PremiumRequiredError;
}

// ─── Error Conversion ─────────────────────────────────

/**
 * Convert an unknown error into an AppError.
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // Check for Prisma-specific errors
    if (error.name === "PrismaClientKnownRequestError") {
      return handlePrismaError(error);
    }

    if (error.name === "PrismaClientValidationError") {
      return new ValidationError("Invalid data provided", {
        prisma: error.message,
      });
    }

    if (error.name === "PrismaClientInitializationError") {
      return new DatabaseConnectionError({ originalError: error.message });
    }

    return new InternalServerError(error.message, {
      originalError: error.name,
    });
  }

  return new InternalServerError("An unexpected error occurred", {
    originalError: String(error),
  });
}

/**
 * Handle Prisma-specific known errors.
 */
function handlePrismaError(error: Error): AppError {
  const prismaError = error as Error & { code?: string; meta?: Record<string, unknown> };

  switch (prismaError.code) {
    case "P2002":
      return new ConflictError("A record with this value already exists", {
        fields: prismaError.meta?.target,
      });
    case "P2025":
      return new NotFoundError("Record");
    case "P2003":
      return new BadRequestError("Related record not found", {
        field: prismaError.meta?.field_name,
      });
    case "P2014":
      return new BadRequestError("Required relation violation");
    case "P2016":
      return new BadRequestError("Record does not exist or has been deleted");
    case "P2024":
      return new DatabaseError("Database timeout", { timeout: true });
    default:
      return new DatabaseError(`Database error: ${prismaError.code}`, {
        prismaCode: prismaError.code,
        meta: prismaError.meta,
      });
  }
}

// ─── Error Response Builder ───────────────────────────

export interface ErrorResponsePayload {
  success: false;
  error: string;
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
  fieldErrors?: Record<string, string[]>;
  timestamp: string;
  requestId?: string;
}

/**
 * Build a standardized error response payload.
 */
export function buildErrorResponse(
  error: unknown,
  requestId?: string,
): ErrorResponsePayload {
  const appError = isAppError(error) ? toAppError(error) : toAppError(error);

  const response: ErrorResponsePayload = {
    success: false,
    error: appError.message,
    code: appError.code,
    statusCode: appError.statusCode,
    timestamp: new Date().toISOString(),
    requestId,
  };

  if (appError.details) {
    response.details = appError.details as Record<string, unknown>;
  }

  if (appError instanceof ValidationError) {
    response.fieldErrors = appError.fieldErrors;
  }

  return response;
}
