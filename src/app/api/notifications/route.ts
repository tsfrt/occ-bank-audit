import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ notifications: [] });
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

  const notifications = await prisma.notification.findMany({
    where: {
      recipientId: userId,
      ...(unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      case: {
        select: { id: true, reference: true, status: true, bankName: true },
      },
    },
  });

  const unreadCount = await prisma.notification.count({
    where: { recipientId: userId, read: false },
  });

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      previousStatus: n.previousStatus,
      newStatus: n.newStatus,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
      caseId: n.caseId,
      case: n.case,
    })),
    unreadCount,
  });
}
