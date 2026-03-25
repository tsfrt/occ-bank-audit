/**
 * Shared workspace URL + token for Databricks REST APIs (SQL statements, Files).
 */

export function getDatabricksHost(): string {
  const host = process.env.DATABRICKS_HOST?.trim() ?? "";
  if (!host) {
    throw new Error("DATABRICKS_HOST must be set");
  }
  return host.replace(/\/$/, "");
}

export function getDatabricksToken(): string {
  const token = process.env.DATABRICKS_TOKEN?.trim() ?? "";
  if (!token) {
    throw new Error("DATABRICKS_TOKEN must be set");
  }
  return token;
}

export function getSqlWarehouseId(): string {
  const id = process.env.DATABRICKS_SQL_WAREHOUSE_ID?.trim() ?? "";
  if (!id) {
    throw new Error("DATABRICKS_SQL_WAREHOUSE_ID must be set");
  }
  return id;
}

/**
 * Prefix every served file path must match (directory under the UC volume).
 * Override with BANK_STATEMENT_ALLOWLIST_PREFIX, or derive from BANK_STATEMENTS_VOLUME_BASE_PATH + /bank_statements/.
 */
export function getBankStatementAllowlistPrefix(): string {
  const explicit = process.env.BANK_STATEMENT_ALLOWLIST_PREFIX?.trim();
  if (explicit) {
    return explicit.endsWith("/") ? explicit.slice(0, -1) : explicit;
  }
  const base = process.env.BANK_STATEMENTS_VOLUME_BASE_PATH?.trim();
  if (base) {
    const b = base.replace(/\/$/, "");
    return `${b}/bank_statements`;
  }
  return "/Volumes/main/tsfrt/occ/bank_statements";
}
