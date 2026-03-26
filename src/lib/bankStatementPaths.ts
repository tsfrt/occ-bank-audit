import {
  getBankStatementAllowlistPrefix,
  getMeetingMinutesAllowlistPrefix,
} from "@/lib/databricksWorkspace";

const DEFAULT_VOLUME_BASE = "/Volumes/main/tsfrt/occ";

/** Canonical form for comparing /Volumes/... paths (slashes, no trailing slash). */
export function normalizeVolumePath(filePath: string): string {
  let s = filePath.trim().replace(/\\/g, "/");

  // Paths from notebooks / DB sometimes concatenate volume base with `dbfs:/Volumes/...`,
  // e.g. `/Volumes/.../occ/dbfs:/Volumes/.../bank_statements/file.jpg`. UC Files API expects
  // a single `/Volumes/catalog/schema/volume/...` path — keep the segment after `dbfs:`.
  const dbfsIdx = s.toLowerCase().indexOf("dbfs:");
  if (dbfsIdx !== -1) {
    s = s.slice(dbfsIdx + "dbfs:".length);
    s = s.replace(/^:+/, "");
  }

  s = s.replace(/\/+/g, "/");

  if (!s.startsWith("/")) {
    s = `/${s}`;
  }
  return s.replace(/\/+$/, "") || s;
}

/**
 * Resolve DB file_path to an absolute /Volumes/... path.
 */
export function resolveBankStatementFilePath(filePath: string): string {
  const raw = filePath.trim();
  if (!raw) return raw;
  if (raw.startsWith("/Volumes/")) {
    return normalizeVolumePath(raw);
  }
  const base =
    process.env.BANK_STATEMENTS_VOLUME_BASE_PATH?.trim().replace(
      /\/+$/,
      ""
    ) ?? DEFAULT_VOLUME_BASE;
  const rel = raw.replace(/^\/+/, "");
  return normalizeVolumePath(`${base}/${rel}`);
}

/**
 * True if resolved path is under the allowlisted directory (prefix match).
 */
export function isUnderBankStatementAllowlist(resolvedPath: string): boolean {
  const prefix = getBankStatementAllowlistPrefix();
  const p = normalizeVolumePath(resolvedPath);
  const pre = normalizeVolumePath(prefix);
  if (p === pre) return true;
  return p.startsWith(`${pre}/`);
}

const MEETING_MINUTES_DIR = "meeting_minutes";

function volumeBasePath(): string {
  return (
    process.env.BANK_STATEMENTS_VOLUME_BASE_PATH?.trim().replace(
      /\/+$/,
      ""
    ) ?? DEFAULT_VOLUME_BASE
  );
}

/**
 * Resolve meeting_analysis.file_name (or absolute /Volumes/... path) to UC Files path.
 * Relative names are resolved under {volume_base}/meeting_minutes/ using basename only.
 */
export function resolveMeetingMinuteFilePath(fileNameOrAbsolute: string): string {
  const raw = fileNameOrAbsolute.trim();
  if (!raw) return raw;
  if (raw.startsWith("/Volumes/")) {
    return normalizeVolumePath(raw);
  }
  const base = volumeBasePath();
  const safeName = raw.split(/[/\\]/).filter(Boolean).pop() ?? raw;
  return normalizeVolumePath(`${base}/${MEETING_MINUTES_DIR}/${safeName}`);
}

export function isUnderMeetingMinutesAllowlist(resolvedPath: string): boolean {
  const prefix = getMeetingMinutesAllowlistPrefix();
  const p = normalizeVolumePath(resolvedPath);
  const pre = normalizeVolumePath(prefix);
  if (p === pre) return true;
  return p.startsWith(`${pre}/`);
}
