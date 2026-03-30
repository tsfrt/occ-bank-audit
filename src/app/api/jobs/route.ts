import { NextResponse } from "next/server";
import { PREDEFINED_JOBS } from "@/lib/jobDefinitions";
import { listJobRuns, type JobRun } from "@/lib/databricksJobsApi";

export const dynamic = "force-dynamic";

type JobWithRuns = {
  key: string;
  databricksJobId: number;
  displayName: string;
  description: string;
  parameters: { name: string; label: string; defaultValue: string; required: boolean }[];
  recentRuns: JobRun[];
};

export async function GET() {
  const results: JobWithRuns[] = await Promise.all(
    PREDEFINED_JOBS.map(async (job) => {
      let recentRuns: JobRun[] = [];
      if (job.databricksJobId > 0) {
        try {
          recentRuns = await listJobRuns(job.databricksJobId, 5);
        } catch (err) {
          console.error(`Failed to fetch runs for ${job.key}:`, err);
        }
      }
      return { ...job, recentRuns };
    })
  );

  return NextResponse.json(results);
}
