/**
 * Audit analysis via Databricks model serving endpoint.
 * Maps case context to request and response to riskScore + aiConfidenceScore.
 * https://docs.databricks.com/en/machine-learning/model-serving/score-custom-model-endpoints.html
 */

const INVOCATIONS_PATH = "/api/2.0/serving-endpoints";

export type AuditAnalysisInput = {
  caseId: string;
  bankId: string;
  bankName?: string | null;
  reference?: string | null;
};

export type AuditAnalysisResult = {
  riskScore: number;
  aiConfidence: number;
  rawPayload?: unknown;
};

/**
 * Call Databricks model serving endpoint and parse risk + confidence from response.
 * Adapter: if the endpoint returns different fields, map them here.
 */
export async function runAuditAnalysis(
  input: AuditAnalysisInput
): Promise<AuditAnalysisResult> {
  const host = process.env.DATABRICKS_HOST;
  const token = process.env.DATABRICKS_TOKEN;
  const endpointName = process.env.MODEL_SERVING_ENDPOINT_NAME;

  if (!host || !token || !endpointName) {
    throw new Error(
      "DATABRICKS_HOST, DATABRICKS_TOKEN, and MODEL_SERVING_ENDPOINT_NAME must be set"
    );
  }

  const url = `${host.replace(/\/$/, "")}${INVOCATIONS_PATH}/${endpointName}/invocations`;

  // Standard payload shape; adjust to match your trained model's input schema
  const body = {
    inputs: [[input.bankId, input.bankName ?? "", input.reference ?? ""]],
    // Alternative: dataframe_split format if the endpoint expects it
    // dataframe_split: { columns: ['bank_id', 'bank_name', 'reference'], data: [[input.bankId, input.bankName ?? '', input.reference ?? '']] },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Model serving request failed (${res.status}): ${text.slice(0, 500)}`
    );
  }

  const data = (await res.json()) as {
    predictions?: (number | [number, number])[];
    risk_score?: number;
    ai_confidence?: number;
    [key: string]: unknown;
  };

  // Adapter: extract risk and confidence from common response shapes
  let riskScore: number;
  let aiConfidence: number;

  if (
    typeof data.risk_score === "number" &&
    typeof data.ai_confidence === "number"
  ) {
    riskScore = data.risk_score;
    aiConfidence = data.ai_confidence;
  } else if (Array.isArray(data.predictions) && data.predictions[0] != null) {
    const first = data.predictions[0];
    if (Array.isArray(first) && first.length >= 2) {
      riskScore = Number(first[0]);
      aiConfidence = Number(first[1]);
    } else {
      riskScore = Number(first);
      aiConfidence = 0.5;
    }
  } else {
    // Fallback for unknown contract
    riskScore = 0;
    aiConfidence = 0.5;
  }

  return {
    riskScore,
    aiConfidence: Math.max(0, Math.min(1, aiConfidence)),
    rawPayload: data,
  };
}
