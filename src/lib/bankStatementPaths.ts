import { getBankStatementAllowlistPrefix } from "@/lib/databricksWorkspace";

const DEFAULT_VOLUME_BASE = "/Volumes/main/tsfrt/occ";

/**
 * Resolve DB file_path to an absolute /Volumes/... path.
 */
export function resolveBankStatementFilePath(filePath: string): string {
  const raw = filePath.trim();
  if (!raw) return raw;
  if (raw.startsWith("/Volumes/")) {
    return raw.replace(/\/+$/, "") || raw;
  }
  const base =
    process.env.BANK_STATEMENTS_VOLUME_BASE_PATH?.trim().replace(
      /\/+$/,
      ""
    ) ?? DEFAULT_VOLUME_BASE;
  const rel = raw.replace(/^\/+/, "");
  return `${base}/${rel}`.replace(/\/+/g, "/");
}

/**
 * True if resolved path is under the allowlisted directory (prefix match).
 */
export function isUnderBankStatementAllowlist(resolvedPath: string): boolean {
  const prefix = getBankStatementAllowlistPrefix();
  const p = resolvedPath.replace(/\/+$/, "") || resolvedPath;
  const pre = prefix.replace(/\/+$/, "");
  if (p === pre) return true;
  return p.startsWith(`${pre}/`);
}
