"use client";

import { useState } from "react";

interface LinkedInPostBodyProps {
  postText: string;
  cta: string;
  hashtags: string[];
  /** Character-count estimate for LinkedIn's "...see more" fold. Omit to always render in full (e.g. while editing). */
  charLimit?: number;
}

// Real LinkedIn renders #hashtags inline as clickable blue text, not as
// separate pill badges — this splits on whitespace so hashtags can be
// highlighted without disturbing the rest of the text's spacing.
function withHighlightedHashtags(text: string) {
  return text.split(/(\s+)/).map((token, i) =>
    token.startsWith("#") && token.length > 1 ? (
      <span key={i} className="text-blue-600 dark:text-blue-400">
        {token}
      </span>
    ) : (
      <span key={i}>{token}</span>
    ),
  );
}

export function LinkedInPostBody({ postText, cta, hashtags, charLimit }: LinkedInPostBodyProps) {
  const [expanded, setExpanded] = useState(false);
  const fullBody = `${postText}\n\n${cta}\n\n${hashtags.join(" ")}`;
  const isTruncatable = charLimit != null && fullBody.length > charLimit;

  return (
    <div>
      <p
        className={`whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-100 ${
          isTruncatable && !expanded ? "line-clamp-3" : ""
        }`}
      >
        {withHighlightedHashtags(fullBody)}
      </p>
      {isTruncatable && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 text-sm font-medium text-zinc-500 hover:underline dark:text-zinc-400"
        >
          {expanded ? "...see less" : "...see more"}
        </button>
      )}
    </div>
  );
}
