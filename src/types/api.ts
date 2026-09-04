export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiRequest {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

export interface ApiContext {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: number;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export interface ApiHealth {
  status: "healthy" | "degraded" | "down";
  version: string;
  uptime: number;
  database: "connected" | "disconnected";
  redis: "connected" | "disconnected";
  services: Record<string, "ok" | "error">;
}

export interface WebhookPayload {
  id: string;
  event: string;
  data: unknown;
  createdAt: string;
  signature: string;
}

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  headers: Record<string, string>;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface EndpointDefinition {
  method: HttpMethod;
  path: string;
  description?: string;
  auth?: boolean;
  rateLimit?: string;
  tags?: string[];
}

export interface OpenAPISchema {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{ url: string; description: string }>;
  paths: Record<string, Record<string, unknown>>;
  components: {
    schemas: Record<string, unknown>;
    securitySchemes: Record<string, unknown>;
  };
}

export interface CacheHeaders {
  "Cache-Control"?: string;
  "CDN-Cache-Control"?: string;
  "Surrogate-Control"?: string;
  ETag?: string;
  "Last-Modified"?: string;
}

export interface SecurityHeaders {
  "Content-Security-Policy"?: string;
  "X-Frame-Options"?: string;
  "X-Content-Type-Options"?: string;
  "X-XSS-Protection"?: string;
  "Strict-Transport-Security"?: string;
  "Referrer-Policy"?: string;
  "Permissions-Policy"?: string;
}

export interface ApiResponseHeaders {
  "X-Request-Id"?: string;
  "X-RateLimit-Limit"?: string;
  "X-RateLimit-Remaining"?: string;
  "X-RateLimit-Reset"?: string;
  "X-Response-Time"?: string;
}

export interface ApiMiddleware {
  name: string;
  handler: (req: ApiRequest) => Promise<ApiRequest>;
  order: number;
}

export interface ApiRoute {
  path: string;
  method: HttpMethod;
  handler: (req: ApiRequest, ctx: ApiContext) => Promise<ApiResponse>;
  middleware?: string[];
  auth?: boolean;
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

export interface ApiRouter {
  routes: ApiRoute[];
  addRoute: (route: ApiRoute) => void;
  addRoutes: (routes: ApiRoute[]) => void;
  getRoutes: () => ApiRoute[];
  findRoute: (method: HttpMethod, path: string) => ApiRoute | undefined;
}

export function createApiResponse<T>(
  data: T,
  meta?: PaginationMeta
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta,
    timestamp: new Date().toISOString(),
  };
}

export function createApiError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ApiResponse<never> {
  return {
    success: false,
    error: { code, message, details },
    timestamp: new Date().toISOString(),
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  };
}

export function isApiSuccess<T>(
  response: ApiResponse<T>
): response is ApiResponse<T> & { data: T } {
  return response.success && response.data !== undefined;
}

export function isApiError<T>(
  response: ApiResponse<T>
): response is ApiResponse<T> & { error: ApiError } {
  return !response.success && response.error !== undefined;
}

export function getApiErrorMessage(response: ApiResponse<unknown>): string {
  if (isApiError(response)) {
    return response.error.message;
  }
  return "Unknown error";
}

export function getApiErrorCode(response: ApiResponse<unknown>): string {
  if (isApiError(response)) {
    return response.error.code;
  }
  return "UNKNOWN_ERROR";
}
