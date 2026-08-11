"use client";

import { useEffect, useState } from "react";
import type { PostDraft } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

interface PostDraftCardProps {
  draft: PostDraft;
  isBusy: boolean;
  busyLabel: "Regenerating" | "Approving" | null;
  onRegenerate: () => void;
  onApprove: () => void;
}

export function PostDraftCard({ draft, isBusy, busyLabel, onRegenerate, onApprove }: PostDraftCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [postText, setPostText] = useState(draft.post_text);
  const [cta, setCta] = useState(draft.cta);
  const [copied, setCopied] = useState(false);

  // A fresh generate/regenerate replaces the draft entirely — drop any
  // local edits from the previous draft rather than merging them.
  useEffect(() => {
    setPostText(draft.post_text);
    setCta(draft.cta);
    setIsEditing(false);
    setCopied(false);
  }, [draft.draft_id, draft.post_text, draft.cta]);

  const isApproved = draft.status === "ready_to_publish";
  const fullText = `${postText}\n\n${cta}\n\n${draft.hashtags.join(" ")}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between px-5 pt-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          AI Generated LinkedIn Post — Preview
        </h2>
        <StatusBadge status={draft.status} />
      </div>

      {/* LinkedIn-style post header, so the preview reads like the real feed item it becomes */}
      <div className="flex items-center gap-3 border-b border-zinc-200 px-5 pb-3 pt-2 dark:border-zinc-800">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
          AGS
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">A&amp;GS</p>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            AI Trust, Risk &amp; Security Management · Promoted
          </p>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        {isEditing ? (
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            rows={8}
            className="w-full resize-y rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-100">{postText}</p>
        )}

        <div>
          <span className="text-xs font-medium uppercase text-zinc-400">CTA</span>
          {isEditing ? (
            <input
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          ) : (
            <p className="text-sm text-zinc-800 dark:text-zinc-100">{cta}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {draft.hashtags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {tag}
            </span>
          ))}
        </div>

        {isEditing && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Edits are local only — not saved to the backend. Approving still marks the original
            AI-generated draft as ready; use Copy to grab your edited text.
          </p>
        )}
      </div>

      {/* Decorative — mirrors LinkedIn's reaction bar so the preview reads
          like the real thing. Not wired to anything; there's no live post
          to react to until Phase 3's real publishing lands. */}
      <div className="flex items-center justify-around border-t border-zinc-200 px-2 py-1 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <ReactionIcon icon="like" label="Like" />
        <ReactionIcon icon="comment" label="Comment" />
        <ReactionIcon icon="repost" label="Repost" />
        <ReactionIcon icon="send" label="Send" />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setIsEditing((v) => !v)}
          disabled={isBusy}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {isEditing ? "Done editing" : "Edit"}
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isBusy}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {busyLabel === "Regenerating" ? "Regenerating..." : "Regenerate"}
        </button>
        <button type="button" onClick={handleCopy} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={isBusy || isApproved}
          className="ml-auto rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isApproved ? "Approved" : busyLabel === "Approving" ? "Approving..." : "Approve & Publish"}
        </button>
      </div>
    </div>
  );
}

const ICON_PATHS: Record<string, string> = {
  like: "M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3",
  comment:
    "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
  repost: "M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z",
};

function ReactionIcon({ icon, label }: { icon: keyof typeof ICON_PATHS; label: string }) {
  return (
    <button
      type="button"
      title={`${label} (preview only)`}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d={ICON_PATHS[icon]} />
      </svg>
      {label}
    </button>
  );
}
