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

export default async function HomePage() {
  let cases: Awaited<ReturnType<typeof prisma.auditCase.findMany>> = [];
  try {
    cases = await prisma.auditCase.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        analyses: { orderBy: { completedAt: "desc" }, take: 1 },
      },
    });
  } catch (e) {
    console.error("Failed to load cases:", e);
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium">Audit cases</h2>
          <Link
            href="/cases/new"
            className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            New case
          </Link>
        </div>

        {cases.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center text-zinc-500 dark:text-zinc-400">
            No audit cases yet. Create one to get started.
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-zinc-100 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Bank / Reference
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Audit type
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Risk score
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    AI confidence
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {cases.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/cases/${c.id}`}
                        className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
                      >
                        {c.bankName || c.bankId}
                      </Link>
                      {c.reference && (
                        <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                          {c.reference}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {c.auditType ? AUDIT_TYPE_LABELS[c.auditType] : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                        {statusLabels[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.riskScore != null ? (
                        <span>{Number(c.riskScore).toFixed(2)}</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.aiConfidence != null ? (
                        <span>{(Number(c.aiConfidence) * 100).toFixed(0)}%</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                      {new Date(c.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/cases/${c.id}`}
                        className="text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:underline"
                      >
                        View
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
