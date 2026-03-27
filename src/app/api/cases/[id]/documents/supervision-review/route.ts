import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchBankStatementDocuments } from "@/lib/bankStatementDocumentsService";
import { normalizeVolumePath } from "@/lib/bankStatementPaths";
import { buildSupervisionReviewUserMessage } from "@/lib/buildSupervisionReviewDocumentText";
import { runBankSupervisionReview } from "@/services/supervisionReviewService";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params;

  let body: { filePath?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const filePathRaw = body.filePath?.trim();
  if (!filePathRaw) {
    return NextResponse.json({ error: "filePath is required" }, { status: 400 });
  }

  const requestedPath = normalizeVolumePath(filePathRaw);

  const auditCase = await prisma.auditCase.findUnique({
    where: { id: caseId },
    select: { bankName: true },
  });

  if (!auditCase) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bankName = auditCase.bankName?.trim();
  if (!bankName) {
    return NextResponse.json(
      { error: "Case has no bank name; cannot load warehouse documents." },
      { status: 400 }
    );
  }

  let docs;
  try {
    docs = await fetchBankStatementDocuments(bankName);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Warehouse query failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const doc = docs.find(
    (d) => normalizeVolumePath(d.filePath) === requestedPath
  );

  if (!doc) {
    return NextResponse.json(
      { error: "Document not found for this case in the warehouse" },
      { status: 404 }
    );
  }

  const { content, truncated } = buildSupervisionReviewUserMessage(doc);

  try {
    const result = await runBankSupervisionReview(content);
    return NextResponse.json({
      feedback: result.feedback,
      truncated,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Supervision review failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
