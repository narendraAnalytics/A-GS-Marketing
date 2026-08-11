"use client";

import { useEffect, useState } from "react";
import { removeDraftImage, updateDraft, uploadDraftImage } from "@/lib/api";
import type { PostDraft } from "@/lib/types";
import { ImagePicker, useImagePreview } from "./ImagePicker";
import { LinkedInPostBody } from "./LinkedInPostBody";
import { LinkedInPreviewModal } from "./LinkedInPreviewModal";
import { ReactionIcon } from "./ReactionIcon";
import { StatusBadge } from "./StatusBadge";

interface PostDraftCardProps {
  draft: PostDraft;
  isBusy: boolean;
  busyLabel: "Regenerating" | "Approving" | null;
  linkedinConnected: boolean;
  onRegenerate: () => void;
  onApprove: () => void;
}

export function PostDraftCard({
  draft,
  isBusy,
  busyLabel,
  linkedinConnected,
  onRegenerate,
  onApprove,
}: PostDraftCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [postText, setPostText] = useState(draft.post_text);
  const [cta, setCta] = useState(draft.cta);
  const [copied, setCopied] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [imageUploadState, setImageUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const { imageFile, imageUrl, setImageFile } = useImagePreview();

  // A fresh generate/regenerate replaces the draft entirely — drop any
  // local edits from the previous draft rather than merging them.
  useEffect(() => {
    setPostText(draft.post_text);
    setCta(draft.cta);
    setIsEditing(false);
    setCopied(false);
    setImageFile(null);
    setSaveState("idle");
    setImageUploadState("idle");
    // setImageFile is stable (useState setter), safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.draft_id, draft.post_text, draft.cta]);

  // Auto-save edits to the backend (debounced) so /approve and /publish send
  // what the user actually sees, not the original AI-generated text.
  useEffect(() => {
    if (!isEditing) return;
    if (postText === draft.post_text && cta === draft.cta) return;

    setSaveState("saving");
    const timer = setTimeout(async () => {
      try {
        await updateDraft(draft.draft_id, { post_text: postText, cta });
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [postText, cta, isEditing, draft.draft_id, draft.post_text, draft.cta]);

  // Upload the attached image to the backend as soon as it's picked — it's
  // only sent on to LinkedIn at /publish time, but staging it here means
  // publish doesn't have to wait on an upload.
  useEffect(() => {
    if (!imageFile) return;
    let cancelled = false;
    setImageUploadState("uploading");
    uploadDraftImage(draft.draft_id, imageFile)
      .then(() => {
        if (!cancelled) setImageUploadState("success");
      })
      .catch(() => {
        if (!cancelled) setImageUploadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [imageFile, draft.draft_id]);

  const handleRemoveImage = () => {
    setImageFile(null);
    setImageUploadState("idle");
    removeDraftImage(draft.draft_id).catch(() => {
      // Best-effort — if this fails the stale image just gets overwritten
      // by the next upload, or ignored since has_image is already false
      // from the draft's perspective once a new one is picked.
    });
  };

  const isPublished = draft.status === "published";
  // Ready-to-publish-but-not-connected is a terminal state without LinkedIn
  // (the old two-step approve flow); once connected, it's still clickable
  // so the user can push the already-approved draft on to /publish.
  const isDoneWithoutLinkedIn = draft.status === "ready_to_publish" && !linkedinConnected;
  const fullText = `${postText}\n\n${cta}\n\n${draft.hashtags.join(" ")}`;
  const linkedinPostUrl = draft.post_urn
    ? `https://www.linkedin.com/feed/update/${encodeURIComponent(draft.post_urn)}/`
    : null;

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

      {isPublished && (
        <div className="mx-5 mt-3 flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          <span>🎉 Published to LinkedIn!</span>
          {linkedinPostUrl && (
            <a
              href={linkedinPostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-md border border-emerald-300 px-3 py-1 text-xs font-medium hover:bg-emerald-100 dark:border-emerald-800 dark:hover:bg-emerald-900"
            >
              View on LinkedIn
            </a>
          )}
        </div>
      )}

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

      {!isEditing && (
        <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-2 dark:border-zinc-800 dark:bg-zinc-950/50">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-medium text-zinc-600 dark:text-zinc-300">Strategy hook:</span>{" "}
            {draft.strategy.hook}
          </p>
        </div>
      )}

      <div className="space-y-4 px-5 py-4">
        {isEditing && (
          <p className="text-xs text-zinc-400">
            {saveState === "saving" && "Saving..."}
            {saveState === "saved" && "Saved"}
            {saveState === "error" && <span className="text-red-500">Failed to save — check your connection</span>}
            {saveState === "idle" && " "}
          </p>
        )}
        {isEditing ? (
          <>
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              rows={8}
              className="w-full resize-y rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <div>
              <span className="text-xs font-medium uppercase text-zinc-400">CTA</span>
              <input
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
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
          </>
        ) : (
          <LinkedInPostBody postText={postText} cta={cta} hashtags={draft.hashtags} charLimit={210} />
        )}

        <ImagePicker
          imageUrl={imageUrl}
          uploadState={imageUploadState}
          onSelect={setImageFile}
          onRemove={handleRemoveImage}
          disabled={isBusy}
        />

        {imageFile && imageUploadState === "error" && (
          <p className="text-xs text-red-600 dark:text-red-400">
            The image failed to upload — try re-selecting it before publishing.
          </p>
        )}
        {imageFile && imageUploadState !== "error" && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            The image will be included when you publish to LinkedIn. It&apos;s not included in Copy — download it
            separately if you need it elsewhere.
          </p>
        )}
      </div>

      {/* Decorative — mirrors LinkedIn's reaction summary + action bar so
          the preview reads like the real thing. Not wired to anything;
          there's no live post to react to until it's actually published. */}
      <div className="flex items-center gap-1 border-t border-zinc-200 px-5 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <span className="flex -space-x-1">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] ring-2 ring-white dark:ring-zinc-900">
            👍
          </span>
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] ring-2 ring-white dark:ring-zinc-900">
            ❤️
          </span>
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] ring-2 ring-white dark:ring-zinc-900">
            👏
          </span>
        </span>
        <span>127</span>
        <span className="ml-auto">14 comments · 3 reposts</span>
      </div>
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
          disabled={isBusy || isPublished}
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
          onClick={() => setIsPreviewOpen(true)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={onApprove}
          disabled={isBusy || isPublished || isDoneWithoutLinkedIn || imageUploadState === "uploading"}
          className="ml-auto rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPublished
            ? "Published"
            : isDoneWithoutLinkedIn
              ? "Approved"
              : imageUploadState === "uploading"
                ? "Uploading image..."
                : busyLabel === "Approving"
                  ? linkedinConnected
                    ? "Publishing..."
                    : "Approving..."
                  : linkedinConnected
                    ? "Approve & Publish"
                    : "Approve"}
        </button>
      </div>

      {!linkedinConnected && !isPublished && (
        <p className="px-5 pb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Connect LinkedIn (top of page) to publish this post directly instead of just approving it.
        </p>
      )}

      {isPreviewOpen && (
        <LinkedInPreviewModal
          postText={postText}
          cta={cta}
          hashtags={draft.hashtags}
          imageUrl={imageUrl}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
}
