export interface HttpRequestConfig {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  data?: unknown;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: HttpRequestConfig;
}

export interface HttpError<T = unknown> {
  response?: HttpResponse<T>;
  message: string;
  code?: string;
  isAxiosError: boolean;
}

interface InternalRequestConfig extends HttpRequestConfig {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers: Record<string, string>;
}

function buildUrl(
  url: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const baseUrl = url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_API_URL || ""}${url}`;
  if (!params) return baseUrl;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${queryString}` : baseUrl;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function internalFetch<T>(
  config: InternalRequestConfig,
  attempt: number = 1
): Promise<HttpResponse<T>> {
  const { url, method, headers, params, data, timeout, signal } = config;
  const fullUrl = buildUrl(url, params);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout || 30000);

  const fetchOptions: RequestInit = {
    method,
    headers: {
      ...headers,
    },
    signal: signal || controller.signal,
  };

  if (data && method !== "GET") {
    fetchOptions.body = JSON.stringify(data);
    if (!fetchOptions.headers) fetchOptions.headers = {};
    (fetchOptions.headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(fullUrl, fetchOptions);
    clearTimeout(timeoutId);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let responseData: T;
    const contentType = responseHeaders["content-type"] || "";
    if (contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = (await response.text()) as unknown as T;
    }

    if (!response.ok) {
      const error: HttpError<T> = {
        response: {
          data: responseData,
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          config,
        },
        message: `Request failed with status ${response.status}`,
        code: response.status.toString(),
        isAxiosError: false,
      };
      throw error;
    }

    return {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      config,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (
      config.retries &&
      config.retries > 0 &&
      attempt <= config.retries &&
      !(error as HttpError).response
    ) {
      const delay = (config.retryDelay || 1000) * Math.pow(2, attempt - 1);
      await sleep(delay);
      return internalFetch<T>(config, attempt + 1);
    }

    throw error;
  }
}

export async function httpGet<T>(
  url: string,
  config?: Omit<HttpRequestConfig, "url" | "method">
): Promise<HttpResponse<T>> {
  return internalFetch<T>({ ...config, url, method: "GET" });
}

export async function httpPost<T>(
  url: string,
  data?: unknown,
  config?: Omit<HttpRequestConfig, "url" | "method" | "data">
): Promise<HttpResponse<T>> {
  return internalFetch<T>({ ...config, url, method: "POST", data });
}

export async function httpPut<T>(
  url: string,
  data?: unknown,
  config?: Omit<HttpRequestConfig, "url" | "method" | "data">
): Promise<HttpResponse<T>> {
  return internalFetch<T>({ ...config, url, method: "PUT", data });
}

export async function httpPatch<T>(
  url: string,
  data?: unknown,
  config?: Omit<HttpRequestConfig, "url" | "method" | "data">
): Promise<HttpResponse<T>> {
  return internalFetch<T>({ ...config, url, method: "PATCH", data });
}

export async function httpDelete<T>(
  url: string,
  config?: Omit<HttpRequestConfig, "url" | "method">
): Promise<HttpResponse<T>> {
  return internalFetch<T>({ ...config, url, method: "DELETE" });
}

export function createHttpClient(baseConfig: Partial<HttpRequestConfig> = {}) {
  const defaultHeaders = baseConfig.headers || {};
  const defaultTimeout = baseConfig.timeout || 30000;
  const defaultRetries = baseConfig.retries || 0;

  return {
    get: <T>(url: string, config?: Partial<HttpRequestConfig>) =>
      httpGet<T>(url, {
        ...baseConfig,
        ...config,
        headers: { ...defaultHeaders, ...config?.headers },
        timeout: config?.timeout || defaultTimeout,
        retries: config?.retries ?? defaultRetries,
      }),
    post: <T>(url: string, data?: unknown, config?: Partial<HttpRequestConfig>) =>
      httpPost<T>(url, data, {
        ...baseConfig,
        ...config,
        headers: { ...defaultHeaders, ...config?.headers },
        timeout: config?.timeout || defaultTimeout,
        retries: config?.retries ?? defaultRetries,
      }),
    put: <T>(url: string, data?: unknown, config?: Partial<HttpRequestConfig>) =>
      httpPut<T>(url, data, {
        ...baseConfig,
        ...config,
        headers: { ...defaultHeaders, ...config?.headers },
        timeout: config?.timeout || defaultTimeout,
        retries: config?.retries ?? defaultRetries,
      }),
    patch: <T>(url: string, data?: unknown, config?: Partial<HttpRequestConfig>) =>
      httpPatch<T>(url, data, {
        ...baseConfig,
        ...config,
        headers: { ...defaultHeaders, ...config?.headers },
        timeout: config?.timeout || defaultTimeout,
        retries: config?.retries ?? defaultRetries,
      }),
    delete: <T>(url: string, config?: Partial<HttpRequestConfig>) =>
      httpDelete<T>(url, {
        ...baseConfig,
        ...config,
        headers: { ...defaultHeaders, ...config?.headers },
        timeout: config?.timeout || defaultTimeout,
        retries: config?.retries ?? defaultRetries,
      }),
  };
}

export const api = createHttpClient({
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
  retries: 2,
  retryDelay: 1000,
});

export function isHttpError(error: unknown): error is HttpError {
  return (error as HttpError)?.isAxiosError === true || 
    ((error as HttpError)?.response !== undefined && (error as HttpError)?.message !== undefined);
}

export function getErrorMessage(error: unknown): string {
  if (isHttpError(error)) {
    return error.response?.data && typeof error.response.data === "object" && "message" in (error.response.data as Record<string, unknown>)
      ? String((error.response.data as Record<string, unknown>).message)
      : error.message;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}
