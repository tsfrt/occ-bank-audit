import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchBankStatementDocuments } from "@/lib/bankStatementDocumentsService";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params;

  const auditCase = await prisma.auditCase.findUnique({
    where: { id: caseId },
    select: { bankName: true },
  });

  if (!auditCase) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bankName = auditCase.bankName?.trim();
  if (!bankName) {
    return NextResponse.json({
      error: "Case has no bank name; cannot load warehouse documents.",
      documents: [],
    });
  }

  try {
    const documents = await fetchBankStatementDocuments(bankName);
    return NextResponse.json({ documents });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Warehouse query failed";
    return NextResponse.json({ error: message, documents: [] }, { status: 502 });
  }
}
