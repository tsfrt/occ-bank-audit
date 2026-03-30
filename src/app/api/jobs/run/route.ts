import { NextRequest, NextResponse } from "next/server";
import { getJobByKey } from "@/lib/jobDefinitions";
import { triggerJobRun } from "@/lib/databricksJobsApi";

export async function POST(request: NextRequest) {
  let body: { jobKey?: string; parameters?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { jobKey, parameters } = body;
  if (!jobKey || typeof jobKey !== "string") {
    return NextResponse.json({ error: "jobKey is required" }, { status: 400 });
  }

  const job = getJobByKey(jobKey);
  if (!job) {
    return NextResponse.json({ error: `Unknown job: ${jobKey}` }, { status: 404 });
  }
  if (job.databricksJobId <= 0) {
    return NextResponse.json(
      { error: `Job ${jobKey} does not have a valid Databricks Job ID configured` },
      { status: 422 }
    );
  }

  const missingRequired = job.parameters
    .filter((p) => p.required && !parameters?.[p.name])
    .map((p) => p.name);
  if (missingRequired.length > 0) {
    return NextResponse.json(
      { error: `Missing required parameters: ${missingRequired.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const { runId } = await triggerJobRun(job.databricksJobId, parameters ?? {});
    return NextResponse.json({ runId }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to trigger ${jobKey}:`, message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
