import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDatabricksOAuthAccessToken } from "@/lib/databricksWorkspace";
import { isValidHandbookDomain, HANDBOOK_DOMAIN_CODES } from "@/lib/handbookDomains";
import type { HandbookAuditDomain } from "@/generated/prisma";

const AUDIT_AGENT_URL =
  "https://e2-demo-field-eng.cloud.databricks.com/serving-endpoints/occ-audit-agent/invocations";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params;
  const domain = request.nextUrl.searchParams.get("domain");

  if (!domain || !isValidHandbookDomain(domain)) {
    return NextResponse.json({ messages: [] });
  }

  const messages = await prisma.handbookAuditMessage.findMany({
    where: { caseId, domain: domain as HandbookAuditDomain },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, domain: true, createdAt: true },
  });

  return NextResponse.json({ messages });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params;

  let body: { domain?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { domain, message } = body;

  if (!domain || !isValidHandbookDomain(domain)) {
    return NextResponse.json({ error: "Invalid or missing domain" }, { status: 400 });
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const auditCase = await prisma.auditCase.findUnique({ where: { id: caseId } });
  if (!auditCase) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const domainCode = HANDBOOK_DOMAIN_CODES[domain as HandbookAuditDomain];

  const userMsg = await prisma.handbookAuditMessage.create({
    data: {
      caseId,
      domain: domain as HandbookAuditDomain,
      role: "user",
      content: message.trim(),
    },
    select: { id: true, role: true, content: true, domain: true, createdAt: true },
  });

  let assistantContent: string;
  try {
    const token = await getDatabricksOAuthAccessToken();

    const payload = {
      input: [
        { role: "user", content: message.trim() },
      ],
      custom_inputs: {
        domain: domainCode,
      },
    };

    const res = await fetch(AUDIT_AGENT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Agent returned ${res.status}: ${text.slice(0, 500)}`);
    }

    const data = await res.json();

    if (typeof data === "object" && data !== null) {
      // ChatAgent / OpenAI-compatible response
      if (Array.isArray(data.choices) && data.choices[0]?.message?.content) {
        assistantContent = data.choices[0].message.content;
      } else if (typeof data.content === "string") {
        assistantContent = data.content;
      } else if (typeof data.output === "string") {
        assistantContent = data.output;
      // dataframe_records response: predictions array
      } else if (Array.isArray(data.predictions)) {
        const first = data.predictions[0];
        if (typeof first === "string") {
          assistantContent = first;
        } else if (typeof first === "object" && first !== null) {
          assistantContent =
            first.content ?? first.output ?? first.text ?? JSON.stringify(first, null, 2);
        } else {
          assistantContent = JSON.stringify(data.predictions, null, 2);
        }
      } else {
        assistantContent = JSON.stringify(data, null, 2);
      }
    } else {
      assistantContent = String(data);
    }
  } catch (err) {
    assistantContent = `Error communicating with audit agent: ${err instanceof Error ? err.message : String(err)}`;
  }

  const assistantMsg = await prisma.handbookAuditMessage.create({
    data: {
      caseId,
      domain: domain as HandbookAuditDomain,
      role: "assistant",
      content: assistantContent,
    },
    select: { id: true, role: true, content: true, domain: true, createdAt: true },
  });

  return NextResponse.json({ userMessage: userMsg, assistantMessage: assistantMsg });
}
