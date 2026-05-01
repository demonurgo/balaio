const apiUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

async function readJson(response: Response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiUrl}${path}`, {
    credentials: "include",
    headers,
    ...init
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new ApiError(data.message ?? `Request failed: ${response.status}`, response.status, data.fields);
  }

  return data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, {
    method: "DELETE"
  });
}
