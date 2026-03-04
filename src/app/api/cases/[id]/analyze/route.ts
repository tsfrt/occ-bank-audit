import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEndpointNameForAuditType, isValidAuditType } from "@/lib/auditTypes";
import { runAuditAnalysis } from "@/services/auditAnalysisService";
import type { AuditType } from "@/generated/prisma";

export async function POST(
  request: Request,
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

  let auditType: AuditType | null = auditCase.auditType;
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.auditType !== undefined) {
      if (!isValidAuditType(body.auditType)) {
        return NextResponse.json(
          { error: "Invalid audit type" },
          { status: 400 }
        );
      }
      auditType = body.auditType as AuditType;
    }
  } catch {
    // keep existing auditType from case
  }

  if (!auditType) {
    return NextResponse.json(
      { error: "Audit type is required. Select an audit type before running analysis." },
      { status: 400 }
    );
  }

  try {
    const result = await runAuditAnalysis({
      caseId: auditCase.id,
      bankId: auditCase.bankId,
      bankName: auditCase.bankName,
      reference: auditCase.reference,
      auditType: auditType ?? undefined,
    });

    const modelEndpoint = getEndpointNameForAuditType(auditType);

    await prisma.$transaction([
      prisma.caseAnalysis.create({
        data: {
          caseId: auditCase.id,
          auditType: auditType ?? undefined,
          riskScore: result.riskScore,
          aiConfidence: result.aiConfidence,
          modelEndpoint,
          rawPayload: result.rawPayload ?? undefined,
        },
      }),
      prisma.auditCase.update({
        where: { id: caseId },
        data: {
          auditType: auditType ?? undefined,
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
