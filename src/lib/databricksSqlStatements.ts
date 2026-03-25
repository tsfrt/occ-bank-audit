import {
  getDatabricksHost,
  getDatabricksOAuthAccessToken,
} from "@/lib/databricksWorkspace";

type StatementStatus = {
  state?: string;
  error?: { message?: string };
};

type ExecuteResponse = {
  statement_id?: string;
  status?: StatementStatus;
  manifest?: {
    schema?: {
      columns?: { name?: string }[];
    };
  };
  result?: {
    data_array?: unknown[][];
    chunk_index?: number;
    next_chunk_index?: number;
    next_chunk_internal_link?: string;
  };
};

async function authHeaders(): Promise<HeadersInit> {
  const accessToken = await getDatabricksOAuthAccessToken();
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function rowsFromPayload(payload: ExecuteResponse): Record<string, unknown>[] {
  const columns =
    payload.manifest?.schema?.columns?.map((c) => c.name ?? "") ?? [];
  const data = payload.result?.data_array ?? [];
  return data.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((name, i) => {
      if (name) obj[name] = row[i];
    });
    return obj;
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Run SQL on a warehouse; returns rows as objects keyed by column name.
 */
export async function executeSql(
  warehouseId: string,
  statement: string
): Promise<Record<string, unknown>[]> {
  const host = getDatabricksHost();
  const post = await fetch(`${host}/api/2.0/sql/statements`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      warehouse_id: warehouseId,
      statement,
      wait_timeout: "50s",
      disposition: "INLINE",
    }),
  });

  const initial = (await post.json()) as ExecuteResponse & { error?: string };
  if (!post.ok) {
    const msg =
      typeof initial.error === "string"
        ? initial.error
        : JSON.stringify(initial);
    throw new Error(`SQL statement submit failed (${post.status}): ${msg}`);
  }

  let payload = initial;
  const sid = payload.statement_id;
  if (!sid) {
    throw new Error("SQL statement response missing statement_id");
  }

  for (let i = 0; i < 120; i++) {
    const state = payload.status?.state;
    if (state === "SUCCEEDED") {
      const rows = rowsFromPayload(payload);
      // Fetch further chunks if present (same statement_id)
      let next = payload.result?.next_chunk_internal_link;
      while (next) {
        const chunkUrl = next.startsWith("http")
          ? next
          : `${host}${next.startsWith("/") ? "" : "/"}${next}`;
        const chunkRes = await fetch(chunkUrl, {
          headers: { Authorization: `Bearer ${await getDatabricksOAuthAccessToken()}` },
        });
        const chunk = (await chunkRes.json()) as ExecuteResponse;
        if (!chunkRes.ok) {
          throw new Error(
            `SQL chunk fetch failed (${chunkRes.status}): ${JSON.stringify(chunk)}`
          );
        }
        rows.push(...rowsFromPayload(chunk));
        next = chunk.result?.next_chunk_internal_link;
      }
      return rows;
    }
    if (state === "FAILED" || state === "CANCELED") {
      throw new Error(
        payload.status?.error?.message ?? `SQL statement ${state ?? "failed"}`
      );
    }
    await sleep(500);
    const poll = await fetch(`${host}/api/2.0/sql/statements/${sid}`, {
      headers: { Authorization: `Bearer ${await getDatabricksOAuthAccessToken()}` },
    });
    payload = (await poll.json()) as ExecuteResponse;
    if (!poll.ok) {
      throw new Error(
        `SQL poll failed (${poll.status}): ${JSON.stringify(payload)}`
      );
    }
  }

  throw new Error("SQL statement timed out waiting for SUCCEEDED");
}
