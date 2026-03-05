"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserAvatar } from "./UserAvatar";

type Summary = {
  total: number;
  byStatus: Record<string, number>;
  trends: {
    casesCreatedLast7Days: number;
    casesCreatedLast30Days: number;
    analysesRunLast7Days: number;
  };
  analytics: {
    avgRiskScore: string | null;
    avgAiConfidencePercent: string | null;
    casesWithScores: number;
  };
  error?: string;
};

const statusLabels: Record<string, string> = {
  pending_analysis: "Pending analysis",
  pending_review: "Pending review",
  reviewed: "Reviewed",
  manual_review: "Manual review",
};

export function CaseSummaryBar() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cases/summary")
      .then((res) => res.json())
      .then((data: Summary) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-800/50 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Loading workload summary…
          </span>
          <UserAvatar />
        </div>
      </div>
    );
  }

  if (!summary || summary.error) {
    return (
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <span className="text-sm text-amber-800 dark:text-amber-200">
            Summary unavailable. {summary?.error ?? "Could not load data."}
          </span>
          <UserAvatar />
        </div>
      </div>
    );
  }

  const { total, byStatus, trends, analytics } = summary;

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/95 px-4 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm min-w-0">
          <Link
            href="/"
            className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
          >
            Workload summary
          </Link>
          <span className="text-zinc-400 dark:text-zinc-500">|</span>
          <span className="text-zinc-600 dark:text-zinc-300">
            <strong className="text-zinc-900 dark:text-zinc-100">{total}</strong>{" "}
            total cases
          </span>
          {(["pending_analysis", "pending_review", "manual_review", "reviewed"] as const).map(
            (status) => (
              <span key={status} className="text-zinc-600 dark:text-zinc-300">
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {byStatus[status] ?? 0}
                </strong>{" "}
                {statusLabels[status]}
              </span>
            )
          )}
          <span className="text-zinc-400 dark:text-zinc-500">|</span>
          <span className="text-zinc-600 dark:text-zinc-300" title="Last 7 days">
            <strong className="text-zinc-900 dark:text-zinc-100">
              {trends.casesCreatedLast7Days}
            </strong>{" "}
            new (7d)
          </span>
          <span className="text-zinc-600 dark:text-zinc-300" title="Last 30 days">
            <strong className="text-zinc-900 dark:text-zinc-100">
              {trends.casesCreatedLast30Days}
            </strong>{" "}
            new (30d)
          </span>
          <span className="text-zinc-600 dark:text-zinc-300" title="Analyses run in last 7 days">
            <strong className="text-zinc-900 dark:text-zinc-100">
              {trends.analysesRunLast7Days}
            </strong>{" "}
            analyses (7d)
          </span>
          {(analytics.avgRiskScore != null || analytics.avgAiConfidencePercent != null) && (
            <>
              <span className="text-zinc-400 dark:text-zinc-500">|</span>
              <span className="text-zinc-600 dark:text-zinc-300">
                Avg risk:{" "}
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {analytics.avgRiskScore ?? "—"}
                </strong>
              </span>
              <span className="text-zinc-600 dark:text-zinc-300">
                Avg AI confidence:{" "}
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {analytics.avgAiConfidencePercent != null
                    ? `${analytics.avgAiConfidencePercent}%`
                    : "—"}
                </strong>{" "}
                ({analytics.casesWithScores} cases)
              </span>
            </>
          )}
        </div>
        <UserAvatar />
      </div>
    </div>
  );
}
