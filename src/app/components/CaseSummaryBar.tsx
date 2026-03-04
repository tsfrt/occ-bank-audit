"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

function MetricCard({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: "default" | "muted" | "emphasis";
}) {
  const accentStyles = {
    default:
      "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80",
    muted:
      "border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/50",
    emphasis:
      "border-zinc-300 dark:border-zinc-600 bg-zinc-100/90 dark:bg-zinc-700/50",
  };
  return (
    <div
      className={
        "rounded-lg border px-4 py-3 min-w-0 " + (accentStyles[accent ?? "default"])
      }
    >
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
      {sublabel && (
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {sublabel}
        </p>
      )}
    </div>
  );
}

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
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-800/50 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse flex flex-wrap gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-20 w-32 rounded-lg bg-zinc-200 dark:bg-zinc-700"
              />
            ))}
          </div>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Loading workload analytics…
          </p>
        </div>
      </div>
    );
  }

  if (!summary || summary.error) {
    return (
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-4">
        <div className="max-w-7xl mx-auto rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Summary unavailable. {summary?.error ?? "Could not load data."}
        </div>
      </div>
    );
  }

  const { total, byStatus, trends, analytics } = summary;
  const hasAnalytics =
    analytics.avgRiskScore != null || analytics.avgAiConfidencePercent != null;

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/95 px-4 py-4 shadow-sm">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            <Link
              href="/dashboard"
              className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline"
            >
              Workload analytics
            </Link>
          </h2>
        </div>

        {/* Primary metric + status breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <MetricCard
              label="Total cases"
              value={total}
              accent="emphasis"
            />
          </div>
          {(
            [
              "pending_analysis",
              "pending_review",
              "manual_review",
              "reviewed",
            ] as const
          ).map((status) => (
            <MetricCard
              key={status}
              label={statusLabels[status]}
              value={byStatus[status] ?? 0}
              accent="default"
            />
          ))}
        </div>

        {/* Trends row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MetricCard
            label="New cases (7d)"
            value={trends.casesCreatedLast7Days}
            sublabel="Last 7 days"
            accent="muted"
          />
          <MetricCard
            label="New cases (30d)"
            value={trends.casesCreatedLast30Days}
            sublabel="Last 30 days"
            accent="muted"
          />
          <MetricCard
            label="Analyses run (7d)"
            value={trends.analysesRunLast7Days}
            sublabel="Completed in last 7 days"
            accent="muted"
          />
        </div>

        {/* Analytics row (risk & AI confidence) */}
        {hasAnalytics && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <MetricCard
              label="Avg risk score"
              value={analytics.avgRiskScore ?? "—"}
              accent="default"
            />
            <MetricCard
              label="Avg AI confidence"
              value={
                analytics.avgAiConfidencePercent != null
                  ? `${analytics.avgAiConfidencePercent}%`
                  : "—"
              }
              accent="default"
            />
            <MetricCard
              label="Cases with scores"
              value={analytics.casesWithScores}
              sublabel="With risk & confidence data"
              accent="default"
            />
          </div>
        )}
      </div>
    </div>
  );
}
