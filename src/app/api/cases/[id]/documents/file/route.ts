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
    return NextResponse.json({ error: "Missing p" }, { status: 400 });
  }

  let decodedPath: string;
  try {
    decodedPath = fromBase64Url(p);
  } catch {
    return NextResponse.json({ error: "Invalid p" }, { status: 400 });
  }

  decodedPath = normalizeVolumePath(decodedPath);

  const auditCase = await prisma.auditCase.findUnique({
    where: { id: caseId },
    select: { bankName: true },
  });

  if (!auditCase?.bankName?.trim()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isUnderBankStatementAllowlist(decodedPath)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let allowed = false;
  try {
    const docs = await fetchBankStatementDocuments(auditCase.bankName.trim());
    allowed = docs.some(
      (d) => normalizeVolumePath(d.filePath) === decodedPath
    );
  } catch {
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }

  if (!allowed) {
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
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
