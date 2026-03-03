import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params;

  let body: { action: "reviewed" | "dig_deeper"; notes?: string; reviewedBy?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.action || !["reviewed", "dig_deeper"].includes(body.action)) {
    return NextResponse.json(
      { error: "action must be 'reviewed' or 'dig_deeper'" },
      { status: 400 }
    );
  }

  const auditCase = await prisma.auditCase.findUnique({ where: { id: caseId } });
  if (!auditCase) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const newStatus = body.action === "reviewed" ? "reviewed" : "manual_review";

  const [review, updated] = await prisma.$transaction([
    prisma.caseReview.create({
      data: {
        caseId,
        action: body.action,
        notes: body.notes ?? null,
        reviewedBy: body.reviewedBy ?? null,
      },
    }),
    prisma.auditCase.update({
      where: { id: caseId },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        reviewedBy: body.reviewedBy ?? undefined,
      },
    }),
  ]);

  return NextResponse.json({ case: updated, review }, { status: 201 });
}
