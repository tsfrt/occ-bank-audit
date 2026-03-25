import { getBankStatementAllowlistPrefix } from "@/lib/databricksWorkspace";

const DEFAULT_VOLUME_BASE = "/Volumes/main/tsfrt/occ";

/** Canonical form for comparing /Volumes/... paths (slashes, no trailing slash). */
export function normalizeVolumePath(filePath: string): string {
  let s = filePath.trim().replace(/\\/g, "/").replace(/\/+/g, "/");
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
