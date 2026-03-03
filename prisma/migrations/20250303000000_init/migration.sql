-- CreateEnum
CREATE TYPE "AuditCaseStatus" AS ENUM ('pending_analysis', 'pending_review', 'reviewed', 'manual_review');

-- CreateEnum
CREATE TYPE "CaseReviewAction" AS ENUM ('reviewed', 'dig_deeper');

-- CreateTable
CREATE TABLE "audit_cases" (
    "id" TEXT NOT NULL,
    "bank_id" TEXT NOT NULL,
    "bank_name" TEXT,
    "reference" TEXT,
    "status" "AuditCaseStatus" NOT NULL DEFAULT 'pending_analysis',
    "risk_score" DOUBLE PRECISION,
    "ai_confidence" DOUBLE PRECISION,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_analyses" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "risk_score" DOUBLE PRECISION NOT NULL,
    "ai_confidence" DOUBLE PRECISION NOT NULL,
    "model_endpoint" TEXT,
    "raw_payload" JSONB,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_reviews" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "action" "CaseReviewAction" NOT NULL,
    "notes" TEXT,
    "reviewed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_cases_status_idx" ON "audit_cases"("status");

-- CreateIndex
CREATE INDEX "audit_cases_created_at_idx" ON "audit_cases"("created_at");

-- CreateIndex
CREATE INDEX "audit_cases_updated_at_idx" ON "audit_cases"("updated_at");

-- CreateIndex
CREATE INDEX "case_analyses_case_id_idx" ON "case_analyses"("case_id");

-- CreateIndex
CREATE INDEX "case_reviews_case_id_idx" ON "case_reviews"("case_id");

-- AddForeignKey
ALTER TABLE "case_analyses" ADD CONSTRAINT "case_analyses_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "audit_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_reviews" ADD CONSTRAINT "case_reviews_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "audit_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
