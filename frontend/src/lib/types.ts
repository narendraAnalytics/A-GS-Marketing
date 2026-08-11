// Mirrors backend/app/models.py — keep field names identical, no
// transformation layer between the FastAPI response and this shape.

export interface StrategyOutput {
  audience: string;
  angle: string;
  hook: string;
  key_message: string;
}

export type DraftStatus = "draft" | "ready_to_publish" | "published";

export interface PostDraft {
  draft_id: string;
  objective: string;
  post_text: string;
  cta: string;
  hashtags: string[];
  strategy: StrategyOutput;
  status: DraftStatus;
  post_urn: string | null;
  has_image: boolean;
}

export interface LinkedInStatus {
  connected: boolean;
  name: string | null;
}
