type ApiClientOptions = {
  headers?: HeadersInit;
};

type ApiErrorKind = "bad_request" | "validation" | "not_found" | "server" | "network" | "cors" | "configuration" | "unknown";

type ApiErrorDetails = {
  status?: number;
  kind: ApiErrorKind;
  userMessage: string;
  detail?: unknown;
};

const LOCAL_API_URL = "http://localhost:8000";
const CONFIGURATION_ERROR_MESSAGE = "FusionPath is not connected to its backend service.";
const NETWORK_ERROR_MESSAGE = "FusionPath could not reach the backend service.";
const CORS_OR_NETWORK_ERROR_MESSAGE = "FusionPath could not connect to the backend service from this site.";
const API_URL = resolveApiUrl();

export class ApiError extends Error {
  status?: number;
  kind: ApiErrorKind;
  userMessage: string;
  detail?: unknown;

  constructor(message: string, details: ApiErrorDetails) {
    super(message);
    this.name = "ApiError";
    this.status = details.status;
    this.kind = details.kind;
    this.userMessage = details.userMessage;
    this.detail = details.detail;
  }
}

function resolveApiUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
  if (configuredUrl) return configuredUrl;

  if (typeof window === "undefined") return LOCAL_API_URL;

  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return LOCAL_API_URL;

  return "";
}

function buildApiUrl(path: string) {
  if (!API_URL) {
    throw new ApiError("Missing NEXT_PUBLIC_API_URL.", {
      kind: "configuration",
      userMessage: CONFIGURATION_ERROR_MESSAGE,
    });
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}

function errorKindForStatus(status: number): ApiErrorKind {
  if (status === 400) return "bad_request";
  if (status === 422) return "validation";
  if (status === 404) return "not_found";
  if (status >= 500) return "server";
  return "unknown";
}

function messageForStatus(status: number) {
  if (status === 400) return "FusionPath could not process that request.";
  if (status === 422) return "FusionPath needs a little more information before continuing.";
  if (status === 404) return "FusionPath could not find that backend endpoint.";
  if (status >= 500) return "FusionPath hit a temporary backend issue.";
  return "FusionPath could not complete that request.";
}

async function readErrorDetail(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return undefined;

  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

export async function apiClient<TResponse>(
  path: string,
  init: RequestInit = {},
  options: ApiClientOptions = {},
): Promise<TResponse> {
  const url = buildApiUrl(path);

  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        ...init.headers,
      },
    });
  } catch (error) {
    const isBrowserFetchFailure = typeof window !== "undefined" && error instanceof TypeError;

    throw new ApiError("Network request failed.", {
      kind: isBrowserFetchFailure ? "cors" : "network",
      userMessage: isBrowserFetchFailure ? CORS_OR_NETWORK_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE,
      detail: isBrowserFetchFailure ? "The request was blocked, refused, or interrupted." : undefined,
    });
  }

  if (!response.ok) {
    throw new ApiError(`API request failed with status ${response.status}.`, {
      status: response.status,
      kind: errorKindForStatus(response.status),
      userMessage: messageForStatus(response.status),
      detail: await readErrorDetail(response),
    });
  }

  return response.json() as Promise<TResponse>;
}

export { API_URL };
