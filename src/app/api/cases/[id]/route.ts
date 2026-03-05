import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidAuditType } from "@/lib/auditTypes";
import type { AuditType } from "@/generated/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auditCase = await prisma.auditCase.findUnique({
    where: { id },
    include: {
      analyses: { orderBy: { completedAt: "desc" } },
      reviews: { orderBy: { createdAt: "desc" } },
      auditor: { select: { id: true, name: true, email: true } },
    },
  });

  if (!auditCase) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(auditCase);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: {
    status?: "pending_analysis" | "pending_review" | "reviewed" | "manual_review";
    reviewedBy?: string;
    auditType?: string | null;
    auditorId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.auditCase.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: {
    status?: (typeof body)["status"];
    reviewedAt?: Date | null;
    reviewedBy?: string | null;
    auditType?: AuditType | null;
    auditorId?: string;
  } = {};

  if (body.status) data.status = body.status;
  if (body.reviewedBy != null) data.reviewedBy = body.reviewedBy;
  if (body.auditType !== undefined) {
    if (body.auditType === null || body.auditType === "") {
      data.auditType = null;
    } else if (!isValidAuditType(body.auditType)) {
      return NextResponse.json({ error: "Invalid audit type" }, { status: 400 });
    } else {
      data.auditType = body.auditType as AuditType;
    }
  }
  if (body.auditorId !== undefined) {
    if (!body.auditorId || typeof body.auditorId !== "string") {
      return NextResponse.json({ error: "auditorId must be a non-empty string" }, { status: 400 });
    }
    const auditor = await prisma.auditor.findUnique({ where: { id: body.auditorId } });
    if (!auditor) {
      return NextResponse.json({ error: "Auditor not found" }, { status: 400 });
    }
    data.auditorId = body.auditorId;
  }
  if (body.status === "reviewed" || body.status === "manual_review") {
    data.reviewedAt = new Date();
  }

  const updated = await prisma.auditCase.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}
