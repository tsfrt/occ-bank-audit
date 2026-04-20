import type { HandbookAuditDomain } from "@/generated/prisma";

export const HANDBOOK_DOMAINS: {
  value: HandbookAuditDomain;
  label: string;
  code: string;
}[] = [
  { value: "bsa_aml", label: "BSA/AML", code: "00-bsa-aml" },
  { value: "loan_portfolio_management", label: "Loan Portfolio Management", code: "01-loan-portfolio-management" },
  { value: "rating_credit_risk", label: "Rating Credit Risk", code: "02-rating-credit-risk" },
  { value: "allowances_credit_losses", label: "Allowances for Credit Losses", code: "03-allowances-credit-losses" },
  { value: "corporate_risk_governance", label: "Corporate & Risk Governance", code: "04-corporate-risk-governance" },
  { value: "internal_external_audits", label: "Internal & External Audits", code: "05-internal-external-audits" },
  { value: "liquidity", label: "Liquidity", code: "06-liquidity" },
  { value: "interest_rate_risk", label: "Interest Rate Risk", code: "07-interest-rate-risk" },
  { value: "capital_dividends", label: "Capital & Dividends", code: "08-capital-dividends" },
  { value: "commercial_real_estate", label: "Commercial Real Estate", code: "09-commercial-real-estate" },
  { value: "commercial_loans", label: "Commercial Loans", code: "10-commercial-loans" },
  { value: "residential_real_estate", label: "Residential Real Estate", code: "11-residential-real-estate" },
  { value: "concentrations_of_credit", label: "Concentrations of Credit", code: "12-concentrations-of-credit" },
  { value: "leveraged_lending", label: "Leveraged Lending", code: "13-leveraged-lending" },
  { value: "credit_card_lending", label: "Credit Card Lending", code: "14-credit-card-lending" },
];

export const HANDBOOK_DOMAIN_LABELS: Record<HandbookAuditDomain, string> =
  Object.fromEntries(HANDBOOK_DOMAINS.map((d) => [d.value, d.label])) as Record<
    HandbookAuditDomain,
    string
  >;

export const HANDBOOK_DOMAIN_CODES: Record<HandbookAuditDomain, string> =
  Object.fromEntries(HANDBOOK_DOMAINS.map((d) => [d.value, d.code])) as Record<
    HandbookAuditDomain,
    string
  >;

const validDomains = new Set<HandbookAuditDomain>(HANDBOOK_DOMAINS.map((d) => d.value));

export function isValidHandbookDomain(value: unknown): value is HandbookAuditDomain {
  return typeof value === "string" && validDomains.has(value as HandbookAuditDomain);
}
