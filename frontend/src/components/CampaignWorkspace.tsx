"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  approvePost,
  generatePost,
  getLinkedInStatus,
  linkedInConnectUrl,
  publishPost,
  regeneratePost,
} from "@/lib/api";
import type { LinkedInStatus, PostDraft } from "@/lib/types";
import { PostDraftCard } from "./PostDraftCard";

type BusyLabel = "Generating" | "Regenerating" | "Approving" | null;

export function CampaignWorkspace() {
  const [objective, setObjective] = useState("");
  const [draft, setDraft] = useState<PostDraft | null>(null);
  const [busyLabel, setBusyLabel] = useState<BusyLabel>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState<(() => void) | null>(null);
  const [linkedin, setLinkedin] = useState<LinkedInStatus>({ connected: false, name: null });
  const [linkedinBanner, setLinkedinBanner] = useState<"connected" | "error" | null>(null);

  const isBusy = busyLabel !== null;

  const errorMessage = (err: unknown) => (err instanceof ApiError ? err.message : "Something went wrong.");

  // On load: pick up the ?linkedin=connected|error param the backend's
  // OAuth callback redirects back with, then check the real connection
  // status (also covers a plain page refresh with no query param).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkedinParam = params.get("linkedin");
    if (linkedinParam === "connected" || linkedinParam === "error") {
      setLinkedinBanner(linkedinParam);
      window.history.replaceState({}, "", window.location.pathname);
    }
    getLinkedInStatus()
      .then(setLinkedin)
      .catch(() => setLinkedin({ connected: false, name: null }));
  }, []);

  const handleGenerate = async () => {
    if (!objective.trim() || isBusy) return;
    setBusyLabel("Generating");
    setError(null);
    try {
      const result = await generatePost(objective);
      setDraft(result);
    } catch (err) {
      setError(errorMessage(err));
      setRetry(() => handleGenerate);
    } finally {
      setBusyLabel(null);
    }
  };

  const handleRegenerate = async () => {
    if (!draft || isBusy) return;
    setBusyLabel("Regenerating");
    setError(null);
    try {
      const result = await regeneratePost(draft.draft_id);
      setDraft(result);
    } catch (err) {
      // Keep the existing draft visible — regenerate failing shouldn't
      // wipe out a perfectly good draft the user already has.
      setError(errorMessage(err));
      setRetry(() => handleRegenerate);
    } finally {
      setBusyLabel(null);
    }
  };

  const handleApprove = async () => {
    if (!draft || isBusy) return;
    setBusyLabel("Approving");
    setError(null);
    try {
      const approved = await approvePost(draft.draft_id);
      if (linkedin.connected) {
        const published = await publishPost(approved.draft_id);
        setDraft(published);
      } else {
        setDraft(approved);
      }
    } catch (err) {
      setError(errorMessage(err));
      setRetry(() => handleApprove);
    } finally {
      setBusyLabel(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">A&GS AI Marketing</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Describe a campaign objective and generate a draft LinkedIn post.
          </p>
        </div>
        {linkedin.connected ? (
          <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
            LinkedIn connected{linkedin.name ? ` as ${linkedin.name}` : ""}
          </span>
        ) : (
          <a
            href={linkedInConnectUrl()}
            className="shrink-0 rounded-md bg-[#0A66C2] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#004182]"
          >
            Connect LinkedIn
          </a>
        )}
      </div>

      {linkedinBanner && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            linkedinBanner === "connected"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {linkedinBanner === "connected"
            ? "LinkedIn connected successfully."
            : "LinkedIn connection failed. Please try again."}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          placeholder="e.g. Announce our AI security proxy guardrails for enterprise LLM traffic."
          rows={3}
          disabled={isBusy}
          className="w-full resize-y rounded-md border border-zinc-300 p-3 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isBusy || !objective.trim()}
          className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busyLabel === "Generating" ? "Generating..." : "Generate"}
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <span>{error}</span>
          {retry && (
            <button
              type="button"
              onClick={() => retry()}
              className="shrink-0 rounded-md border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {draft && (
        <PostDraftCard
          draft={draft}
          isBusy={isBusy}
          busyLabel={busyLabel === "Regenerating" || busyLabel === "Approving" ? busyLabel : null}
          linkedinConnected={linkedin.connected}
          onRegenerate={handleRegenerate}
          onApprove={handleApprove}
        />
      )}
    </div>
  );
}
