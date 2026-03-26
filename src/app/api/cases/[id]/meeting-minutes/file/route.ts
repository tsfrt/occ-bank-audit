import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fromBase64Url } from "@/lib/base64url";
import { fetchMeetingMinutes } from "@/lib/meetingMinutesService";
import {
  isUnderMeetingMinutesAllowlist,
  normalizeVolumePath,
} from "@/lib/bankStatementPaths";
import { downloadVolumeFile } from "@/lib/databricksVolumeFiles";

export const dynamic = "force-dynamic";

function logFileProxy(event: string, details: Record<string, unknown>): void {
  console.error("[meeting-minutes/file]", event, JSON.stringify(details));
}

function contentTypeForPath(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  return "application/octet-stream";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params;
  const p = request.nextUrl.searchParams.get("p");
  if (!p) {
    logFileProxy("missing_p", { caseId });
    return NextResponse.json({ error: "Missing p" }, { status: 400 });
  }

  let decodedPath: string;
  try {
    decodedPath = fromBase64Url(p);
  } catch {
    logFileProxy("invalid_p", { caseId, pLength: p.length });
    return NextResponse.json({ error: "Invalid p" }, { status: 400 });
  }

  decodedPath = normalizeVolumePath(decodedPath);

  const auditCase = await prisma.auditCase.findUnique({
    where: { id: caseId },
    select: { bankName: true },
  });

  if (!auditCase?.bankName?.trim()) {
    logFileProxy("case_bank_missing", { caseId, decodedPath });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isUnderMeetingMinutesAllowlist(decodedPath)) {
    logFileProxy("forbidden_allowlist", {
      caseId,
      bankName: auditCase.bankName,
      decodedPath,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let allowed = false;
  try {
    const meetings = await fetchMeetingMinutes(auditCase.bankName.trim());
    allowed = meetings.some(
      (m) => normalizeVolumePath(m.filePath) === decodedPath
    );
    if (!allowed) {
      logFileProxy("warehouse_meetings_no_match", {
        caseId,
        bankName: auditCase.bankName,
        requestedPath: decodedPath,
        count: meetings.length,
        samplePaths: meetings.slice(0, 5).map((m) => m.filePath),
      });
    }
  } catch {
    logFileProxy("warehouse_meetings_error", {
      caseId,
      bankName: auditCase.bankName,
      requestedPath: decodedPath,
    });
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }

  if (!allowed) {
    logFileProxy("forbidden_not_in_case_meetings", {
      caseId,
      bankName: auditCase.bankName,
      decodedPath,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const buf = await downloadVolumeFile(decodedPath);
    const ct = contentTypeForPath(decodedPath);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": ct,
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=120",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Download failed";
    logFileProxy("download_error", { caseId, decodedPath, error: message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
