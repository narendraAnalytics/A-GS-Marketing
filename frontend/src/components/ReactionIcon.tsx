const ICON_PATHS = {
  like: "M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3",
  comment:
    "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z",
  repost: "M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z",
} as const;

export type ReactionIconName = keyof typeof ICON_PATHS;

export function ReactionIcon({
  icon,
  label,
  compact = false,
}: {
  icon: ReactionIconName;
  label: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      title={`${label} (preview only)`}
      className={
        compact
          ? "flex items-center justify-center rounded-md p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          : "flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }
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
      {!compact && label}
    </button>
  );
}
