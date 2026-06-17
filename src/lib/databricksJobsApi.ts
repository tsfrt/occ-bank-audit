import {
  getDatabricksHost,
  getDatabricksOAuthAccessToken,
} from "@/lib/databricksWorkspace";

async function authHeaders(): Promise<HeadersInit> {
  const accessToken = await getDatabricksOAuthAccessToken();
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

export type JobRunState = {
  life_cycle_state?: string;
  result_state?: string;
  state_message?: string;
};

export type JobRun = {
  run_id: number;
  job_id: number;
  run_name?: string;
  state?: JobRunState;
  start_time?: number;
  end_time?: number;
  setup_duration?: number;
  execution_duration?: number;
  cleanup_duration?: number;
  run_page_url?: string;
  job_parameters?: { name: string; value: string }[];
};

type RunNowResponse = {
  run_id?: number;
  number_in_job?: number;
  error?: string;
  message?: string;
};

type GetRunResponse = JobRun & {
  error?: string;
  message?: string;
};

type ListRunsResponse = {
  runs?: JobRun[];
  has_more?: boolean;
  error?: string;
  message?: string;
};

/**
 * Trigger an immediate run of a Databricks Job.
 * Uses Jobs API 2.1 run-now with job_parameters for parameterised jobs.
 */
export async function triggerJobRun(
  jobId: number,
  params: Record<string, string>
): Promise<{ runId: number }> {
  const host = getDatabricksHost();
  const res = await fetch(`${host}/api/2.1/jobs/run-now`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      job_id: jobId,
      job_parameters: params,
    }),
  });

  const payload = (await res.json()) as RunNowResponse;
  if (!res.ok || !payload.run_id) {
    const msg = payload.message ?? payload.error ?? JSON.stringify(payload);
    throw new Error(`Jobs run-now failed (${res.status}): ${msg}`);
  }
  return { runId: payload.run_id };
}

/**
 * Get status and metadata for a single job run.
 */
export async function getJobRun(runId: number): Promise<JobRun> {
  const host = getDatabricksHost();
  const res = await fetch(
    `${host}/api/2.1/jobs/get-run?run_id=${runId}`,
    { headers: await authHeaders() }
  );

  const payload = (await res.json()) as GetRunResponse;
  if (!res.ok) {
    const msg = payload.message ?? payload.error ?? JSON.stringify(payload);
    throw new Error(`Jobs get-run failed (${res.status}): ${msg}`);
  }
  return payload;
}

/**
 * List recent runs for a job, newest first.
 */
export async function listJobRuns(
  jobId: number,
  limit = 5
): Promise<JobRun[]> {
  const host = getDatabricksHost();
  const res = await fetch(
    `${host}/api/2.1/jobs/runs/list?job_id=${jobId}&limit=${limit}`,
    { headers: await authHeaders() }
  );

  const payload = (await res.json()) as ListRunsResponse;
  if (!res.ok) {
    const msg = payload.message ?? payload.error ?? JSON.stringify(payload);
    throw new Error(`Jobs runs/list failed (${res.status}): ${msg}`);
  }
  return payload.runs ?? [];
}
