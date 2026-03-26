import { executeSql } from "@/lib/databricksSqlStatements";
import { getSqlWarehouseId } from "@/lib/databricksWorkspace";
import {
  parseMeetingDetailsStruct,
  type MeetingMinuteDetails,
} from "@/lib/parseBankStatement";
import { resolveMeetingMinuteFilePath } from "@/lib/bankStatementPaths";

export type MeetingMinuteDTO = {
  filePath: string;
  fileName: string | null;
  bankName: string | null;
  summary: string | null;
  details: MeetingMinuteDetails | null;
};

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

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
 * Load meeting analysis rows for a bank name (matches audit_cases.bank_name).
 * Does not select transcription.
 */
export async function fetchMeetingMinutes(
  bankName: string
): Promise<MeetingMinuteDTO[]> {
  const warehouseId = getSqlWarehouseId();
  const q = `
SELECT
  file_name,
  summary,
  details,
  bank_name
FROM main.tsfrt.meeting_analysis
WHERE LOWER(TRIM(bank_name)) = LOWER(TRIM('${escapeSqlString(bankName.trim())}'))
`.trim();

  const rows = await executeSql(warehouseId, q);

  return rows
    .map((row) => {
      const fileName = cellToString(rowGet(row, "file_name"));
      const resolved = resolveMeetingMinuteFilePath(fileName?.trim() ?? "");
      return {
        filePath: resolved,
        fileName,
        bankName: cellToString(rowGet(row, "bank_name")),
        summary: cellToString(rowGet(row, "summary")),
        details: parseMeetingDetailsStruct(rowGet(row, "details")),
      };
    })
    .filter((m) => m.filePath.length > 0);
}
