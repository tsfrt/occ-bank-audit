/**
 * Seed script: sample banks at different audit stages.
 * Run with: npx prisma db seed
 * Requires: LAKEBASE_DATABASE_URL or DATABASE_URL
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

const url =
  process.env.LAKEBASE_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
if (!url.trim() || (!url.startsWith("postgresql://") && !url.startsWith("postgres://"))) {
  throw new Error("LAKEBASE_DATABASE_URL or DATABASE_URL (postgresql://) required for seed");
}

const adapter = new PrismaPg({ connectionString: url.trim() });
const prisma = new PrismaClient({ adapter });

const SEED_REF_PREFIX = "SEED-";

async function main() {
  // Remove previous seed data so re-runs are idempotent
  const existing = await prisma.auditCase.findMany({
    where: { reference: { startsWith: SEED_REF_PREFIX } },
    select: { id: true },
  });
  if (existing.length > 0) {
    await prisma.auditCase.deleteMany({
      where: { id: { in: existing.map((c) => c.id) } },
    });
    console.log(`Removed ${existing.length} existing seed case(s).`);
  }

  // --- Pending analysis (no AI run yet) ---
  const pendingAnalysis = await Promise.all([
    prisma.auditCase.create({
      data: {
        bankId: "SEED-BANK-001",
        bankName: "First Regional Bank",
        reference: `${SEED_REF_PREFIX}pending-analysis-1`,
        status: "pending_analysis",
        auditType: "bank_statement_analysis",
      },
    }),
    prisma.auditCase.create({
      data: {
        bankId: "SEED-BANK-002",
        bankName: "Metro Credit Union",
        reference: `${SEED_REF_PREFIX}pending-analysis-2`,
        status: "pending_analysis",
        auditType: "meeting_minute_analysis",
      },
    }),
    prisma.auditCase.create({
      data: {
        bankId: "SEED-BANK-003",
        bankName: "Valley Savings & Loan",
        reference: `${SEED_REF_PREFIX}pending-analysis-3`,
        status: "pending_analysis",
        auditType: "financial_document_analysis",
      },
    }),
  ]);
  console.log(`Created ${pendingAnalysis.length} case(s) in pending_analysis.`);

  // --- Pending review (have risk/confidence, not yet reviewed) ---
  const pendingReview = await Promise.all([
    prisma.auditCase.create({
      data: {
        bankId: "SEED-BANK-004",
        bankName: "Northern Trust Co",
        reference: `${SEED_REF_PREFIX}pending-review-1`,
        status: "pending_review",
        auditType: "regulatory_compliance_review",
        riskScore: 0.35,
        aiConfidence: 0.88,
        analyses: {
          create: {
            auditType: "regulatory_compliance_review",
            riskScore: 0.35,
            aiConfidence: 0.88,
            modelEndpoint: "audit-analysis",
            rawPayload: { source: "seed" },
          },
        },
      },
    }),
    prisma.auditCase.create({
      data: {
        bankId: "SEED-BANK-005",
        bankName: "Pacific Commerce Bank",
        reference: `${SEED_REF_PREFIX}pending-review-2`,
        status: "pending_review",
        auditType: "loan_portfolio_analysis",
        riskScore: 0.72,
        aiConfidence: 0.91,
        analyses: {
          create: {
            auditType: "loan_portfolio_analysis",
            riskScore: 0.72,
            aiConfidence: 0.91,
            modelEndpoint: "audit-analysis",
            rawPayload: { source: "seed" },
          },
        },
      },
    }),
    prisma.auditCase.create({
      data: {
        bankId: "SEED-BANK-006",
        bankName: "Central Federal Bank",
        reference: `${SEED_REF_PREFIX}pending-review-3`,
        status: "pending_review",
        auditType: "transaction_monitoring",
        riskScore: 0.18,
        aiConfidence: 0.95,
        analyses: {
          create: {
            auditType: "transaction_monitoring",
            riskScore: 0.18,
            aiConfidence: 0.95,
            modelEndpoint: "audit-analysis",
            rawPayload: { source: "seed" },
          },
        },
      },
    }),
  ]);
  console.log(`Created ${pendingReview.length} case(s) in pending_review.`);

  // --- Reviewed ---
  const reviewed = await Promise.all([
    prisma.auditCase.create({
      data: {
        bankId: "SEED-BANK-007",
        bankName: "Heritage National Bank",
        reference: `${SEED_REF_PREFIX}reviewed-1`,
        status: "reviewed",
        auditType: "internal_control_review",
        riskScore: 0.22,
        aiConfidence: 0.92,
        reviewedAt: new Date(),
        reviewedBy: "analyst@example.com",
        analyses: {
          create: {
            auditType: "internal_control_review",
            riskScore: 0.22,
            aiConfidence: 0.92,
            modelEndpoint: "audit-analysis",
            rawPayload: { source: "seed" },
          },
        },
        reviews: {
          create: {
            action: "reviewed",
            reviewedBy: "analyst@example.com",
            notes: "No issues found.",
          },
        },
      },
    }),
    prisma.auditCase.create({
      data: {
        bankId: "SEED-BANK-008",
        bankName: "Summit Community Bank",
        reference: `${SEED_REF_PREFIX}reviewed-2`,
        status: "reviewed",
        auditType: "liquidity_risk_assessment",
        riskScore: 0.41,
        aiConfidence: 0.87,
        reviewedAt: new Date(),
        reviewedBy: "analyst@example.com",
        analyses: {
          create: {
            auditType: "liquidity_risk_assessment",
            riskScore: 0.41,
            aiConfidence: 0.87,
            modelEndpoint: "audit-analysis",
            rawPayload: { source: "seed" },
          },
        },
        reviews: {
          create: {
            action: "reviewed",
            reviewedBy: "analyst@example.com",
            notes: "Cleared after document review.",
          },
        },
      },
    }),
  ]);
  console.log(`Created ${reviewed.length} case(s) in reviewed.`);

  // --- Manual review required ---
  const manualReview = await Promise.all([
    prisma.auditCase.create({
      data: {
        bankId: "SEED-BANK-009",
        bankName: "Riverside Commercial Bank",
        reference: `${SEED_REF_PREFIX}manual-review-1`,
        status: "manual_review",
        auditType: "bank_statement_analysis",
        riskScore: 0.78,
        aiConfidence: 0.65,
        reviewedAt: new Date(),
        reviewedBy: "senior.analyst@example.com",
        analyses: {
          create: {
            auditType: "bank_statement_analysis",
            riskScore: 0.78,
            aiConfidence: 0.65,
            modelEndpoint: "audit-analysis",
            rawPayload: { source: "seed" },
          },
        },
        reviews: {
          create: {
            action: "dig_deeper",
            reviewedBy: "senior.analyst@example.com",
            notes: "High risk score; escalated for full manual audit.",
          },
        },
      },
    }),
    prisma.auditCase.create({
      data: {
        bankId: "SEED-BANK-010",
        bankName: "Gateway Financial Corp",
        reference: `${SEED_REF_PREFIX}manual-review-2`,
        status: "manual_review",
        auditType: "financial_document_analysis",
        riskScore: 0.85,
        aiConfidence: 0.71,
        reviewedAt: new Date(),
        reviewedBy: "senior.analyst@example.com",
        analyses: {
          create: {
            auditType: "financial_document_analysis",
            riskScore: 0.85,
            aiConfidence: 0.71,
            modelEndpoint: "audit-analysis",
            rawPayload: { source: "seed" },
          },
        },
        reviews: {
          create: {
            action: "dig_deeper",
            reviewedBy: "senior.analyst@example.com",
            notes: "Discrepancy in reported figures; manual review in progress.",
          },
        },
      },
    }),
  ]);
  console.log(`Created ${manualReview.length} case(s) in manual_review.`);

  console.log(
    `Seed complete: ${pendingAnalysis.length + pendingReview.length + reviewed.length + manualReview.length} audit cases (pending_analysis, pending_review, reviewed, manual_review).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
