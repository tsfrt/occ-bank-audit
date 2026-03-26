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
      "border-zinc-200/80 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-800/80 shadow-sm",
    muted:
      "border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50",
    emphasis:
      "border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-950/30 shadow-sm",
  };
  return (
    <div
      className={
        "rounded-xl border px-4 py-3 min-w-0 transition-colors " + (accentStyles[accent ?? "default"])
      }
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400 truncate">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
      {sublabel && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {sublabel}
        </p>
      )}
    </div>
  );
}

export function CaseSummaryBar() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(true);

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

  const toggleCollapsed = () => {
    setCollapsed((prev) => !prev);
  };

  if (loading) {
    return (
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-800/50 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Workload analytics
          </span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Loading…
          </span>
          <UserAvatar />
        </div>
      </div>
    );
  }

  if (!summary || summary.error) {
    return (
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            Summary unavailable. {summary?.error ?? "Could not load data."}
          </div>
          <UserAvatar />
        </div>
      </div>
    );
  }

  const { total, byStatus, trends, analytics } = summary;
  const hasAnalytics =
    analytics.avgRiskScore != null || analytics.avgAiConfidencePercent != null;

  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-900/95 px-4 py-2 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-4">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex w-full items-center justify-between gap-2 rounded-lg py-2 text-left hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 -mx-2 px-2 transition-colors"
            aria-expanded={!collapsed}
          >
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              <Link
                href="/dashboard"
                onClick={(e) => e.stopPropagation()}
                className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline"
              >
                Workload analytics
              </Link>
              {collapsed && (
                <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">
                  · {total} cases
                </span>
              )}
            </h2>
            <span
              className="shrink-0 text-zinc-500 dark:text-zinc-400 transition-transform"
              style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
              aria-hidden
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>

          {!collapsed && (
            <>
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
            </>
          )}
        </div>
        <UserAvatar />
      </div>
    </div>
  );
}
