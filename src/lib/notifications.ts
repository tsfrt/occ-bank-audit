import { prisma } from "@/lib/db";

type AuditCaseStatus =
  | "pending_analysis"
  | "pending_review"
  | "reviewed"
  | "manual_review";

export async function createCaseAssignedNotification(params: {
  caseId: string;
  caseReference: string | null;
  recipientId: string;
}) {
  const { caseId, caseReference, recipientId } = params;
  await prisma.notification.create({
    data: {
      recipientId,
      caseId,
      type: "case_assigned",
      title: "New case assigned",
      message: caseReference
        ? `You have been assigned to case ${caseReference}.`
        : `You have been assigned to a new audit case.`,
    },
  });
}

export async function createCaseStatusChangedNotification(params: {
  caseId: string;
  caseReference: string | null;
  recipientId: string;
  previousStatus: AuditCaseStatus | null;
  newStatus: AuditCaseStatus;
}) {
  const { caseId, caseReference, recipientId, previousStatus, newStatus } =
    params;
  const ref = caseReference ? ` (${caseReference})` : "";
  await prisma.notification.create({
    data: {
      recipientId,
      caseId,
      type: "case_status_changed",
      title: "Case status updated",
      message: `Case${ref} status changed from ${previousStatus ?? "—"} to ${newStatus}.`,
      previousStatus: previousStatus ?? null,
      newStatus,
    },
  });
}
