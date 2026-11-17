// Central typed API and storage client for Patent Prior-Art Search Engine

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const customUrl = localStorage.getItem("patent_api_url");
    if (customUrl) return customUrl;
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && (envUrl.startsWith("http://") || envUrl.startsWith("https://") || envUrl.startsWith("/"))) {
      // If envUrl is just an internal hostname without dots, fallback to relative path
      if (!envUrl.includes("localhost") && !envUrl.includes(".") && !envUrl.startsWith("/")) {
        return "";
      }
      return envUrl;
    }
    // In cloud production, default to relative path so Next.js rewrites proxy internally
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return "";
    }
    return "http://localhost:8001";
  }
  return process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("patent_token");
}

export function getStoredUser(): {
  id?: string;
  email?: string;
  full_name?: string;
  role?: string;
  organization_name?: string;
  default_workspace_id?: string;
  onboarding_completed?: boolean;
  preferences?: Record<string, any>;
} | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("patent_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getActiveWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("patent_active_workspace_id");
}

export function setActiveWorkspaceId(workspaceId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("patent_active_workspace_id", workspaceId);
  window.dispatchEvent(new Event("patent_workspace_changed"));
}

export function setAuthSession(token: string, user: Record<string, any>) {
  if (typeof window === "undefined") return;
  localStorage.setItem("patent_token", token);
  localStorage.setItem("patent_user", JSON.stringify(user));
  if (user.default_workspace_id) {
    localStorage.setItem("patent_active_workspace_id", user.default_workspace_id);
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("patent_token");
  localStorage.removeItem("patent_user");
  localStorage.removeItem("patent_active_workspace_id");
}

export function isConfidentialMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("patent_confidential_mode") === "true";
}

export function setConfidentialMode(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem("patent_confidential_mode", enabled ? "true" : "false");
}

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getStoredToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    headers["X-API-Key"] = process.env.NEXT_PUBLIC_APP_API_KEY || "dev_key";
  }
  const workspaceId = getActiveWorkspaceId();
  if (workspaceId) {
    headers["X-Workspace-Id"] = workspaceId;
  }
  if (isConfidentialMode()) {
    headers["X-Confidential-Mode"] = "true";
  }
  return headers;
}

export async function fetchApi<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const defaultHeaders = getAuthHeaders();
  const mergedHeaders = {
    ...defaultHeaders,
    ...(options.headers as Record<string, string> || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers: mergedHeaders,
  });

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorDetail = typeof errorJson.detail === "string" ? errorJson.detail : JSON.stringify(errorJson.detail);
      }
    } catch {
      // Body not JSON
    }
    throw new Error(errorDetail);
  }

  // Handle empty responses
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

