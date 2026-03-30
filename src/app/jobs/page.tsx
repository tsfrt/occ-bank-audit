"use client";

import { useEffect, useState, useCallback } from "react";

type JobParameter = {
  name: string;
  label: string;
  defaultValue: string;
  required: boolean;
};

type RunState = {
  life_cycle_state?: string;
  result_state?: string;
  state_message?: string;
};

type JobRun = {
  run_id: number;
  job_id: number;
  state?: RunState;
  start_time?: number;
  end_time?: number;
  execution_duration?: number;
  run_page_url?: string;
};

type PredefinedJob = {
  key: string;
  databricksJobId: number;
  displayName: string;
  description: string;
  parameters: JobParameter[];
  recentRuns: JobRun[];
};

type ActiveRun = {
  jobKey: string;
  runId: number;
  state?: RunState;
  startTime?: number;
  endTime?: number;
  executionDuration?: number;
  runPageUrl?: string;
};

const lifecycleColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  QUEUED: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  RUNNING: "bg-blue-100 text-blue-800 border border-blue-200",
  TERMINATING: "bg-blue-100 text-blue-800 border border-blue-200",
  TERMINATED: "bg-gray-100 text-gray-700 border border-gray-200",
  SKIPPED: "bg-gray-100 text-gray-500 border border-gray-200",
  INTERNAL_ERROR: "bg-red-100 text-red-800 border border-red-200",
};

const resultColors: Record<string, string> = {
  SUCCESS: "bg-green-100 text-green-800 border border-green-200",
  FAILED: "bg-red-100 text-red-800 border border-red-200",
  TIMEDOUT: "bg-orange-100 text-orange-800 border border-orange-200",
  CANCELED: "bg-gray-100 text-gray-500 border border-gray-200",
};

function RunStatusPill({ state }: { state?: RunState }) {
  if (!state) return <span className="text-muted-light text-xs">Unknown</span>;

  if (state.life_cycle_state === "TERMINATED" && state.result_state) {
    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${resultColors[state.result_state] ?? "bg-gray-100 text-gray-700 border border-gray-200"}`}
      >
        {state.result_state}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${lifecycleColors[state.life_cycle_state ?? ""] ?? "bg-gray-100 text-gray-700 border border-gray-200"}`}
    >
      {state.life_cycle_state ?? "UNKNOWN"}
    </span>
  );
}

function formatDuration(ms: number | undefined): string {
  if (ms == null || ms <= 0) return "—";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return remSec > 0 ? `${min}m ${remSec}s` : `${min}m`;
}

function formatTime(epoch: number | undefined): string {
  if (!epoch) return "—";
  return new Date(epoch).toLocaleString();
}

function isRunTerminal(state?: RunState): boolean {
  const lc = state?.life_cycle_state;
  return lc === "TERMINATED" || lc === "SKIPPED" || lc === "INTERNAL_ERROR";
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<PredefinedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, Record<string, string>>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [activeRuns, setActiveRuns] = useState<ActiveRun[]>([]);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs");
      if (!res.ok) throw new Error(`Failed to load jobs (${res.status})`);
      const data: PredefinedJob[] = await res.json();
      setJobs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Initialize param defaults when jobs load
  useEffect(() => {
    if (jobs.length === 0) return;
    setParamValues((prev) => {
      const next = { ...prev };
      for (const job of jobs) {
        if (!next[job.key]) {
          next[job.key] = {};
          for (const p of job.parameters) {
            next[job.key][p.name] = p.defaultValue;
          }
        }
      }
      return next;
    });
  }, [jobs]);

  // Poll active (non-terminal) runs
  useEffect(() => {
    const pending = activeRuns.filter((r) => !isRunTerminal(r.state));
    if (pending.length === 0) return;

    const interval = setInterval(async () => {
      const updates = await Promise.all(
        pending.map(async (r) => {
          try {
            const res = await fetch(`/api/jobs/runs/${r.runId}`);
            if (!res.ok) return r;
            const data = await res.json();
            return {
              ...r,
              state: data.state,
              startTime: data.start_time,
              endTime: data.end_time,
              executionDuration: data.execution_duration,
              runPageUrl: data.run_page_url,
            } as ActiveRun;
          } catch {
            return r;
          }
        })
      );

      setActiveRuns((prev) =>
        prev.map((r) => {
          const updated = updates.find((u) => u.runId === r.runId);
          return updated ?? r;
        })
      );

      const anyFinished = updates.some((u) => isRunTerminal(u.state));
      if (anyFinished) fetchJobs();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeRuns, fetchJobs]);

  function toggleExpand(key: string) {
    setExpandedJob((prev) => (prev === key ? null : key));
    setSubmitError(null);
  }

  function setParam(jobKey: string, paramName: string, value: string) {
    setParamValues((prev) => ({
      ...prev,
      [jobKey]: { ...prev[jobKey], [paramName]: value },
    }));
  }

  async function handleRun(jobKey: string) {
    setSubmitting(jobKey);
    setSubmitError(null);
    try {
      const res = await fetch("/api/jobs/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobKey, parameters: paramValues[jobKey] ?? {} }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? `Request failed (${res.status})`);
        return;
      }
      setActiveRuns((prev) => [
        ...prev,
        {
          jobKey,
          runId: data.runId,
          state: { life_cycle_state: "PENDING" },
          startTime: Date.now(),
        },
      ]);
      setExpandedJob(null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to trigger job");
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold text-foreground mb-6">Jobs</h2>
        <div className="rounded-lg border border-card-border bg-card-bg p-8 text-center text-muted shadow-sm">
          Loading jobs...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold text-foreground mb-6">Jobs</h2>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800 text-sm shadow-sm">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
      <h2 className="text-lg font-semibold text-foreground mb-6">Data Processing Jobs</h2>

      {/* Active runs banner */}
      {activeRuns.length > 0 && (
        <div className="mb-6 space-y-3">
          {activeRuns.map((run) => {
            const terminal = isRunTerminal(run.state);
            return (
              <div
                key={run.runId}
                className={`rounded-lg border p-4 flex items-center justify-between text-sm ${terminal ? "border-card-border bg-card-bg" : "border-blue-200 bg-blue-50"}`}
              >
                <div className="flex items-center gap-3">
                  {!terminal && (
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  )}
                  <span className="font-medium text-foreground">
                    Run #{run.runId}
                  </span>
                  <span className="text-muted">
                    {jobs.find((j) => j.key === run.jobKey)?.displayName ?? run.jobKey}
                  </span>
                  <RunStatusPill state={run.state} />
                </div>
                <div className="flex items-center gap-4 text-muted">
                  <span>{formatDuration(run.executionDuration)}</span>
                  {run.runPageUrl && (
                    <a
                      href={run.runPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:text-accent-hover hover:underline"
                    >
                      View in Databricks
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Job cards */}
      <div className="space-y-6">
        {jobs.map((job) => {
          const isExpanded = expandedJob === job.key;
          const isSubmitting = submitting === job.key;
          const hasActiveRun = activeRuns.some(
            (r) => r.jobKey === job.key && !isRunTerminal(r.state)
          );

          return (
            <div
              key={job.key}
              className="rounded-lg border border-card-border bg-card-bg shadow-sm"
            >
              {/* Job header */}
              <div className="p-5 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-foreground">
                    {job.displayName}
                  </h3>
                  <p className="text-sm text-muted mt-1">{job.description}</p>
                  {job.databricksJobId <= 0 && (
                    <p className="text-xs text-warning mt-2 font-medium">
                      Job ID not configured
                    </p>
                  )}
                </div>
                <button
                  onClick={() => toggleExpand(job.key)}
                  disabled={job.databricksJobId <= 0 || hasActiveRun}
                  className="rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {hasActiveRun ? "Running..." : isExpanded ? "Cancel" : "Run Job"}
                </button>
              </div>

              {/* Parameter form */}
              {isExpanded && (
                <div className="border-t border-card-border px-5 py-4 bg-section-bg">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    {job.parameters.map((param) => (
                      <div key={param.name}>
                        <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                          {param.label}
                          {param.required && <span className="text-error ml-0.5">*</span>}
                        </label>
                        <input
                          type="text"
                          value={paramValues[job.key]?.[param.name] ?? param.defaultValue}
                          onChange={(e) => setParam(job.key, param.name, e.target.value)}
                          className="w-full rounded-md border border-card-border bg-card-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
                          placeholder={param.defaultValue || param.label}
                        />
                      </div>
                    ))}
                  </div>

                  {submitError && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 mb-3">
                      {submitError}
                    </div>
                  )}

                  <button
                    onClick={() => handleRun(job.key)}
                    disabled={isSubmitting}
                    className="rounded-md bg-accent text-white px-5 py-2 text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting..." : "Start Run"}
                  </button>
                </div>
              )}

              {/* Recent runs */}
              {job.recentRuns.length > 0 && (
                <div className="border-t border-card-border">
                  <div className="px-5 py-3">
                    <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                      Recent Runs
                    </h4>
                    <div className="divide-y divide-card-border">
                      {job.recentRuns.map((run) => (
                        <div
                          key={run.run_id}
                          className="flex items-center justify-between py-2 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-muted font-mono text-xs">
                              #{run.run_id}
                            </span>
                            <RunStatusPill state={run.state} />
                          </div>
                          <div className="flex items-center gap-4 text-muted text-xs">
                            <span>{formatDuration(run.execution_duration)}</span>
                            <span>{formatTime(run.start_time)}</span>
                            {run.run_page_url && (
                              <a
                                href={run.run_page_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:text-accent-hover hover:underline"
                              >
                                View
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
