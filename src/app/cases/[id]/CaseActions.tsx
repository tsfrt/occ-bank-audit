"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AUDIT_TYPES } from "@/lib/auditTypes";
import type { AuditType } from "@/generated/prisma";

type Props = {
  caseId: string;
  status: string;
  /** Current audit type on the case (for pre-select and re-runs) */
  currentAuditType: AuditType | null;
};

export function CaseActions({ caseId, status, currentAuditType }: Props) {
  const router = useRouter();
  const [selectedAuditType, setSelectedAuditType] = useState<AuditType | "">(
    currentAuditType ?? ""
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [digging, setDigging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setError(null);
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditType: selectedAuditType || undefined,
        }),
      });
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
      {status === "pending_analysis" && (
        <div>
          <label htmlFor="audit-type" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Audit type (drives analysis and model)
          </label>
          <select
            id="audit-type"
            value={selectedAuditType}
            onChange={(e) => setSelectedAuditType((e.target.value || "") as AuditType | "")}
            className="mt-1 block w-full max-w-md rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          >
            <option value="">Select audit type…</option>
            {AUDIT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={runAnalysis}
          disabled={analyzing || (status === "pending_analysis" && !selectedAuditType)}
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
            {digging ? "Updating…" : "Manual review required"}
          </button>
        )}
      </div>
    </div>
  );
}
