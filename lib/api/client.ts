type ApiClientOptions = {
  headers?: HeadersInit;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";

function buildApiUrl(path: string) {
  if (!API_URL) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}

export async function apiClient<TResponse>(
  path: string,
  init: RequestInit = {},
  options: ApiClientOptions = {},
): Promise<TResponse> {
  const url = buildApiUrl(path);

  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export { API_URL };
