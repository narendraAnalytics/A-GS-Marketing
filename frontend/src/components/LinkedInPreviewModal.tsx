"use client";

import { useEffect, useState } from "react";
import { LinkedInPostBody } from "./LinkedInPostBody";
import { ReactionIcon } from "./ReactionIcon";

interface LinkedInPreviewModalProps {
  postText: string;
  cta: string;
  hashtags: string[];
  imageUrl: string | null;
  onClose: () => void;
}

type ViewMode = "desktop" | "mobile";

// LinkedIn truncates the feed post behind "...see more" by line count (~3
// lines shown), which lands around these character counts depending on
// feed column width — desktop's wider column fits more before wrapping.
const SEE_MORE_CHAR_ESTIMATE: Record<ViewMode, number> = {
  desktop: 210,
  mobile: 140,
};

export function LinkedInPreviewModal({ postText, cta, hashtags, imageUrl, onClose }: LinkedInPreviewModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const cutoff = SEE_MORE_CHAR_ESTIMATE[viewMode];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">LinkedIn Feed Preview</h3>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-zinc-300 p-0.5 text-xs dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setViewMode("desktop")}
                className={`rounded px-2 py-1 ${viewMode === "desktop" ? "bg-blue-600 text-white" : "text-zinc-600 dark:text-zinc-300"}`}
              >
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setViewMode("mobile")}
                className={`rounded px-2 py-1 ${viewMode === "mobile" ? "bg-blue-600 text-white" : "text-zinc-600 dark:text-zinc-300"}`}
              >
                Mobile
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4">
          <div
            className={`mx-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${
              viewMode === "mobile" ? "max-w-[347px]" : "max-w-[555px]"
            }`}
          >
            <div className="flex items-center gap-3 px-4 pb-2 pt-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                AGS
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">A&amp;GS</p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                  AI Trust, Risk &amp; Security Management
                </p>
                <p className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                  Promoted
                </p>
              </div>
              <span className="text-lg text-zinc-400">···</span>
            </div>

            <div className="px-4 pb-3">
              {/* key={viewMode} remounts on desktop/mobile switch so the
                  "...see more" expand state resets, matching the old behavior. */}
              <LinkedInPostBody
                key={viewMode}
                postText={postText}
                cta={cta}
                hashtags={hashtags}
                charLimit={cutoff}
              />
            </div>

            {imageUrl && (
              <div className="aspect-[4/5] w-full bg-zinc-100 dark:bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview URL */}
                <img src={imageUrl} alt="Post attachment preview" className="h-full w-full object-cover" />
              </div>
            )}

            <div className="flex items-center gap-1 px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">
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
          </div>

          <p className="mt-3 text-center text-xs text-zinc-400">
            Illustrative preview — reaction/comment counts are placeholders, not real. "…see more"
            cutoff is an estimate ({cutoff} characters for {viewMode}); LinkedIn's actual cutoff is
            line-based and can vary.
          </p>
        </div>
      </div>
    </div>
  );
}
