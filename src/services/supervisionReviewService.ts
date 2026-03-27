/**
 * Bank supervision review via Databricks serving (Knowledge Assistant / chat-style endpoint).
 * Uses OAuth client credentials — same token path as SQL Statement Execution.
 */

import {
  getDatabricksHost,
  getDatabricksOAuthAccessToken,
} from "@/lib/databricksWorkspace";

/**
 * Use workspace invocations URL (not /api/2.0/serving-endpoints/.../invocations).
 * Matches serving UI / docs: POST https://<workspace>/serving-endpoints/<name>/invocations
 */
function servingInvocationsUrl(host: string, endpointName: string): string {
  const base = host.replace(/\/$/, "");
  return `${base}/serving-endpoints/${encodeURIComponent(endpointName)}/invocations`;
}

function getEndpointName(): string {
  const name =
    process.env.BANK_SUPERVISION_AGENT_ENDPOINT?.trim() ||
    "ka-728916cd-endpoint";
  return name;
}

type ServingChoiceMessage = {
  message?: { role?: string; content?: string };
  delta?: { content?: string };
};

type ServingResponse = {
  choices?: ServingChoiceMessage[];
  predictions?: unknown;
  [key: string]: unknown;
};

function extractAssistantText(data: ServingResponse): string | null {
  const choices = data.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const first = choices[0];
  const content = first?.message?.content ?? first?.delta?.content;
  if (typeof content === "string" && content.trim()) return content;

  // Some endpoints nest output_text or return string predictions
  const raw = data as { output?: string; text?: string };
  if (typeof raw.output === "string" && raw.output.trim()) return raw.output;
  if (typeof raw.text === "string" && raw.text.trim()) return raw.text;

  return null;
}

export type SupervisionReviewResult = {
  feedback: string;
  raw?: unknown;
};

/**
 * Invoke the bank supervision agent with a single user message (full document context in content).
 */
export async function runBankSupervisionReview(
  userMessageContent: string
): Promise<SupervisionReviewResult> {
  const host = getDatabricksHost();
  const token = await getDatabricksOAuthAccessToken();
  const endpointName = getEndpointName();

  const url = servingInvocationsUrl(host, endpointName);

  const body = {
    messages: [{ role: "user" as const, content: userMessageContent }],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();
  let data: ServingResponse;
  try {
    data = JSON.parse(rawText) as ServingResponse;
  } catch {
    if (!res.ok) {
      throw new Error(
        `Supervision endpoint error (${res.status}): ${rawText.slice(0, 500)}`
      );
    }
    throw new Error("Supervision endpoint returned non-JSON body");
  }

  if (!res.ok) {
    const msg =
      typeof (data as { error?: string }).error === "string"
        ? (data as { error: string }).error
        : rawText.slice(0, 500);
    throw new Error(`Supervision endpoint request failed (${res.status}): ${msg}`);
  }

  const feedback = extractAssistantText(data);
  if (!feedback) {
    throw new Error(
      "Supervision endpoint returned no assistant message; check endpoint contract"
    );
  }

  return { feedback, raw: data };
}
