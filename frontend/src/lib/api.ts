import type { LinkedInStatus, PostDraft } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError(0, "NEXT_PUBLIC_API_BASE_URL is not set");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError(0, "Could not reach the backend. Is it running?");
  }

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body: { detail?: string }) => body.detail)
      .catch(() => undefined);
    throw new ApiError(response.status, detail ?? `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export function generatePost(objective: string): Promise<PostDraft> {
  return request<PostDraft>("/api/marketing/generate", {
    method: "POST",
    body: JSON.stringify({ objective }),
  });
}

export function regeneratePost(draftId: string): Promise<PostDraft> {
  return request<PostDraft>("/api/marketing/regenerate", {
    method: "POST",
    body: JSON.stringify({ draft_id: draftId }),
  });
}

export function approvePost(draftId: string): Promise<PostDraft> {
  return request<PostDraft>("/api/marketing/approve", {
    method: "POST",
    body: JSON.stringify({ draft_id: draftId }),
  });
}

export function getDraft(draftId: string): Promise<PostDraft> {
  return request<PostDraft>(`/api/marketing/draft/${draftId}`);
}

export function updateDraft(
  draftId: string,
  updates: { post_text?: string; cta?: string },
): Promise<PostDraft> {
  return request<PostDraft>(`/api/marketing/draft/${draftId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export function publishPost(draftId: string): Promise<PostDraft> {
  return request<PostDraft>("/api/marketing/publish", {
    method: "POST",
    body: JSON.stringify({ draft_id: draftId }),
  });
}

export function getLinkedInStatus(): Promise<LinkedInStatus> {
  return request<LinkedInStatus>("/api/marketing/linkedin/status");
}

// Full-page navigation target, not a fetch — the browser needs to actually
// land on LinkedIn's consent screen.
export function linkedInConnectUrl(): string {
  return `${API_BASE_URL}/api/marketing/linkedin/connect`;
}
