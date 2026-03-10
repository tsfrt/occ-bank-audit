import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const notification = await prisma.notification.findFirst({
    where: { id, recipientId: userId },
  });
  if (!notification) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { read?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: body.read ?? true },
  });

  return NextResponse.json(updated);
}
