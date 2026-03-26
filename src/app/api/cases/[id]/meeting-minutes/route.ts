import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchMeetingMinutes } from "@/lib/meetingMinutesService";

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
      error: "Case has no bank name; cannot load meeting minutes.",
      meetings: [],
    });
  }

  try {
    const meetings = await fetchMeetingMinutes(bankName);
    return NextResponse.json({ meetings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Warehouse query failed";
    return NextResponse.json({ error: message, meetings: [] }, { status: 502 });
  }
}
