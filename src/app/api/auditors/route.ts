import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const auditors = await prisma.auditor.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
    return NextResponse.json(auditors);
  } catch (e) {
    console.error("Auditors list error:", e);
    return NextResponse.json(
      { error: "Failed to load auditors" },
      { status: 500 }
    );
  }
}
