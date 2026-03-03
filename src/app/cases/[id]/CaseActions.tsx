"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  caseId: string;
  status: string;
};

export function CaseActions({ caseId, status }: Props) {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [digging, setDigging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setError(null);
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function markReviewed() {
    setError(null);
    setReviewing(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reviewed" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setReviewing(false);
    }
  }

  async function digDeeper() {
    setError(null);
    setDigging(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dig_deeper" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setDigging(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-2 text-sm">
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={runAnalysis}
          disabled={analyzing}
          className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {analyzing ? "Running analysis…" : "Run analysis"}
        </button>
        {status !== "reviewed" && (
          <button
            type="button"
            onClick={markReviewed}
            disabled={reviewing}
            className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {reviewing ? "Updating…" : "Mark as reviewed"}
          </button>
        )}
        {status !== "manual_review" && (
          <button
            type="button"
            onClick={digDeeper}
            disabled={digging}
            className="rounded-md border border-amber-500 text-amber-700 dark:text-amber-400 px-4 py-2 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-50"
          >
            {digging ? "Updating…" : "Dig deeper (manual review)"}
          </button>
        )}
      </div>
    </div>
  );
}
