import Link from "next/link";
import { prisma } from "@/lib/db";
import { AUDIT_TYPE_LABELS } from "@/lib/auditTypes";

export const dynamic = "force-dynamic";

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

const casesQuery = () =>
  prisma.auditCase.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      analyses: { orderBy: { completedAt: "desc" }, take: 1 },
      auditor: { select: { id: true, name: true, email: true } },
    },
  });

export default async function DashboardPage() {
  let cases: Awaited<ReturnType<typeof casesQuery>> = [];
  try {
    cases = await casesQuery();
  } catch (e) {
    console.error("Failed to load cases:", e);
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-foreground">Audit cases</h2>
          <Link
            href="/cases/new"
            className="rounded-md bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm"
          >
            + New case
          </Link>
        </div>

        {cases.length === 0 ? (
          <div className="rounded-lg border border-card-border bg-card-bg p-8 text-center text-muted shadow-sm">
            No audit cases yet. Create one to get started.
          </div>
        ) : (
          <div className="rounded-lg border border-card-border bg-card-bg overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-section-bg border-b border-card-border">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Bank / Reference
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Auditor
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Audit type
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Risk score
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    AI confidence
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/cases/${c.id}`}
                        className="font-medium text-accent hover:text-accent-hover hover:underline"
                      >
                        {c.bankName || c.bankId}
                      </Link>
                      {c.reference && (
                        <span className="block text-xs text-muted">
                          {c.reference}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {c.auditor ? c.auditor.name : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {c.auditType ? AUDIT_TYPE_LABELS[c.auditType] : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[c.status] ?? "bg-gray-100 text-gray-700 border border-gray-200"}`}>
                        {statusLabels[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {c.riskScore != null ? (
                        <span className="font-medium">{Number(c.riskScore).toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-light">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {c.aiConfidence != null ? (
                        <span className="font-medium">{(Number(c.aiConfidence) * 100).toFixed(0)}%</span>
                      ) : (
                        <span className="text-muted-light">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">
                      {new Date(c.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/cases/${c.id}`}
                        className="text-sm font-medium text-accent hover:text-accent-hover hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </main>
  );
}
