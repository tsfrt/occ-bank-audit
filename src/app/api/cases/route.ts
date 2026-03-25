import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isValidAuditType } from "@/lib/auditTypes";
import type { AuditType } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const sort = searchParams.get("sort") ?? "updatedAt";
  const order = searchParams.get("order") ?? "desc";

  const where = status
    ? {
        status:
          status as
            | "pending_analysis"
            | "pending_review"
            | "reviewed"
            | "manual_review",
      }
    : {};
  const orderBy: { createdAt?: "asc" | "desc"; updatedAt?: "asc" | "desc"; riskScore?: "asc" | "desc" } =
    sort === "createdAt"
      ? { createdAt: order as "asc" | "desc" }
      : sort === "riskScore"
        ? { riskScore: order as "asc" | "desc" }
        : { updatedAt: (order as "asc" | "desc") || "desc" };

  const cases = await prisma.auditCase.findMany({
    where,
    orderBy,
    include: {
      analyses: { orderBy: { completedAt: "desc" }, take: 1 },
      auditor: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(cases);
}

export async function POST(request: NextRequest) {
  let body: { bankId: string; bankName?: string; reference?: string; auditType?: string; auditorId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { bankId, bankName, reference, auditType, auditorId } = body;
  if (!bankId || typeof bankId !== "string") {
    return NextResponse.json(
      { error: "bankId is required" },
      { status: 400 }
    );
  }
  if (!auditorId || typeof auditorId !== "string") {
    return NextResponse.json(
      { error: "auditorId is required" },
      { status: 400 }
    );
  }
  if (auditType !== undefined && auditType !== null && auditType !== "" && !isValidAuditType(auditType)) {
    return NextResponse.json({ error: "Invalid audit type" }, { status: 400 });
  }

  const auditor = await prisma.auditor.findUnique({ where: { id: auditorId } });
  if (!auditor) {
    return NextResponse.json({ error: "Auditor not found" }, { status: 400 });
  }

  const auditCase = await prisma.auditCase.create({
    data: {
      bankId,
      bankName: bankName ?? null,
      reference: reference ?? null,
      auditType: auditType && isValidAuditType(auditType) ? (auditType as AuditType) : null,
      status: "pending_analysis",
      auditorId,
    },
  });

  return NextResponse.json(auditCase, { status: 201 });
}
