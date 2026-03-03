import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
    },
  });

  return NextResponse.json(cases);
}

export async function POST(request: NextRequest) {
  let body: { bankId: string; bankName?: string; reference?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { bankId, bankName, reference } = body;
  if (!bankId || typeof bankId !== "string") {
    return NextResponse.json(
      { error: "bankId is required" },
      { status: 400 }
    );
  }

  const auditCase = await prisma.auditCase.create({
    data: {
      bankId,
      bankName: bankName ?? null,
      reference: reference ?? null,
      status: "pending_analysis",
    },
  });

  return NextResponse.json(auditCase, { status: 201 });
}
