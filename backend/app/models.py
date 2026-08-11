from typing import Literal

from pydantic import BaseModel, field_validator


class StrategyOutput(BaseModel):
    audience: str
    angle: str
    hook: str
    key_message: str


class ContentOutput(BaseModel):
    post_text: str
    cta: str
    hashtags: list[str]

    @field_validator("hashtags")
    @classmethod
    def validate_hashtags(cls, hashtags: list[str]) -> list[str]:
        if not 1 <= len(hashtags) <= 6:
            raise ValueError(f"expected 1-6 hashtags, got {len(hashtags)}")
        for tag in hashtags:
            if not tag.startswith("#"):
                raise ValueError(f"hashtag must start with '#': {tag!r}")
            # Catches the degenerate-output failure mode observed with
            # Gemini structured output (a repeating-token loop inside a
            # string field) rather than silently accepting garbage.
            if len(tag) > 40:
                raise ValueError(f"hashtag suspiciously long ({len(tag)} chars): {tag[:60]!r}...")
        return hashtags


class PostDraft(BaseModel):
    draft_id: str
    objective: str
    post_text: str
    cta: str
    hashtags: list[str]
    strategy: StrategyOutput
    status: Literal["draft", "ready_to_publish"] = "draft"


class GenerateRequest(BaseModel):
    objective: str


class RegenerateRequest(BaseModel):
    draft_id: str


class ApproveRequest(BaseModel):
    draft_id: str
