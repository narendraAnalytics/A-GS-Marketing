import type { DraftStatus } from "@/lib/types";

const LABELS: Record<DraftStatus, string> = {
  draft: "Draft",
  ready_to_publish: "Ready to publish",
  published: "Published",
};

const STYLES: Record<DraftStatus, string> = {
  draft: "bg-amber-100 text-amber-800",
  ready_to_publish: "bg-emerald-100 text-emerald-800",
  published: "bg-blue-100 text-blue-800",
};

export function StatusBadge({ status }: { status: DraftStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
