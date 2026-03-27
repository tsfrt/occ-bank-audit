import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AUDIT_TYPE_LABELS } from "@/lib/auditTypes";
import { DocumentReviewSection } from "./DocumentReviewSection";
import { MeetingMinutesSection } from "./MeetingMinutesSection";
import { ReassignAuditor } from "./ReassignAuditor";

const statusLabels: Record<string, string> = {
  pending_analysis: "Pending analysis",
  pending_review: "Pending review",
  reviewed: "Reviewed",
  manual_review: "Manual review",
};

const statusColors: Record<string, string> = {
  pending_analysis: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  pending_review: "bg-blue-100 text-blue-800 border border-blue-200",
  reviewed: "bg-green-100 text-green-800 border border-green-200",
  manual_review: "bg-orange-100 text-orange-800 border border-orange-200",
};

export const dynamic = "force-dynamic";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const auditCase = await prisma.auditCase.findUnique({
    where: { id },
    include: {
      analyses: { orderBy: { completedAt: "desc" } },
      reviews: { orderBy: { createdAt: "desc" } },
      auditor: { select: { id: true, name: true, email: true } },
    },
  });

  if (!auditCase) notFound();

  const latestAnalysis = auditCase.analyses[0];

  return (
    <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <div className="border-b border-card-border pb-4">
        <Link
          href="/dashboard"
          className="text-sm text-accent hover:text-accent-hover hover:underline"
        >
          ← Back to cases
        </Link>
        <h1 className="text-xl font-semibold mt-2 text-foreground">
          {auditCase.bankName || auditCase.bankId}
        </h1>
        {auditCase.reference && (
          <p className="text-sm text-muted mt-1">
            {auditCase.reference}
          </p>
        )}
      </div>
        <section className="rounded-lg border border-card-border bg-card-bg p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
            Case details
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-muted">Assigned auditor</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {auditCase.auditor ? (
                  <span>{auditCase.auditor.name} ({auditCase.auditor.email})</span>
                ) : (
                  <span className="text-muted-light">—</span>
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <ReassignAuditor caseId={auditCase.id} currentAuditorId={auditCase.auditor?.id ?? ""} />
            </div>
            <div>
              <dt className="text-xs text-muted">Status</dt>
              <dd className="mt-0.5">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[auditCase.status] ?? "bg-gray-100 text-gray-700 border border-gray-200"}`}>
                  {statusLabels[auditCase.status] ?? auditCase.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Audit type</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {auditCase.auditType
                  ? AUDIT_TYPE_LABELS[auditCase.auditType]
                  : <span className="text-muted-light">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">
                Risk score
              </dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {auditCase.riskScore != null ? (
                  Number(auditCase.riskScore).toFixed(2)
                ) : (
                  <span className="text-muted-light">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">
                AI confidence
              </dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {auditCase.aiConfidence != null ? (
                  `${(Number(auditCase.aiConfidence) * 100).toFixed(0)}%`
                ) : (
                  <span className="text-muted-light">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">
                Last analysis
              </dt>
              <dd className="mt-0.5 text-sm text-foreground">
                {latestAnalysis
                  ? new Date(latestAnalysis.completedAt).toLocaleString()
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>

        <DocumentReviewSection
          caseId={auditCase.id}
          bankName={auditCase.bankName}
          bankId={auditCase.bankId}
        />

        <MeetingMinutesSection
          caseId={auditCase.id}
          bankName={auditCase.bankName}
          bankId={auditCase.bankId}
        />

        {auditCase.reviews.length > 0 && (
          <section className="rounded-lg border border-card-border bg-card-bg p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
              Review history
            </h2>
            <ul className="space-y-2">
              {auditCase.reviews.map((r) => (
                <li
                  key={r.id}
                  className="flex justify-between text-sm py-2 border-b border-card-border last:border-0"
                >
                  <span className="text-foreground">
                    {r.action === "reviewed" ? "Marked reviewed" : "Manual review required"}
                    {r.reviewedBy && ` by ${r.reviewedBy}`}
                  </span>
                  <span className="text-muted">
                    {new Date(r.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
    </main>
  );
}
