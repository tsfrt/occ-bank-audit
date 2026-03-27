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

type OutputContentPart = { type?: string; text?: string };
type OutputMessage = {
  role?: string;
  content?: string | OutputContentPart[];
};

function extractAssistantText(data: ServingResponse): string | null {
  // OpenAI Chat Completions shape: choices[].message.content
  const choices = data.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0];
    const content = first?.message?.content ?? first?.delta?.content;
    if (typeof content === "string" && content.trim()) return content;
  }

  // Responses API / Agent Bricks shape:
  //   output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: "..." }] }]
  const output = (data as { output?: unknown }).output;
  if (Array.isArray(output)) {
    for (let i = output.length - 1; i >= 0; i--) {
      const msg = output[i] as OutputMessage | undefined;
      if (!msg || typeof msg !== "object") continue;

      // content is an array of parts (e.g. output_text)
      if (Array.isArray(msg.content)) {
        const texts = msg.content
          .filter(
            (p: OutputContentPart) =>
              typeof p.text === "string" && p.text.trim()
          )
          .map((p: OutputContentPart) => p.text!);
        if (texts.length > 0) return texts.join("\n\n");
      }

      // content is a plain string
      if (typeof msg.content === "string" && msg.content.trim()) {
        return msg.content;
      }
    }
  }
  if (typeof output === "string" && output.trim()) return output;

  // Top-level text field
  const raw = data as { text?: unknown };
  if (raw.text && typeof raw.text === "object") {
    const textObj = raw.text as { value?: string };
    if (typeof textObj.value === "string" && textObj.value.trim())
      return textObj.value;
  }
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

  // KA / some Agent Bricks endpoints expect `input`, not OpenAI-style `messages`.
  const body = {
    input: [{ role: "user" as const, content: userMessageContent }],
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
    const preview = JSON.stringify(data).slice(0, 800);
    console.error("[supervision-review] unrecognised response shape:", preview);
    throw new Error(
      `Supervision endpoint returned no assistant message. Response keys: [${Object.keys(data).join(", ")}]. Preview: ${preview}`
    );
  }

  return { feedback, raw: data };
}
