/**
 * Shared workspace URL + token for Databricks REST APIs (SQL statements, Files).
 */

export function getDatabricksHost(): string {
  const raw = process.env.DATABRICKS_HOST?.trim() ?? "";
  if (!raw) {
    throw new Error("DATABRICKS_HOST must be set");
  }
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    return `${url.protocol}//${url.host}`.replace(/\/$/, "");
  } catch {
    throw new Error(
      "DATABRICKS_HOST must be a valid host or URL (e.g. https://<workspace>.cloud.databricks.com)"
    );
  }
}

export function getDatabricksToken(): string {
  const token = process.env.DATABRICKS_TOKEN?.trim() ?? "";
  if (!token) {
    throw new Error("DATABRICKS_TOKEN must be set");
  }
  return token;
}

export function getDatabricksClientId(): string {
  const clientId = process.env.DATABRICKS_CLIENT_ID?.trim() ?? "";
  if (!clientId) {
    throw new Error("DATABRICKS_CLIENT_ID must be set");
  }
  return clientId;
}

export function getDatabricksClientSecret(): string {
  const clientSecret = process.env.DATABRICKS_CLIENT_SECRET?.trim() ?? "";
  if (!clientSecret) {
    throw new Error("DATABRICKS_CLIENT_SECRET must be set");
  }
  return clientSecret;
}

type OAuthTokenResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
};

let cachedOAuthToken: { token: string; expiresAtMs: number } | null = null;
let inFlightOAuthTokenPromise: Promise<string> | null = null;

/**
 * Gets a Databricks OAuth access token via client_credentials grant.
 * Used by SQL Statement Execution API auth.
 */
export async function getDatabricksOAuthAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedOAuthToken && now < cachedOAuthToken.expiresAtMs - 60_000) {
    return cachedOAuthToken.token;
  }

  if (inFlightOAuthTokenPromise) {
    return inFlightOAuthTokenPromise;
  }

  inFlightOAuthTokenPromise = (async () => {
    const host = getDatabricksHost();
    const clientId = getDatabricksClientId();
    const clientSecret = getDatabricksClientSecret();

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      scope: "all-apis",
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(`${host}/oidc/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
    });

    const payload = (await response.json()) as OAuthTokenResponse & {
      error?: string;
      error_description?: string;
    };

    if (!response.ok || !payload.access_token) {
      const errorMessage =
        payload.error_description ??
        payload.error ??
        JSON.stringify(payload) ??
        `HTTP ${response.status}`;
      throw new Error(`Failed to get Databricks OAuth token: ${errorMessage}`);
    }

    const expiresInSec = Math.max(60, payload.expires_in ?? 3600);
    cachedOAuthToken = {
      token: payload.access_token,
      expiresAtMs: now + expiresInSec * 1000,
    };
    return payload.access_token;
  })();

  try {
    return await inFlightOAuthTokenPromise;
  } finally {
    inFlightOAuthTokenPromise = null;
  }
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

/**
 * Prefix every served meeting-minute audio path must match.
 * Override with MEETING_MINUTES_ALLOWLIST_PREFIX, or derive from BANK_STATEMENTS_VOLUME_BASE_PATH + /meeting_minutes/.
 */
export function getMeetingMinutesAllowlistPrefix(): string {
  const explicit = process.env.MEETING_MINUTES_ALLOWLIST_PREFIX?.trim();
  if (explicit) {
    return explicit.endsWith("/") ? explicit.slice(0, -1) : explicit;
  }
  const base = process.env.BANK_STATEMENTS_VOLUME_BASE_PATH?.trim();
  if (base) {
    const b = base.replace(/\/$/, "");
    return `${b}/meeting_minutes`;
  }
  return "/Volumes/main/tsfrt/occ/meeting_minutes";
}
