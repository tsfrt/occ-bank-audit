/**
 * Map `parsed_content` VARIANT / JSON from main.tsfrt.bank_statement_analysis
 * into display + overlay-friendly elements.
 */

export type BboxPixels = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ParsedDisplayElement = {
  id: string;
  sourceId: number;
  type?: string;
  content: string;
  contentSnippet: string;
  description: string | null;
  pageId: number;
  bbox: BboxPixels | null;
};

function stripHtmlToSnippet(html: string, maxLen = 160): string {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
}

function coordToBbox(coord: unknown): BboxPixels | null {
  if (!Array.isArray(coord) || coord.length < 4) return null;
  const x1 = Number(coord[0]);
  const y1 = Number(coord[1]);
  const x2 = Number(coord[2]);
  const y2 = Number(coord[3]);
  if ([x1, y1, x2, y2].some((n) => Number.isNaN(n))) return null;
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  if (width <= 0 || height <= 0) return null;
  return { left, top, width, height };
}

function parseJsonIfString(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const s = value.trim();
  if (!s.startsWith("{") && !s.startsWith("[")) return value;
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return value;
  }
}

/**
 * Normalize `parsed_content` from warehouse (object, JSON string, or null).
 */
export function parseParsedContent(raw: unknown): ParsedDisplayElement[] {
  const root = parseJsonIfString(raw);
  if (!root || typeof root !== "object") return [];

  const doc = (root as { document?: unknown }).document;
  if (!doc || typeof doc !== "object") return [];

  const elements = (doc as { elements?: unknown }).elements;
  if (!Array.isArray(elements)) return [];

  const out: ParsedDisplayElement[] = [];

  for (const el of elements) {
    if (!el || typeof el !== "object") continue;
    const o = el as Record<string, unknown>;
    const idNum = typeof o.id === "number" ? o.id : Number(o.id);
    if (Number.isNaN(idNum)) continue;

    const bboxArr = o.bbox;
    let bbox: BboxPixels | null = null;
    let pageId = 0;
    if (Array.isArray(bboxArr) && bboxArr.length > 0) {
      const first = bboxArr[0];
      if (first && typeof first === "object") {
        const b = first as Record<string, unknown>;
        bbox = coordToBbox(b.coord);
        if (typeof b.page_id === "number") pageId = b.page_id;
        else if (typeof b.page_id === "string") pageId = Number(b.page_id) || 0;
      }
    }

    const content =
      typeof o.content === "string" ? o.content : String(o.content ?? "");
    const description =
      o.description === null || o.description === undefined
        ? null
        : String(o.description);
    const type = typeof o.type === "string" ? o.type : undefined;

    out.push({
      id: `el-${idNum}`,
      sourceId: idNum,
      type,
      content,
      contentSnippet: stripHtmlToSnippet(content),
      description,
      pageId,
      bbox,
    });
  }

  return out;
}

export type BankStatementDetails = {
  bank_name?: string;
  customer_name?: string;
  total_balance?: string;
};

export function parseDetailsStruct(raw: unknown): BankStatementDetails | null {
  const v = parseJsonIfString(raw);
  if (v == null) return null;
  if (typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  return {
    bank_name:
      o.bank_name != null ? String(o.bank_name) : undefined,
    customer_name:
      o.customer_name != null ? String(o.customer_name) : undefined,
    total_balance:
      o.total_balance != null ? String(o.total_balance) : undefined,
  };
}
