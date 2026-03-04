-- CreateEnum
CREATE TYPE "AuditType" AS ENUM (
  'meeting_minute_analysis',
  'bank_statement_analysis',
  'financial_document_analysis',
  'regulatory_compliance_review',
  'loan_portfolio_analysis',
  'transaction_monitoring',
  'internal_control_review',
  'liquidity_risk_assessment'
);

-- AlterTable audit_cases: add audit_type (nullable)
ALTER TABLE "audit_cases" ADD COLUMN "audit_type" "AuditType";

-- AlterTable case_analyses: add audit_type (nullable)
ALTER TABLE "case_analyses" ADD COLUMN "audit_type" "AuditType";
