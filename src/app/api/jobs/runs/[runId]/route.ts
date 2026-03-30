import { NextRequest, NextResponse } from "next/server";
import { getJobRun } from "@/lib/databricksJobsApi";

type RouteParams = { params: Promise<{ runId: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { runId: raw } = await params;
  const runId = Number(raw);
  if (!Number.isFinite(runId) || runId <= 0) {
    return NextResponse.json({ error: "Invalid runId" }, { status: 400 });
  }

  try {
    const run = await getJobRun(runId);
    return NextResponse.json({
      run_id: run.run_id,
      job_id: run.job_id,
      state: run.state,
      start_time: run.start_time,
      end_time: run.end_time,
      execution_duration: run.execution_duration,
      run_page_url: run.run_page_url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to get run ${runId}:`, message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
