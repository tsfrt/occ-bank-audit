import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runAuditAnalysis } from "@/services/auditAnalysisService";

const MODEL_ENDPOINT_NAME =
  process.env.MODEL_SERVING_ENDPOINT_NAME ?? "audit-analysis";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params;

  const auditCase = await prisma.auditCase.findUnique({
    where: { id: caseId },
  });

  if (!auditCase) {
    return NextResponse.json(
      { error: "Audit case not found" },
      { status: 404 }
    );
  }

  try {
    const result = await runAuditAnalysis({
      caseId: auditCase.id,
      bankId: auditCase.bankId,
      bankName: auditCase.bankName,
      reference: auditCase.reference,
    });

    await prisma.$transaction([
      prisma.caseAnalysis.create({
        data: {
          caseId: auditCase.id,
          riskScore: result.riskScore,
          aiConfidence: result.aiConfidence,
          modelEndpoint: MODEL_ENDPOINT_NAME,
          rawPayload: result.rawPayload ?? undefined,
        },
      }),
      prisma.auditCase.update({
        where: { id: caseId },
        data: {
          riskScore: result.riskScore,
          aiConfidence: result.aiConfidence,
          status: "pending_review",
          updatedAt: new Date(),
        },
      }),
    ]);

    const updated = await prisma.auditCase.findUnique({
      where: { id: caseId },
      include: { analyses: { orderBy: { completedAt: "desc" }, take: 1 } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
