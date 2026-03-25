import { executeSql } from "@/lib/databricksSqlStatements";
import {
  getSqlWarehouseId,
} from "@/lib/databricksWorkspace";
import { resolveBankStatementFilePath } from "@/lib/bankStatementPaths";
import {
  parseDetailsStruct,
  parseParsedContent,
  type ParsedDisplayElement,
  type BankStatementDetails,
} from "@/lib/parseBankStatement";

export type BankStatementDocumentDTO = {
  filePath: string;
  fileName: string | null;
  fileSize: string | null;
  bankName: string | null;
  details: BankStatementDetails | null;
  summary: string | null;
  parsedElements: ParsedDisplayElement[];
};

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

/** Statement API column names may vary in casing. */
function rowGet(row: Record<string, unknown>, key: string): unknown {
  const found = Object.keys(row).find(
    (k) => k.toLowerCase() === key.toLowerCase()
  );
  return found ? row[found] : undefined;
}

function cellToString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "bigint" || typeof v === "boolean") {
    return String(v);
  }
  return null;
}

/**
 * Load bank statement rows from Unity Catalog for a bank name (matches audit_cases.bank_name).
 */
export async function fetchBankStatementDocuments(
  bankName: string
): Promise<BankStatementDocumentDTO[]> {
  const warehouseId = getSqlWarehouseId();
  const q = `
SELECT
  file_path,
  file_name,
  file_size,
  details,
  summary,
  bank_name,
  parsed_content
FROM main.tsfrt.bank_statement_analysis
WHERE bank_name = '${escapeSqlString(bankName)}'
`.trim();

  const rows = await executeSql(warehouseId, q);

  return rows.map((row) => {
    const filePathRaw = cellToString(rowGet(row, "file_path")) ?? "";
    const resolved = resolveBankStatementFilePath(filePathRaw);
    const fileSize = cellToString(rowGet(row, "file_size"));
    return {
      filePath: resolved,
      fileName: cellToString(rowGet(row, "file_name")),
      fileSize,
      bankName: cellToString(rowGet(row, "bank_name")),
      details: parseDetailsStruct(rowGet(row, "details")),
      summary: cellToString(rowGet(row, "summary")),
      parsedElements: parseParsedContent(rowGet(row, "parsed_content")),
    };
  });
}
