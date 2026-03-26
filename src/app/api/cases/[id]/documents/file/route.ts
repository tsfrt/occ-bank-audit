import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fromBase64Url } from "@/lib/base64url";
import { fetchBankStatementDocuments } from "@/lib/bankStatementDocumentsService";
import {
  isUnderBankStatementAllowlist,
  normalizeVolumePath,
} from "@/lib/bankStatementPaths";
import { downloadVolumeFile } from "@/lib/databricksVolumeFiles";

export const dynamic = "force-dynamic";

function logFileRoute(event: string, details: Record<string, unknown>): void {
  console.info("[documents/file]", event, details);
}

function contentTypeForPath(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".tif") || lower.endsWith(".tiff")) return "image/tiff";
  return "application/octet-stream";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params;
  const p = request.nextUrl.searchParams.get("p");
  if (!p) {
    logFileRoute("missing_p", { caseId });
    return NextResponse.json({ error: "Missing p" }, { status: 400 });
  }

  let decodedPath: string;
  try {
    decodedPath = fromBase64Url(p);
  } catch {
    logFileRoute("invalid_p", { caseId, pLength: p.length });
    return NextResponse.json({ error: "Invalid p" }, { status: 400 });
  }
  decodedPath = normalizeVolumePath(decodedPath);

  logFileRoute("request_start", {
    caseId,
    decodedPath,
  });

  const auditCase = await prisma.auditCase.findUnique({
    where: { id: caseId },
    select: { bankName: true },
  });

  if (!auditCase?.bankName?.trim()) {
    logFileRoute("case_bank_missing", { caseId, decodedPath });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowlisted = isUnderBankStatementAllowlist(decodedPath);
  if (!allowlisted) {
    logFileRoute("forbidden_allowlist", {
      caseId,
      bankName: auditCase.bankName,
      decodedPath,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let allowed = false;
  try {
    const docs = await fetchBankStatementDocuments(auditCase.bankName.trim());
    const matchingDoc = docs.find(
      (d) => normalizeVolumePath(d.filePath) === decodedPath
    );
    allowed = docs.some((d) => normalizeVolumePath(d.filePath) === decodedPath);
    logFileRoute("warehouse_docs_checked", {
      caseId,
      bankName: auditCase.bankName,
      requestedPath: decodedPath,
      docCount: docs.length,
      allowed,
      samplePaths: docs.slice(0, 3).map((d) => d.filePath),
      matchedPath: matchingDoc?.filePath ?? null,
    });
  } catch {
    logFileRoute("warehouse_docs_error", {
      caseId,
      bankName: auditCase.bankName,
      requestedPath: decodedPath,
    });
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }

  if (!allowed) {
    logFileRoute("forbidden_not_in_case_docs", {
      caseId,
      bankName: auditCase.bankName,
      decodedPath,
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const buf = await downloadVolumeFile(decodedPath);
    logFileRoute("download_success", {
      caseId,
      decodedPath,
      bytes: buf.length,
    });
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
    logFileRoute("download_error", {
      caseId,
      decodedPath,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
