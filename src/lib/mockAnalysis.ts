/**
 * Mock analysis feedback per audit type for display on the case detail screen.
 * Used when no real analysis has been run or to show sample feedback by audit type.
 */

import type { AuditType } from "@/generated/prisma";

export type MockAnalysisFeedback = {
  summary: string;
  findings: string[];
  recommendations: string[];
};

const MOCK_FEEDBACK: Record<AuditType, MockAnalysisFeedback> = {
  meeting_minute_analysis: {
    summary:
      "Review of board and committee meeting minutes indicates standard governance procedures are documented. No material gaps in record-keeping were noted; voting records and attendance are consistently captured.",
    findings: [
      "Minutes from Q3 credit committee meeting lack explicit approval language for two loan waivers.",
      "One executive session was not summarized per policy (confidentiality cited).",
      "Attendance records are complete for all reviewed meetings.",
    ],
    recommendations: [
      "Ensure all credit committee decisions include a formal motion and vote in the minutes.",
      "Document executive session topics at a high level where permitted by policy.",
      "Continue current practice of distributing draft minutes within 5 business days.",
    ],
  },
  bank_statement_analysis: {
    summary:
      "Statement review focused on balance trends, large items, and reconciliation markers. Overall activity appears consistent with prior periods; no unexplained spikes or missing reconciliation items were flagged.",
    findings: [
      "Three deposits over $50k lack memo-line or reference documentation in the sample reviewed.",
      "End-of-day balance variance on one statement date was within tolerance but above typical range.",
      "Recurring ACH debits align with authorized mandates on file.",
    ],
    recommendations: [
      "Obtain and retain supporting documentation for large deposits per AML procedures.",
      "Review reconciliation process for the statement date with higher variance.",
      "Confirm all standing orders are re-approved on the current review cycle.",
    ],
  },
  financial_document_analysis: {
    summary:
      "Financial documents submitted for the period were checked for consistency with reported figures, appropriate classification, and disclosure completeness. No material misstatements were identified in the sample.",
    findings: [
      "One footnote in the interim report references a subsequent event that could be expanded for clarity.",
      "Segment disclosure is consistent with prior year presentation.",
      "Related-party note is present and appears complete for the period.",
    ],
    recommendations: [
      "Consider adding a brief narrative for the subsequent event in the next filing.",
      "Maintain current segment and related-party disclosure practices.",
      "Schedule follow-up review after year-end close for full audit alignment.",
    ],
  },
  regulatory_compliance_review: {
    summary:
      "Compliance review against current regulatory expectations (e.g., BSA/AML, fair lending, consumer protection) did not identify critical deficiencies. Policies and procedures are dated and assigned; training records are on file.",
    findings: [
      "One policy (complaint handling) is due for annual review in the next quarter.",
      "Training completion rates meet the stated threshold for the period.",
      "No unresolved MRAs or MRIAs from recent exams in the scope reviewed.",
    ],
    recommendations: [
      "Complete and document the complaint-handling policy review before the due date.",
      "Continue tracking training completion by role and maintain evidence of delivery.",
      "Reconfirm exam finding remediation status with compliance before next exam cycle.",
    ],
  },
  loan_portfolio_analysis: {
    summary:
      "Portfolio-level review considered concentration, aging, and credit quality indicators. Allowance methodology and qualitative factors were noted; no systemic under-reserving was suggested by the mock analysis.",
    findings: [
      "Commercial real estate concentration remains above peer median; within policy limits.",
      "Watch list migration in the quarter was in line with expectations.",
      "One segment (agricultural) shows higher delinquency trend; already reflected in qualitative factors.",
    ],
    recommendations: [
      "Monitor CRE concentration and consider stress scenarios for the next ALCO cycle.",
      "Keep current watch list and migration reporting cadence.",
      "Document rationale for agricultural segment qualitative adjustment in the next allowance memo.",
    ],
  },
  transaction_monitoring: {
    summary:
      "Transaction monitoring review focused on alert volume, disposition consistency, and escalation paths. No evidence of systematic under-escalation; sample of closed alerts showed appropriate documentation.",
    findings: [
      "Alert volume increased in the period; capacity for timely review appears adequate.",
      "A sample of STR/non-STR decisions was consistent with written procedures.",
      "One alert was closed with a brief rationale; consider slightly more detail for similar cases.",
    ],
    recommendations: [
      "Continue monitoring alert backlog and adjust staffing if volume trend persists.",
      "Reinforce documentation standards for no-STR decisions in team training.",
      "Add a short checklist for alert closure to ensure consistent rationale capture.",
    ],
  },
  internal_control_review: {
    summary:
      "Internal control review considered design and operating effectiveness of key controls in scope. No significant control deficiencies were identified; a limited number of observations were noted for improvement.",
    findings: [
      "Segregation of duties in the wire process is appropriate; no exceptions in the sample.",
      "One control (approval of manual journal entries) had a single instance of late sign-off.",
      "Control owner assignments are documented and up to date for the processes reviewed.",
    ],
    recommendations: [
      "Remind control owners of the requirement for timely sign-off on manual entries.",
      "Consider adding a quarterly attestation for key financial controls.",
      "Retain current control matrix and update for any process changes.",
    ],
  },
  liquidity_risk_assessment: {
    summary:
      "Liquidity position and contingency funding were reviewed against policy limits and regulatory expectations. Stress scenarios indicate sufficient cushion under assumed outflows; no immediate liquidity concerns were flagged.",
    findings: [
      "LCR and NSFR positions are above minimum requirements as of the review date.",
      "Contingency funding plan is updated and includes clear escalation triggers.",
      "One assumed runoff rate in the stress scenario could be refreshed with recent data.",
    ],
    recommendations: [
      "Refresh stress assumptions (e.g., deposit runoff) with latest behavioral data.",
      "Confirm unencumbered collateral inventory is current for contingency funding.",
      "Schedule a tabletop exercise for the liquidity contingency plan in the next quarter.",
    ],
  },
};

/**
 * Returns mock analysis feedback for the given audit type.
 * Use when no real analysis exists or to show sample feedback on the case detail screen.
 */
export function getMockAnalysisFeedback(auditType: AuditType | null | undefined): MockAnalysisFeedback | null {
  if (!auditType || !(auditType in MOCK_FEEDBACK)) return null;
  return MOCK_FEEDBACK[auditType as AuditType];
}
