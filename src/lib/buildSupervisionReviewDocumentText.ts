import type { BankStatementDocumentDTO } from "@/lib/bankStatementDocumentsService";

/**
 * Strip HTML to plain text (full length) for model input.
 * Mirrors parseBankStatement strip logic without truncation.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DEFAULT_MAX_CHARS = 120_000;

function maxChars(): number {
  const raw = process.env.BANK_SUPERVISION_REVIEW_MAX_CHARS?.trim();
  if (!raw) return DEFAULT_MAX_CHARS;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_MAX_CHARS;
}

/**
 * Assemble extracted warehouse fields into one document string for the supervision agent.
 */
export function buildSupervisionReviewDocumentText(
  doc: BankStatementDocumentDTO
): { text: string; truncated: boolean } {
  const lines: string[] = [];

  lines.push(`## File`);
  lines.push(`Path: ${doc.filePath}`);
  if (doc.fileName) lines.push(`Name: ${doc.fileName}`);

  if (doc.bankName) {
    lines.push("");
    lines.push(`## Warehouse bank_name`);
    lines.push(doc.bankName);
  }

  if (doc.details) {
    lines.push("");
    lines.push(`## Extracted details`);
    const d = doc.details;
    if (d.bank_name != null) lines.push(`Bank: ${d.bank_name}`);
    if (d.customer_name != null) lines.push(`Customer: ${d.customer_name}`);
    if (d.total_balance != null) lines.push(`Total balance: ${d.total_balance}`);
  }

  if (doc.summary?.trim()) {
    lines.push("");
    lines.push(`## Summary`);
    lines.push(doc.summary.trim());
  }

  if (doc.parsedElements.length > 0) {
    lines.push("");
    lines.push(`## Parsed elements`);
    for (const el of doc.parsedElements) {
      const header = `[#${el.sourceId}${el.type ? ` · ${el.type}` : ""} · page ${el.pageId}]`;
      const body = htmlToPlainText(el.content);
      lines.push("");
      lines.push(header);
      if (el.description) lines.push(`Description: ${el.description}`);
      lines.push(body);
    }
  }

  let text = lines.join("\n");
  const limit = maxChars();
  if (text.length > limit) {
    const notice = `\n\n[... truncated from ${text.length} to ${limit} characters ...]\n\n`;
    text = text.slice(0, limit - notice.length) + notice;
    return { text, truncated: true };
  }
  return { text, truncated: false };
}

const SUPERVISION_INSTRUCTIONS = `You are a bank supervision analyst assistant. Review the following extracted content from a bank statement document (parsed from OCR or a similar pipeline).

Assess the material from the perspective of bank supervision and regulatory examination: capital, liquidity, operational risk, consumer compliance, BSA/AML hints in the data if any, data quality, and anything an OCC-style review would care about. Be specific and reference what appears in the document. If information is insufficient for a topic, say so.

Respond in clear sections with actionable feedback. This is advisory analysis, not a binding legal determination.`;

/**
 * Full user message for the chat endpoint (instructions + document).
 */
export function buildSupervisionReviewUserMessage(doc: BankStatementDocumentDTO): {
  content: string;
  truncated: boolean;
} {
  const { text, truncated } = buildSupervisionReviewDocumentText(doc);
  const content = `${SUPERVISION_INSTRUCTIONS}\n\n---\n\n${text}`;
  return { content, truncated };
}
