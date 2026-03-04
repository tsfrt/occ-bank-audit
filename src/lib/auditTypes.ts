/**
 * Audit type categories. Each type can map to a dedicated model endpoint
 * via MODEL_SERVING_ENDPOINT_<KEY> or the default MODEL_SERVING_ENDPOINT_NAME.
 */

import type { AuditType } from "@/generated/prisma";

export const AUDIT_TYPES: {
  value: AuditType;
  label: string;
  /** Env key suffix for endpoint override, e.g. MEETING_MINUTE -> MODEL_SERVING_ENDPOINT_MEETING_MINUTE */
  endpointKey: string;
}[] = [
  { value: "meeting_minute_analysis", label: "Meeting minute analysis", endpointKey: "MEETING_MINUTE" },
  { value: "bank_statement_analysis", label: "Bank statement analysis", endpointKey: "BANK_STATEMENT" },
  { value: "financial_document_analysis", label: "Financial document analysis", endpointKey: "FINANCIAL_DOCUMENT" },
  { value: "regulatory_compliance_review", label: "Regulatory compliance review", endpointKey: "REGULATORY_COMPLIANCE" },
  { value: "loan_portfolio_analysis", label: "Loan portfolio analysis", endpointKey: "LOAN_PORTFOLIO" },
  { value: "transaction_monitoring", label: "Transaction monitoring", endpointKey: "TRANSACTION_MONITORING" },
  { value: "internal_control_review", label: "Internal control review", endpointKey: "INTERNAL_CONTROL" },
  { value: "liquidity_risk_assessment", label: "Liquidity risk assessment", endpointKey: "LIQUIDITY_RISK" },
];

const endpointKeyByType: Record<AuditType, string> = Object.fromEntries(
  AUDIT_TYPES.map((t) => [t.value, t.endpointKey])
) as Record<AuditType, string>;

export const AUDIT_TYPE_LABELS: Record<AuditType, string> = Object.fromEntries(
  AUDIT_TYPES.map((t) => [t.value, t.label])
) as Record<AuditType, string>;

const validAuditTypes = new Set<AuditType>(AUDIT_TYPES.map((t) => t.value));

export function isValidAuditType(value: unknown): value is AuditType {
  return typeof value === "string" && validAuditTypes.has(value as AuditType);
}

/**
 * Resolve model serving endpoint name for an audit type.
 * Uses MODEL_SERVING_ENDPOINT_<endpointKey> if set, else MODEL_SERVING_ENDPOINT_NAME.
 */
export function getEndpointNameForAuditType(auditType: AuditType | null | undefined): string {
  const defaultName = process.env.MODEL_SERVING_ENDPOINT_NAME ?? "audit-analysis";
  if (!auditType) return defaultName;
  const key = endpointKeyByType[auditType];
  const envKey = `MODEL_SERVING_ENDPOINT_${key}`;
  const override = process.env[envKey];
  return (override && typeof override === "string" ? override : defaultName) as string;
}
