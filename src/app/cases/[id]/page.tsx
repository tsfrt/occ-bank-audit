import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AUDIT_TYPE_LABELS } from "@/lib/auditTypes";
import { CaseActions } from "./CaseActions";
import { DocumentReviewSection } from "./DocumentReviewSection";
import { ReassignAuditor } from "./ReassignAuditor";

const statusLabels: Record<string, string> = {
  pending_analysis: "Pending analysis",
  pending_review: "Pending review",
  reviewed: "Reviewed",
  manual_review: "Manual review",
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
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <Link
          href="/dashboard"
          className="text-sm text-zinc-500 dark:text-zinc-400 hover:underline"
        >
          ← Back to cases
        </Link>
        <h1 className="text-xl font-semibold mt-2">
          {auditCase.bankName || auditCase.bankId}
        </h1>
        {auditCase.reference && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {auditCase.reference}
          </p>
        )}
      </div>
        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
            Case details
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Assigned auditor</dt>
              <dd className="mt-0.5 font-medium">
                {auditCase.auditor ? (
                  <span>{auditCase.auditor.name} ({auditCase.auditor.email})</span>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <ReassignAuditor caseId={auditCase.id} currentAuditorId={auditCase.auditor?.id ?? ""} />
            </div>
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Status</dt>
              <dd className="mt-0.5">
                <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-200 dark:bg-zinc-700">
                  {statusLabels[auditCase.status] ?? auditCase.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Audit type</dt>
              <dd className="mt-0.5 font-medium">
                {auditCase.auditType
                  ? AUDIT_TYPE_LABELS[auditCase.auditType]
                  : <span className="text-zinc-400">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                Risk score
              </dt>
              <dd className="mt-0.5 font-medium">
                {auditCase.riskScore != null ? (
                  Number(auditCase.riskScore).toFixed(2)
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                AI confidence
              </dt>
              <dd className="mt-0.5 font-medium">
                {auditCase.aiConfidence != null ? (
                  `${(Number(auditCase.aiConfidence) * 100).toFixed(0)}%`
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                Last analysis
              </dt>
              <dd className="mt-0.5 text-sm">
                {latestAnalysis
                  ? new Date(latestAnalysis.completedAt).toLocaleString()
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
            Actions
          </h2>
          <CaseActions caseId={auditCase.id} status={auditCase.status} currentAuditType={auditCase.auditType} />
        </section>

        <DocumentReviewSection
          caseId={auditCase.id}
          bankName={auditCase.bankName}
          auditType={auditCase.auditType}
        />

        {auditCase.reviews.length > 0 && (
          <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
              Review history
            </h2>
            <ul className="space-y-2">
              {auditCase.reviews.map((r) => (
                <li
                  key={r.id}
                  className="flex justify-between text-sm py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                >
                  <span>
                    {r.action === "reviewed" ? "Marked reviewed" : "Manual review required"}
                    {r.reviewedBy && ` by ${r.reviewedBy}`}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
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
