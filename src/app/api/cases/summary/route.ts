import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATUS_ORDER = [
  "pending_analysis",
  "pending_review",
  "manual_review",
  "reviewed",
] as const;

export async function GET() {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalCases,
      byStatus,
      createdLast7Days,
      createdLast30Days,
      analysesLast7Days,
      avgRiskAndConfidence,
    ] = await Promise.all([
      prisma.auditCase.count(),
      prisma.auditCase.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.auditCase.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.auditCase.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.caseAnalysis.count({
        where: { completedAt: { gte: sevenDaysAgo } },
      }),
      prisma.auditCase.aggregate({
        where: {
          riskScore: { not: null },
          aiConfidence: { not: null },
        },
        _avg: { riskScore: true, aiConfidence: true },
        _count: { id: true },
      }),
    ]);

    const statusCounts: Record<string, number> = {};
    STATUS_ORDER.forEach((s) => (statusCounts[s] = 0));
    byStatus.forEach((row) => {
      statusCounts[row.status] = row._count.id;
    });

    const casesWithScores = avgRiskAndConfidence._count.id;
    const avgRisk =
      casesWithScores && avgRiskAndConfidence._avg.riskScore != null
        ? Number(avgRiskAndConfidence._avg.riskScore).toFixed(2)
        : null;
    const avgConfidence =
      casesWithScores && avgRiskAndConfidence._avg.aiConfidence != null
        ? (Number(avgRiskAndConfidence._avg.aiConfidence) * 100).toFixed(0)
        : null;

    return NextResponse.json({
      total: totalCases,
      byStatus: statusCounts,
      trends: {
        casesCreatedLast7Days: createdLast7Days,
        casesCreatedLast30Days: createdLast30Days,
        analysesRunLast7Days: analysesLast7Days,
      },
      analytics: {
        avgRiskScore: avgRisk,
        avgAiConfidencePercent: avgConfidence,
        casesWithScores,
      },
    });
  } catch (e) {
    console.error("Cases summary error:", e);
    return NextResponse.json(
      {
        total: 0,
        byStatus: {},
        trends: {},
        analytics: {},
        error: "Failed to load summary",
      },
      { status: 500 }
    );
  }
}
